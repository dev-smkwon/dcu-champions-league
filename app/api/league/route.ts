import { NextResponse } from "next/server";

export const maxDuration = 300;

const API = "https://open.api.nexon.com/fconline/v1";
const NICKNAMES = ["씅민쓰", "6년제", "따이민", "그냥강혜중", "대가대다님", "박수환", "빅수환", "6w91oap5jy"];
const START = new Date("2026-07-01T00:00:00+09:00");

type MatchInfo = {
  ouid: string;
  nickname: string;
  matchDetail: { matchResult: string; possession: number; foul: number; yellowCards: number; redCards: number; dribble: number };
  shoot: { goalTotal: number; shootOutScore: number; shootTotal: number; effectiveShootTotal: number };
  pass: { passTry: number; passSuccess: number };
  shootDetail: Array<{ spId: number; goalTime: number; x: number; y: number; result: number; type: number; inPenalty: boolean }>;
  player: Array<{ spId: number; spPosition: number; spGrade: number; status: { shoot: number; effectiveShoot: number; assist: number; goal: number; passTry: number; passSuccess: number; tackle: number; intercept: number; block: number; defending: number; aerialSuccess: number; dribbleTry: number; dribbleSuccess: number; yellowCards: number; redCards: number; spRating: number } }>;
};

type Match = { matchId: string; matchDate: string; matchType: number; matchInfo: MatchInfo[] };

async function nexon<T>(path: string, key: string, revalidate: number | false = 7200): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(`${API}${path}`, {
      headers: { "x-nxopen-api-key": key },
      ...(revalidate === false ? { cache: "force-cache" as const } : { next: { revalidate } }),
    });
    if (response.ok) return response.json() as Promise<T>;
    if (response.status !== 429 && response.status < 500) throw new Error(`NEXON API ${response.status}`);
    await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
  }
  throw new Error("NEXON API 요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.");
}

function table(matches: Match[], includeShootout: boolean) {
  const rows = new Map(NICKNAMES.map((name) => [name, { name, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, form: [] as string[] }]));
  for (const match of matches) {
    const [a, b] = match.matchInfo;
    const ag = Number(a.shoot.goalTotal || 0) + (includeShootout ? Number(a.shoot.shootOutScore || 0) : 0);
    const bg = Number(b.shoot.goalTotal || 0) + (includeShootout ? Number(b.shoot.shootOutScore || 0) : 0);
    const ar = rows.get(a.nickname)!; const br = rows.get(b.nickname)!;
    ar.p++; br.p++; ar.gf += ag; ar.ga += bg; br.gf += bg; br.ga += ag;
    if (ag > bg) { ar.w++; br.l++; ar.form.push("W"); br.form.push("L"); }
    else if (ag < bg) { br.w++; ar.l++; br.form.push("W"); ar.form.push("L"); }
    else { ar.d++; br.d++; ar.form.push("D"); br.form.push("D"); }
  }
  return [...rows.values()].map((r) => ({ ...r, gd: r.gf - r.ga, pts: r.w * 3 + r.d, form: r.form.slice(0, 5) }))
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
    .map((r, index) => ({ ...r, rank: index + 1 }));
}

function analytics(matches: Match[], names: Map<number, string>) {
  const shotTypeNames: Record<number, string> = { 1: "일반 슛", 2: "감아차기", 3: "헤더", 4: "로빙 슛", 5: "발리 슛", 6: "프리킥", 7: "페널티킥", 8: "파워 슛" };
  const result = Object.fromEntries(NICKNAMES.map((name) => [name, { matches: 0, shots: 0, onTarget: 0, goals: 0, passTry: 0, passSuccess: 0, possession: 0, routes: [0, 0, 0], goalBuckets: [0, 0, 0, 0, 0, 0], shotMap: [] as Array<{ x: number; y: number; goal: boolean }>, goalBreakdown: { types: {} as Record<string, { attempts: number; goals: number }>, locations: { inside: { attempts: 0, goals: 0 }, outside: { attempts: 0, goals: 0 } } }, squad: {} as Record<string, any> }]));
  for (const match of matches) for (const info of match.matchInfo) {
    const row = result[info.nickname];
    row.matches++; row.shots += info.shoot.shootTotal || 0; row.onTarget += info.shoot.effectiveShootTotal || 0;
    row.goals += info.shoot.goalTotal || 0; row.passTry += info.pass.passTry || 0; row.passSuccess += info.pass.passSuccess || 0; row.possession += info.matchDetail.possession || 0;
    for (const shot of info.shootDetail || []) {
      const y = Math.max(0, Math.min(1, Number(shot.y || 0)));
      const goal = Number(shot.result) === 3;
      const typeName = shotTypeNames[Number(shot.type)] || "기타 슛";
      const typeRow = row.goalBreakdown.types[typeName] ||= { attempts: 0, goals: 0 };
      const locationRow = shot.inPenalty ? row.goalBreakdown.locations.inside : row.goalBreakdown.locations.outside;
      typeRow.attempts++; locationRow.attempts++;
      if (goal) { typeRow.goals++; locationRow.goals++; }
      row.routes[y < .33 ? 0 : y < .66 ? 1 : 2]++;
      row.shotMap.push({ x: Math.max(0, Math.min(1, Number(shot.x || 0))), y, goal });
      if (goal) {
        const raw = Number(shot.goalTime || 0); const period = Math.floor(raw / 2 ** 24);
        const seconds = raw - period * 2 ** 24 + [0, 45, 90, 105, 120][Math.min(period, 4)] * 60;
        row.goalBuckets[Math.min(5, Math.floor(seconds / 900))]++;
      }
    }
    for (const player of info.player || []) {
      if (player.spPosition === 28 || player.status.spRating <= 0) continue;
      const key = `${player.spId}-${player.spGrade}`;
      const item = row.squad[key] ||= { spId: player.spId, name: names.get(player.spId) || `선수 ${player.spId}`, position: player.spPosition, grade: player.spGrade, appearances: 0, goals: 0, assists: 0, shots: 0, passTry: 0, passSuccess: 0, tackles: 0, interceptions: 0, ratingTotal: 0 };
      item.appearances++; item.goals += player.status.goal || 0; item.assists += player.status.assist || 0; item.shots += player.status.shoot || 0; item.passTry += player.status.passTry || 0; item.passSuccess += player.status.passSuccess || 0; item.tackles += player.status.tackle || 0; item.interceptions += player.status.intercept || 0; item.ratingTotal += player.status.spRating || 0;
    }
  }
  Object.values(result).forEach((row: any) => { row.squad = Object.values(row.squad).map((item: any) => ({ ...item, rating: Math.round(item.ratingTotal / Math.max(1, item.appearances) * 100) / 100 })).sort((a: any, b: any) => b.appearances - a.appearances || b.rating - a.rating); });
  return result;
}

function bestEleven(matches: Match[], names: Map<number, string>, minimumAppearances: number) {
  const candidates = new Map<string, any>();
  for (const match of matches) for (const info of match.matchInfo) for (const player of info.player || []) {
    if (player.spPosition === 28 || player.status.spRating <= 0) continue;
    const key = `${info.nickname}-${player.spId}-${player.spGrade}`;
    const item = candidates.get(key) || { owner: info.nickname, spId: player.spId, name: names.get(player.spId) || `선수 ${player.spId}`, position: player.spPosition, grade: player.spGrade, appearances: 0, goals: 0, assists: 0, shots: 0, effectiveShots: 0, passTry: 0, passSuccess: 0, tackles: 0, interceptions: 0, blocks: 0, defending: 0, aerials: 0, dribbleTry: 0, dribbleSuccess: 0, yellowCards: 0, redCards: 0, ratingTotal: 0 };
    item.appearances++; item.goals += player.status.goal || 0; item.assists += player.status.assist || 0; item.shots += player.status.shoot || 0; item.effectiveShots += player.status.effectiveShoot || 0; item.passTry += player.status.passTry || 0; item.passSuccess += player.status.passSuccess || 0; item.tackles += player.status.tackle || 0; item.interceptions += player.status.intercept || 0; item.blocks += player.status.block || 0; item.defending += player.status.defending || 0; item.aerials += player.status.aerialSuccess || 0; item.dribbleTry += player.status.dribbleTry || 0; item.dribbleSuccess += player.status.dribbleSuccess || 0; item.yellowCards += player.status.yellowCards || 0; item.redCards += player.status.redCards || 0; item.ratingTotal += player.status.spRating || 0; candidates.set(key, item);
  }
  const all = [...candidates.values()].map((x) => {
    const rating = x.ratingTotal / x.appearances;
    const goalsPerGame = x.goals / x.appearances;
    const assistsPerGame = x.assists / x.appearances;
    const goalConversion = x.goals / Math.max(1, x.shots);
    const effectiveShotRate = x.effectiveShots / Math.max(1, x.shots);
    const defensiveActionsPerGame = (x.tackles + x.interceptions + x.blocks + x.defending) / x.appearances;
    const aerialsPerGame = x.aerials / x.appearances;
    const passAccuracy = x.passSuccess / Math.max(1, x.passTry);
    const reliability = .9 + Math.min(x.appearances, 10) * .01;
    const rawScore = x.position === 0
      ? rating * .75 + defensiveActionsPerGame * .25 + aerialsPerGame * .08 + passAccuracy * .15
      : x.position <= 8
        ? rating * .65 + goalsPerGame * .5 + assistsPerGame * .6 + goalConversion * .25 + effectiveShotRate * .2 + defensiveActionsPerGame * .2 + aerialsPerGame * .08 + passAccuracy * .15
        : x.position <= 19
          ? rating * .6 + goalsPerGame + assistsPerGame + goalConversion * .55 + effectiveShotRate * .25 + defensiveActionsPerGame * .12 + aerialsPerGame * .05 + passAccuracy * .18
          : rating * .55 + goalsPerGame * 1.5 + assistsPerGame + goalConversion * 1.2 + effectiveShotRate * .35 + defensiveActionsPerGame * .07 + aerialsPerGame * .05 + passAccuracy * .15;
    const score = rawScore * reliability;
    return { ...x, rating: Math.round(rating * 100) / 100, goalsPerGame, assistsPerGame, goalConversion, effectiveShotRate, defensiveActionsPerGame, passAccuracy, dribbleSuccessRate: x.dribbleSuccess / Math.max(1, x.dribbleTry), score };
  });
  const take = (test: (position: number) => boolean, count: number) => {
    return all.filter((x) => x.appearances >= minimumAppearances && test(x.position)).sort((a, b) => b.score - a.score || b.rating - a.rating).slice(0, count);
  };
  const picks = [...take((p) => p === 0, 1), ...take((p) => p >= 1 && p <= 8, 4), ...take((p) => p >= 9 && p <= 19, 3), ...take((p) => p >= 20 && p <= 27, 3)];
  return { picks, all: all.sort((a, b) => b.score - a.score || b.rating - a.rating) };
}

function recordBook(matches: Match[], names: Map<number, string>, players: any[]) {
  const shotLabels: Record<number, { title: string; emoji: string }> = { 2: { title: "감아차기 예술가", emoji: "🌀" }, 3: { title: "공중의 지배자", emoji: "🛫" }, 5: { title: "발리 장인", emoji: "⚡" }, 6: { title: "프리킥 마법사", emoji: "🪄" }, 8: { title: "파워 슛 대장", emoji: "💥" } };
  const userShots = new Map<string, { name: string; goals: number; attempts: number }>();
  const playerShots = new Map<string, { owner: string; name: string; goals: number; attempts: number }>();
  const goalkeepers = new Map<string, { owner: string; spId: number; name: string; grade: number; appearances: number; conceded: number; ratingTotal: number }>();
  const discipline = new Map<string, { owner: string; name: string; kind: string; appearances: number; fouls: number; yellowCards: number; redCards: number }>();
  for (const match of matches) for (let sideIndex = 0; sideIndex < match.matchInfo.length; sideIndex++) {
    const info = match.matchInfo[sideIndex]; const opponent = match.matchInfo[sideIndex === 0 ? 1 : 0];
    const userDiscipline = discipline.get(info.nickname) || { owner: info.nickname, name: info.nickname, kind: "user", appearances: 0, fouls: 0, yellowCards: 0, redCards: 0 };
    userDiscipline.appearances++; userDiscipline.fouls += Number(info.matchDetail.foul || 0); userDiscipline.yellowCards += Number(info.matchDetail.yellowCards || 0); userDiscipline.redCards += Number(info.matchDetail.redCards || 0); discipline.set(info.nickname, userDiscipline);
    for (const shot of info.shootDetail || []) {
      const type = Number(shot.type); const goal = Number(shot.result) === 3; const playerName = names.get(Number(shot.spId)) || `선수 ${shot.spId}`;
      for (const category of [String(type), shot.inPenalty ? "inside" : "outside"]) {
        const userKey = `${category}|${info.nickname}`; const user = userShots.get(userKey) || { name: info.nickname, goals: 0, attempts: 0 }; user.attempts++; if (goal) user.goals++; userShots.set(userKey, user);
        const playerKey = `${category}|${info.nickname}|${shot.spId}`; const player = playerShots.get(playerKey) || { owner: info.nickname, name: playerName, goals: 0, attempts: 0 }; player.attempts++; if (goal) player.goals++; playerShots.set(playerKey, player);
      }
    }
    for (const player of info.player || []) if (player.spPosition === 0 && player.status.spRating > 0) {
      const key = `${info.nickname}|${player.spId}|${player.spGrade}`; const keeper = goalkeepers.get(key) || { owner: info.nickname, spId: player.spId, name: names.get(player.spId) || `선수 ${player.spId}`, grade: player.spGrade, appearances: 0, conceded: 0, ratingTotal: 0 };
      keeper.appearances++; keeper.conceded += Number(opponent.shoot.goalTotal || 0); keeper.ratingTotal += Number(player.status.spRating || 0); goalkeepers.set(key, keeper);
    }
  }
  const leader = (source: Map<string, any>, category: string) => [...source.entries()].filter(([key]) => key.startsWith(`${category}|`)).map(([, value]) => value).sort((a, b) => b.goals - a.goals || b.attempts - a.attempts)[0] || null;
  const award = (category: string, title: string, emoji: string) => { const user = leader(userShots, category); const player = [...playerShots.entries()].filter(([key, value]) => key.startsWith(`${category}|`) && value.owner === user?.name).map(([, value]) => value).sort((a, b) => b.goals - a.goals || b.attempts - a.attempts)[0] || null; return { title, emoji, user, player }; };
  const shotAwards = [...Object.entries(shotLabels).map(([type, meta]) => award(type, meta.title, meta.emoji)), award("outside", "중거리 포병", "🚀")];
  const keepers = [...goalkeepers.values()].map((x) => ({ ...x, concededPerGame: x.conceded / x.appearances, rating: x.ratingTotal / x.appearances })).filter((x) => x.appearances >= 3);
  const users = [...discipline.values()];
  const investmentPlayers = players.filter((x) => x.appearances >= 5).map((x) => ({ ...x, gradeEfficiency: x.score / Math.max(1, x.grade) }));
  const top = (key: string, minimum = 1, descending = true) => players.filter((x) => x.appearances >= minimum).sort((a, b) => (Number(b[key]) - Number(a[key])) * (descending ? 1 : -1)).slice(0, 10);
  const perGame = (key: string) => players.filter((x) => x.appearances >= 5).map((x) => ({ ...x, perGameValue: Number(x[key] || 0) / x.appearances })).sort((a, b) => b.perGameValue - a.perGameValue).slice(0, 10);
  return { shotAwards, boards: [
    { id: "dribble-rate", emoji: "🪩", title: "벗기기 선수", description: "50회 이상 시도한 카드의 돌파 성공률", value: "dribbleSuccessRate", percent: true, rows: players.filter((x) => x.dribbleTry >= 50).sort((a, b) => b.dribbleSuccessRate - a.dribbleSuccessRate).slice(0, 10) },
    { id: "goals", emoji: "👑", title: "득점왕", description: "가장 많은 골을 넣은 카드", value: "goals", rows: top("goals"), perGameRows: perGame("goals") },
    { id: "assists", emoji: "🎁", title: "도움왕", description: "동료를 가장 많이 빛낸 카드", value: "assists", rows: top("assists"), perGameRows: perGame("assists") },
    { id: "conversion", emoji: "🎯", title: "원샷 원킬", description: "10회 이상 슈팅한 카드의 골 전환율", value: "goalConversion", percent: true, rows: players.filter((x) => x.shots >= 10).sort((a, b) => b.goalConversion - a.goalConversion).slice(0, 10) },
    { id: "rating", emoji: "⭐", title: "평점 괴물", description: "5경기 이상 출전 평균 평점", value: "rating", decimal: true, rows: top("rating", 5) },
    { id: "ironman", emoji: "🦾", title: "철인", description: "가장 많이 출전한 카드", value: "appearances", rows: top("appearances") },
    { id: "tackles", emoji: "🧹", title: "청소부", description: "태클 성공 순위", value: "tackles", rows: top("tackles"), perGameRows: perGame("tackles") },
    { id: "interceptions", emoji: "🧱", title: "길목 차단", description: "가로채기 순위", value: "interceptions", rows: top("interceptions"), perGameRows: perGame("interceptions") },
    { id: "aerials", emoji: "🦅", title: "제공권 제왕", description: "공중볼 성공 순위", value: "aerials", rows: top("aerials"), perGameRows: perGame("aerials") },
    { id: "passes", emoji: "🧠", title: "패스 마스터", description: "500회 이상 시도한 카드의 패스 성공률", value: "passAccuracy", percent: true, rows: players.filter((x) => x.passTry >= 500).sort((a, b) => b.passAccuracy - a.passAccuracy).slice(0, 10) },
    { id: "busy", emoji: "🚨", title: "가장 바쁜 수비수", description: "5경기 이상 수비수의 경기당 수비 행동", value: "defensiveActionsPerGame", decimal: true, rows: players.filter((x) => x.appearances >= 5 && x.position >= 1 && x.position <= 8).sort((a, b) => b.defensiveActionsPerGame - a.defensiveActionsPerGame).slice(0, 10) },
    { id: "oil-hands", emoji: "🧤", title: "기름손 주의보", description: "3경기 이상 GK 중 경기당 실점이 많은 순", value: "concededPerGame", decimal: true, rows: keepers.sort((a, b) => b.concededPerGame - a.concededPerGame).slice(0, 10) },
    { id: "wall", emoji: "🔒", title: "철벽 수문장", description: "3경기 이상 GK 중 경기당 실점이 적은 순", value: "concededPerGame", decimal: true, rows: [...keepers].sort((a, b) => a.concededPerGame - b.concededPerGame).slice(0, 10) },
    { id: "value", emoji: "💎", title: "강화 효율왕", description: "5경기 이상 · 강화등급 대비 포지션 보정 성과", value: "gradeEfficiency", decimal: true, rows: [...investmentPlayers].sort((a, b) => b.gradeEfficiency - a.gradeEfficiency).slice(0, 10) },
    { id: "underperform", emoji: "📉", title: "고강화 아쉬움", description: "+8 이상 · 5경기 이상 중 낮은 성과점수", value: "score", decimal: true, rows: investmentPlayers.filter((x) => x.grade >= 8).sort((a, b) => a.score - b.score).slice(0, 10) },
    { id: "yellow", emoji: "🟨", title: "카드 컬렉터", description: "옐로카드를 가장 많이 받은 카드", value: "yellowCards", rows: top("yellowCards"), perGameRows: perGame("yellowCards") },
    { id: "red", emoji: "🟥", title: "퇴장 본능", description: "레드카드를 가장 많이 받은 카드", value: "redCards", rows: top("redCards"), perGameRows: perGame("redCards") },
    { id: "fouls", emoji: "📣", title: "파울 장인", description: "유저별 반칙 횟수", value: "fouls", rows: [...users].sort((a, b) => b.fouls - a.fouls), perGameRows: users.filter((x) => x.appearances >= 5).map((x) => ({ ...x, perGameValue: x.fouls / x.appearances })).sort((a, b) => b.perGameValue - a.perGameValue) },
    { id: "dribbles", emoji: "🕺", title: "돌파 대장", description: "드리블 성공 횟수", value: "dribbleSuccess", rows: top("dribbleSuccess"), perGameRows: perGame("dribbleSuccess") },
    { id: "trigger-happy", emoji: "🔫", title: "난사왕", description: "슈팅을 가장 많이 시도한 카드", value: "shots", rows: top("shots"), perGameRows: perGame("shots") },
    { id: "body-block", emoji: "🛡️", title: "몸으로 말해요", description: "블록으로 슈팅을 막아낸 카드", value: "blocks", rows: top("blocks"), perGameRows: perGame("blocks") },
  ] };
}

function squadClasses(info: MatchInfo, seasons: Map<number, string>) {
  const counts = new Map<number, number>();
  for (const player of info.player || []) {
    if (player.spPosition === 28) continue;
    const seasonId = Math.floor(player.spId / 1_000_000);
    counts.set(seasonId, (counts.get(seasonId) || 0) + 1);
  }
  return [...counts].map(([id, count]) => ({ id, name: seasons.get(id) || `시즌 ${id}`, count })).sort((a, b) => b.count - a.count).slice(0, 3);
}

export async function GET() {
  const key = process.env.NEXON_API_KEY;
  if (!key) return NextResponse.json({ connected: false, reason: "NEXON_API_KEY가 설정되지 않았습니다." });

  try {
    const identities = await Promise.all(NICKNAMES.map(async (nickname) => {
      const result = await nexon<{ ouid: string }>(`/id?nickname=${encodeURIComponent(nickname)}`, key, 86400);
      return { nickname, ouid: result.ouid };
    }));
    const ouids = new Set(identities.map((x) => x.ouid));
    const matchTypes = [40];
    const playerLists = await Promise.all(identities.map(async ({ ouid }) => {
      const lists = [] as string[][];
      for (const type of matchTypes) {
        for (let offset = 0; offset <= 400; offset += 100) {
          const page = await nexon<string[]>(`/user/match?ouid=${ouid}&matchtype=${type}&offset=${offset}&limit=100`, key, 7200);
          lists.push(page);
          if (page.length < 100) break;
        }
      }
      return [...new Set(lists.flat())];
    }));
    const counts = new Map<string, number>();
    playerLists.forEach((ids) => ids.forEach((id) => counts.set(id, (counts.get(id) || 0) + 1)));
    const ids = [...counts].filter(([, count]) => count >= 2).map(([id]) => id);
    const details: Match[] = [];
    for (let i = 0; i < ids.length; i += 5) {
      const batch = await Promise.all(ids.slice(i, i + 5).map((id) => nexon<Match>(`/match-detail?matchid=${id}`, key, false)));
      details.push(...batch);
    }
    const matches = details.filter((m) => new Date(`${m.matchDate}+09:00`) >= START && m.matchInfo.length === 2 && m.matchInfo.every((x) => ouids.has(x.ouid)))
      .sort((a, b) => b.matchDate.localeCompare(a.matchDate));
    const [playerMeta, seasonMeta] = await Promise.all([
      fetch("https://open.api.nexon.com/static/fconline/meta/spid.json", { next: { revalidate: 86400 } }).then((r) => r.json()) as Promise<Array<{ id: number; name: string }>>,
      fetch("https://open.api.nexon.com/static/fconline/meta/seasonid.json", { next: { revalidate: 86400 } }).then((r) => r.json()) as Promise<Array<{ seasonId: number; className: string }>>,
    ]);
    const playerNames = new Map(playerMeta.map((player) => [player.id, player.name]));
    const seasonNames = new Map(seasonMeta.map((season) => [season.seasonId, season.className]));
    const weeklyMatches = matches.filter((m) => new Date(`${m.matchDate}+09:00`) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    const weeklySelection = bestEleven(weeklyMatches, playerNames, 5);
    const seasonSelection = bestEleven(matches, playerNames, 10);
    return NextResponse.json({
      connected: true,
      updatedAt: new Date().toISOString(),
      playerCount: NICKNAMES.length,
      matchCount: matches.length,
      standings: { excludingShootout: table(matches, false), includingShootout: table(matches, true) },
      analytics: analytics(matches, playerNames),
      weeklyBest: weeklySelection.picks,
      seasonBest: seasonSelection.picks,
      weeklyPlayers: weeklySelection.all,
      seasonPlayers: seasonSelection.all,
      records: recordBook(matches, playerNames, seasonSelection.all),
      matches: matches.map((m) => ({
        id: m.matchId, date: m.matchDate, type: m.matchType,
        home: m.matchInfo[0].nickname, away: m.matchInfo[1].nickname,
        homeGoals: m.matchInfo[0].shoot.goalTotal, awayGoals: m.matchInfo[1].shoot.goalTotal,
        homeShootout: m.matchInfo[0].shoot.shootOutScore || 0, awayShootout: m.matchInfo[1].shoot.shootOutScore || 0,
        homePossession: m.matchInfo[0].matchDetail.possession || 0, awayPossession: m.matchInfo[1].matchDetail.possession || 0,
        homeShots: m.matchInfo[0].shoot.shootTotal || 0, awayShots: m.matchInfo[1].shoot.shootTotal || 0,
        homeClasses: squadClasses(m.matchInfo[0], seasonNames), awayClasses: squadClasses(m.matchInfo[1], seasonNames),
      })),
    }, { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" } });
  } catch (error) {
    return NextResponse.json({ connected: false, reason: error instanceof Error ? error.message : "API 연결 실패" }, { status: 502 });
  }
}
