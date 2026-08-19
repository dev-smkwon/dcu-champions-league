import { NextResponse } from "next/server";

export const maxDuration = 300;

const API = "https://open.api.nexon.com/fconline/v1";
const NICKNAMES = ["씅민쓰", "6년제", "따이민", "그냥강혜중", "대가대다님", "박수환", "빅수환", "6w91oap5jy"];

type MatchInfo = {
  ouid: string;
  nickname: string;
  matchDetail: { matchResult: string; possession: number; foul: number; yellowCards: number; redCards: number; dribble: number };
  shoot: { goalTotal: number; shootOutScore: number; shootTotal: number; effectiveShootTotal: number };
  pass: { passTry: number; passSuccess: number; longPassTry: number; longPassSuccess: number; bouncingLobPassTry: number; bouncingLobPassSuccess: number; lobbedThroughPassTry: number; lobbedThroughPassSuccess: number };
  shootDetail: Array<{ spId: number; goalTime: number; x: number; y: number; result: number; type: number; inPenalty: boolean; assist?: boolean; assistSpId?: number; assistX?: number; assistY?: number }>;
  player: Array<{ spId: number; spPosition: number; spGrade: number; status: { shoot: number; effectiveShoot: number; assist: number; goal: number; passTry: number; passSuccess: number; tackle: number; intercept: number; block: number; defending: number; aerialTry: number; aerialSuccess: number; dribbleTry: number; dribbleSuccess: number; yellowCards: number; redCards: number; spRating: number } }>;
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
  const shotTypeNames: Record<number, string> = { 1: "일반 슛", 2: "감아차기", 3: "헤더", 4: "로빙 슛", 5: "플레어 슛", 6: "낮은 슛", 7: "발리 슛", 8: "프리킥", 9: "페널티킥", 10: "무회전 슛", 11: "바이시클킥", 12: "파워 슛" };
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
    const item = candidates.get(key) || { owner: info.nickname, spId: player.spId, name: names.get(player.spId) || `선수 ${player.spId}`, position: player.spPosition, grade: player.spGrade, appearances: 0, goals: 0, assists: 0, shots: 0, effectiveShots: 0, passTry: 0, passSuccess: 0, tackles: 0, interceptions: 0, blocks: 0, defending: 0, aerialTry: 0, aerials: 0, dribbleTry: 0, dribbleSuccess: 0, yellowCards: 0, redCards: 0, ratingTotal: 0 };
    item.appearances++; item.goals += player.status.goal || 0; item.assists += player.status.assist || 0; item.shots += player.status.shoot || 0; item.effectiveShots += player.status.effectiveShoot || 0; item.passTry += player.status.passTry || 0; item.passSuccess += player.status.passSuccess || 0; item.tackles += player.status.tackle || 0; item.interceptions += player.status.intercept || 0; item.blocks += player.status.block || 0; item.defending += player.status.defending || 0; item.aerialTry += player.status.aerialTry || 0; item.aerials += player.status.aerialSuccess || 0; item.dribbleTry += player.status.dribbleTry || 0; item.dribbleSuccess += player.status.dribbleSuccess || 0; item.yellowCards += player.status.yellowCards || 0; item.redCards += player.status.redCards || 0; item.ratingTotal += player.status.spRating || 0; candidates.set(key, item);
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
    const dribbleSuccessRate = x.dribbleSuccess / Math.max(1, x.dribbleTry);
    const dribbleSuccessPerGame = x.dribbleSuccess / x.appearances;
    const takeOnImpact = dribbleSuccessPerGame * .55 + dribbleSuccessRate * 3 + goalsPerGame * 1.5;
    return { ...x, rating: Math.round(rating * 100) / 100, goalsPerGame, assistsPerGame, goalContributionsPerGame: (x.goals + x.assists) / x.appearances, goalConversion, effectiveShotRate, defensiveActionsPerGame, passAccuracy, aerialSuccessRate: x.aerials / Math.max(1, x.aerialTry), dribbleSuccessRate, dribbleSuccessPerGame, takeOnImpact, score };
  });
  const take = (test: (position: number) => boolean, count: number) => {
    return all.filter((x) => x.appearances >= minimumAppearances && test(x.position)).sort((a, b) => b.score - a.score || b.rating - a.rating).slice(0, count);
  };
  const picks = [...take((p) => p === 0, 1), ...take((p) => p >= 1 && p <= 8, 4), ...take((p) => p >= 9 && p <= 19, 3), ...take((p) => p >= 20 && p <= 27, 3)];
  return { picks, all: all.sort((a, b) => b.score - a.score || b.rating - a.rating) };
}

function recordBook(matches: Match[], names: Map<number, string>, players: any[]) {
  const shotAwardsConfig = [
    { id: "1", types: [1], title: "정석 슈터", emoji: "⚽" },
    { id: "2", types: [2], title: "감아차기 예술가", emoji: "🌀" },
    { id: "header", types: [3], title: "공중의 지배자", emoji: "🛫" },
    { id: "4", types: [4], title: "로빙 슛 도사", emoji: "🌈" },
    { id: "5", types: [5], title: "플레어 쇼맨", emoji: "✨" },
    { id: "6", types: [6], title: "낮은 슛 장인", emoji: "🕳️" },
    { id: "volley", types: [7], title: "발리 장인", emoji: "⚡" },
    { id: "8", types: [8], title: "프리킥 마법사", emoji: "🪄" },
    { id: "9", types: [9], title: "PK 해결사", emoji: "🥅" },
    { id: "10", types: [10], title: "무회전 폭격기", emoji: "🧨" },
    { id: "11", types: [11], title: "바이시클 곡예사", emoji: "🤸" },
    { id: "12", types: [12], title: "파워 슛 대장", emoji: "💥" },
  ];
  const userShots = new Map<string, { name: string; goals: number; attempts: number }>();
  const playerShots = new Map<string, { owner: string; spId: number; name: string; goals: number; attempts: number }>();
  const goalkeepers = new Map<string, { owner: string; spId: number; name: string; grade: number; appearances: number; conceded: number; ratingTotal: number }>();
  const discipline = new Map<string, { owner: string; name: string; kind: string; appearances: number; fouls: number; yellowCards: number; redCards: number; aerialPassTry: number; aerialPassSuccess: number }>();
  type ActionPlayer = { owner: string; spId: number; name: string; count: number };
  type ActionUser = { name: string; count: number; appearances: number; opponents: Set<string>; matches: Set<string> };
  type ActionPair = { owner: string; passer: string; scorer: string; count: number };
  const killerPassers = new Map<string, ActionPlayer>(); const killerScorers = new Map<string, ActionPlayer>();
  const cutbackPassers = new Map<string, ActionPlayer>(); const cutbackScorers = new Map<string, ActionPlayer>();
  const killerPairs = new Map<string, ActionPair>(); const cutbackPairs = new Map<string, ActionPair>();
  const killerUsers = new Map<string, ActionUser>(); const cutbackUsers = new Map<string, ActionUser>();
  const killerConceded = new Map<string, ActionUser>(); const cutbackConceded = new Map<string, ActionUser>();
  const cutbackLeftUsers = new Map<string, ActionUser>(); const cutbackRightUsers = new Map<string, ActionUser>();
  const cutbackLeftConceded = new Map<string, ActionUser>(); const cutbackRightConceded = new Map<string, ActionUser>();
  let longestKiller: { owner: string; passer: string; scorer: string; distance: number } | null = null;
  const killerDeliveries: Array<{ owner: string; passer: string; scorer: string; distance: number }> = [];
  const addPlayerAction = (target: Map<string, ActionPlayer>, owner: string, spId: number) => { const key = `${owner}|${spId}`; const row = target.get(key) || { owner, spId, name: names.get(spId) || `선수 ${spId}`, count: 0 }; row.count++; target.set(key, row); };
  const addUserAction = (target: Map<string, ActionUser>, name: string, opponent: string, matchId: string) => { const appearances = 0; const row = target.get(name) || { name, count: 0, appearances, opponents: new Set<string>(), matches: new Set<string>() }; row.count++; row.opponents.add(opponent); row.matches.add(matchId); target.set(name, row); };
  const addPairAction = (target: Map<string, ActionPair>, owner: string, passerId: number, scorerId: number) => { const key = `${owner}|${passerId}|${scorerId}`; const row = target.get(key) || { owner, passer: names.get(passerId) || `선수 ${passerId}`, scorer: names.get(scorerId) || `선수 ${scorerId}`, count: 0 }; row.count++; target.set(key, row); };
  for (const match of matches) for (let sideIndex = 0; sideIndex < match.matchInfo.length; sideIndex++) {
    const info = match.matchInfo[sideIndex]; const opponent = match.matchInfo[sideIndex === 0 ? 1 : 0];
    const userDiscipline = discipline.get(info.nickname) || { owner: info.nickname, name: info.nickname, kind: "user", appearances: 0, fouls: 0, yellowCards: 0, redCards: 0, aerialPassTry: 0, aerialPassSuccess: 0 };
    userDiscipline.appearances++; userDiscipline.fouls += Number(info.matchDetail.foul || 0); userDiscipline.yellowCards += Number(info.matchDetail.yellowCards || 0); userDiscipline.redCards += Number(info.matchDetail.redCards || 0);
    userDiscipline.aerialPassTry += Number(info.pass.longPassTry || 0) + Number(info.pass.bouncingLobPassTry || 0) + Number(info.pass.lobbedThroughPassTry || 0);
    userDiscipline.aerialPassSuccess += Number(info.pass.longPassSuccess || 0) + Number(info.pass.bouncingLobPassSuccess || 0) + Number(info.pass.lobbedThroughPassSuccess || 0);
    discipline.set(info.nickname, userDiscipline);
    for (const shot of info.shootDetail || []) {
      const type = Number(shot.type); const goal = Number(shot.result) === 3; const playerName = names.get(Number(shot.spId)) || `선수 ${shot.spId}`;
      const groupedCategories = shotAwardsConfig.filter((award) => award.types.includes(type)).map((award) => award.id);
      for (const category of [...new Set([String(type), ...groupedCategories, shot.inPenalty ? "inside" : "outside"])]) {
        const userKey = `${category}|${info.nickname}`; const user = userShots.get(userKey) || { name: info.nickname, goals: 0, attempts: 0 }; user.attempts++; if (goal) user.goals++; userShots.set(userKey, user);
        const playerKey = `${category}|${info.nickname}|${shot.spId}`; const player = playerShots.get(playerKey) || { owner: info.nickname, spId: Number(shot.spId), name: playerName, goals: 0, attempts: 0 }; player.attempts++; if (goal) player.goals++; playerShots.set(playerKey, player);
      }
      if (goal && shot.assist && Number(shot.assistSpId) > 0) {
        const sx = Number(shot.x); const sy = Number(shot.y); const ax = Number(shot.assistX); const ay = Number(shot.assistY);
        const dx = sx - ax; const normalizedDistance = Math.hypot(dx, sy - ay); const distance = Math.hypot(dx * 105, (sy - ay) * 68);
        const shotNearBox = sx >= .68 && sy >= .12 && sy <= .88;
        const assistFromWideByline = ax >= .82 && (ay <= .25 || ay >= .75);
        const movesInward = Math.abs(.5 - ay) - Math.abs(.5 - sy);
        const isCutback = assistFromWideByline && shotNearBox && sy >= .25 && sy <= .75 && movesInward >= .12 && sx <= ax + .05;
        const isKiller = !isCutback && shotNearBox && dx >= .10 && normalizedDistance >= .16 && distance <= 55 && !(ax >= .80 && (ay <= .22 || ay >= .78));
        const passerId = Number(shot.assistSpId); const scorerId = Number(shot.spId);
        if (isCutback) {
          addPlayerAction(cutbackPassers, info.nickname, passerId); addPlayerAction(cutbackScorers, info.nickname, scorerId); addPairAction(cutbackPairs, info.nickname, passerId, scorerId);
          addUserAction(cutbackUsers, info.nickname, opponent.nickname, match.matchId); addUserAction(cutbackConceded, opponent.nickname, info.nickname, match.matchId);
          addUserAction(ay < .5 ? cutbackLeftUsers : cutbackRightUsers, info.nickname, opponent.nickname, match.matchId);
          addUserAction(ay < .5 ? cutbackLeftConceded : cutbackRightConceded, opponent.nickname, info.nickname, match.matchId);
        } else if (isKiller) {
          addPlayerAction(killerPassers, info.nickname, passerId); addPlayerAction(killerScorers, info.nickname, scorerId); addPairAction(killerPairs, info.nickname, passerId, scorerId);
          addUserAction(killerUsers, info.nickname, opponent.nickname, match.matchId); addUserAction(killerConceded, opponent.nickname, info.nickname, match.matchId);
          const delivery = { owner: info.nickname, passer: names.get(passerId) || `선수 ${passerId}`, scorer: names.get(scorerId) || `선수 ${scorerId}`, distance }; killerDeliveries.push(delivery);
          if (!longestKiller || distance > longestKiller.distance) longestKiller = delivery;
        }
      }
    }
    for (const player of info.player || []) if (player.spPosition === 0 && player.status.spRating > 0) {
      const key = `${info.nickname}|${player.spId}|${player.spGrade}`; const keeper = goalkeepers.get(key) || { owner: info.nickname, spId: player.spId, name: names.get(player.spId) || `선수 ${player.spId}`, grade: player.spGrade, appearances: 0, conceded: 0, ratingTotal: 0 };
      keeper.appearances++; keeper.conceded += Number(opponent.shoot.goalTotal || 0); keeper.ratingTotal += Number(player.status.spRating || 0); goalkeepers.set(key, keeper);
    }
  }
  const appearances = new Map([...discipline.values()].map((row) => [row.name, row.appearances]));
  for (const source of [killerUsers, cutbackUsers, killerConceded, cutbackConceded, cutbackLeftUsers, cutbackRightUsers, cutbackLeftConceded, cutbackRightConceded]) for (const row of source.values()) row.appearances = appearances.get(row.name) || 0;
  const playerLeader = (source: Map<string, ActionPlayer>) => [...source.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ko"))[0] || null;
  const userLeader = (source: Map<string, ActionUser>, mode: "total" | "perGame" | "matches" | "opponents" = "total") => [...source.values()].filter((row) => mode !== "perGame" || row.appearances >= 5).sort((a, b) => {
    const av = mode === "perGame" ? a.count / a.appearances : mode === "matches" ? a.matches.size : mode === "opponents" ? a.opponents.size : a.count;
    const bv = mode === "perGame" ? b.count / b.appearances : mode === "matches" ? b.matches.size : mode === "opponents" ? b.opponents.size : b.count;
    return bv - av || b.count - a.count;
  })[0] || null;
  const pairLeader = (source: Map<string, ActionPair>) => [...source.values()].sort((a, b) => b.count - a.count)[0] || null;
  type ActionRanking = { name: string; meta: string; value: number };
  const playerRankings = (source: Map<string, ActionPlayer>): ActionRanking[] => [...source.values()].sort((a, b) => b.count - a.count).slice(0, 10).map((row) => ({ name: row.name, meta: row.owner, value: row.count }));
  const userRankings = (source: Map<string, ActionUser>, mode: "total" | "perGame" | "matches" | "opponents" = "total"): ActionRanking[] => [...source.values()].filter((row) => mode !== "perGame" || row.appearances >= 5).map((row) => ({ name: row.name, meta: `${row.appearances}경기`, value: mode === "perGame" ? row.count / row.appearances : mode === "matches" ? row.matches.size : mode === "opponents" ? row.opponents.size : row.count })).sort((a, b) => b.value - a.value).slice(0, 10);
  const pairRankings = (source: Map<string, ActionPair>): ActionRanking[] => [...source.values()].sort((a, b) => b.count - a.count).slice(0, 10).map((row) => ({ name: `${row.passer} → ${row.scorer}`, meta: row.owner, value: row.count }));
  const card = (id: string, emoji: string, title: string, description: string, subject: string, meta: string, value: number, unit: string, rankings: ActionRanking[] = []) => ({ id, emoji, title, description, subject, meta, value: Math.round(value * 100) / 100, unit, proxy: true, rankings: rankings.map((row) => ({ ...row, value: Math.round(row.value * 100) / 100 })) });
  const playerCard = (id: string, emoji: string, title: string, description: string, row: ActionPlayer | null, source: Map<string, ActionPlayer>) => card(id, emoji, title, description, row?.name || "기록 없음", row ? `${row.owner} 소속` : "조건 충족 기록 없음", row?.count || 0, "회", playerRankings(source));
  const userCard = (id: string, emoji: string, title: string, description: string, row: ActionUser | null, source: Map<string, ActionUser>, mode: "total" | "perGame" | "matches" | "opponents" = "total") => card(id, emoji, title, description, row?.name || "기록 없음", row ? `${row.appearances}경기 표본` : "조건 충족 기록 없음", row ? (mode === "perGame" ? row.count / row.appearances : mode === "matches" ? row.matches.size : mode === "opponents" ? row.opponents.size : row.count) : 0, mode === "perGame" ? "회/경기" : mode === "opponents" ? "명" : mode === "matches" ? "경기" : "골", userRankings(source, mode));
  const killerPair = pairLeader(killerPairs); const cutbackPair = pairLeader(cutbackPairs);
  const fullCourse = [...NICKNAMES].map((name) => { const killerMatches = killerConceded.get(name)?.matches || new Set<string>(); const cutbackMatches = cutbackConceded.get(name)?.matches || new Set<string>(); const shared = new Set([...killerMatches].filter((id) => cutbackMatches.has(id))); return { name, count: shared.size, appearances: appearances.get(name) || 0, opponents: new Set<string>(), matches: shared }; }).sort((a, b) => b.count - a.count)[0];
  const playmakingGroups = [
    { id: "killer", tone: "killer", eyebrow: "LINE BREAKING", title: "킬패스 공격 기록", description: "도움 좌표에서 전진해 수비 뒷공간을 공략한 득점을 추정합니다.", records: [
      playerCard("killer-passer", "🗝️", "킬패스 장인", "뒷공간 득점을 가장 많이 배달한 선수", playerLeader(killerPassers), killerPassers),
      playerCard("killer-scorer", "🏃", "뒷빵 장인", "킬패스를 받아 가장 많이 득점한 선수", playerLeader(killerScorers), killerScorers),
      card("killer-longest", "📦", "택배 기사", "가장 긴 전진 킬패스 한 방", longestKiller?.passer || "기록 없음", longestKiller ? `${longestKiller.owner} · → ${longestKiller.scorer}` : "조건 충족 기록 없음", longestKiller?.distance || 0, "m", [...killerDeliveries].sort((a, b) => b.distance - a.distance).slice(0, 10).map((row) => ({ name: row.passer, meta: `${row.owner} · → ${row.scorer}`, value: row.distance }))),
      card("killer-duo", "🤝", "침투 듀오", "가장 많이 합작한 패서와 득점자", killerPair ? `${killerPair.passer} → ${killerPair.scorer}` : "기록 없음", killerPair?.owner || "조건 충족 기록 없음", killerPair?.count || 0, "골", pairRankings(killerPairs)),
      userCard("killer-user", "🏭", "뒷공간 공장", "킬패스 득점을 가장 많이 만든 유저", userLeader(killerUsers), killerUsers),
      userCard("killer-rate", "📈", "경기당 킬패스", "5경기 이상 유저의 경기당 킬패스 득점", userLeader(killerUsers, "perGame"), killerUsers, "perGame"),
    ] },
    { id: "cutback", tone: "cutback", eyebrow: "BYLINE CREATION", title: "컷백 공격 기록", description: "측면 골라인 부근에서 중앙으로 되돌린 도움 좌표를 별도로 추정합니다.", records: [
      playerCard("cutback-passer", "↩️", "컷백 장인", "컷백 도움을 가장 많이 만든 선수", playerLeader(cutbackPassers), cutbackPassers),
      playerCard("cutback-scorer", "🍽️", "받아먹기 장인", "컷백을 받아 가장 많이 마무리한 선수", playerLeader(cutbackScorers), cutbackScorers),
      userCard("cutback-user", "🏭", "컷백 공장", "컷백 득점을 가장 많이 만든 유저", userLeader(cutbackUsers), cutbackUsers),
      card("cutback-duo", "🫱🏻‍🫲🏻", "컷백 듀오", "가장 많이 합작한 패서와 득점자", cutbackPair ? `${cutbackPair.passer} → ${cutbackPair.scorer}` : "기록 없음", cutbackPair?.owner || "조건 충족 기록 없음", cutbackPair?.count || 0, "골", pairRankings(cutbackPairs)),
      userCard("cutback-left", "⬅️", "왼쪽 맛집", "좌측에서 시작한 컷백 득점 최다 유저", userLeader(cutbackLeftUsers), cutbackLeftUsers),
      userCard("cutback-right", "➡️", "오른쪽 맛집", "우측에서 시작한 컷백 득점 최다 유저", userLeader(cutbackRightUsers), cutbackRightUsers),
      userCard("cutback-rate", "📊", "경기당 컷백", "5경기 이상 유저의 경기당 컷백 득점", userLeader(cutbackUsers, "perGame"), cutbackUsers, "perGame"),
    ] },
    { id: "defence", tone: "negative", eyebrow: "DEFENSIVE LOWLIGHTS", title: "뒷공간·컷백 허용 기록", description: "상대 득점 이벤트를 기준으로 허용한 유저에게 귀속합니다.", records: [
      userCard("open-backdoor", "🚪", "뒷문 개방", "킬패스 득점을 가장 많이 허용한 유저", userLeader(killerConceded), killerConceded),
      userCard("offside-broken", "🚩", "오프사이드 트랩 고장", "5경기 이상 · 경기당 킬패스 허용", userLeader(killerConceded, "perGame"), killerConceded, "perGame"),
      userCard("run-in-shop", "🏪", "침투 맛집", "킬패스 득점을 허용한 상대가 가장 다양한 유저", userLeader(killerConceded, "opponents"), killerConceded, "opponents"),
      userCard("cutback-subscription", "🔁", "컷백 정기구독", "컷백 득점을 가장 많이 허용한 유저", userLeader(cutbackConceded), cutbackConceded),
      userCard("frozen-defence", "😵‍💫", "어버버 수비", "5경기 이상 · 경기당 컷백 허용", userLeader(cutbackConceded, "perGame"), cutbackConceded, "perGame"),
      userCard("side-door", "🛣️", "사이드문 활짝", "컷백을 허용한 경기 수가 가장 많은 유저", userLeader(cutbackConceded, "matches"), cutbackConceded, "matches"),
      userCard("left-unlocked", "⬅️", "왼쪽 문단속 실패", "좌측 기점 컷백 허용 최다 유저", userLeader(cutbackLeftConceded), cutbackLeftConceded),
      userCard("right-unlocked", "➡️", "오른쪽 문단속 실패", "우측 기점 컷백 허용 최다 유저", userLeader(cutbackRightConceded), cutbackRightConceded),
      userCard("full-course", "🍱", "환장의 풀코스", "한 경기에서 킬패스와 컷백을 모두 허용", fullCourse.count ? fullCourse : null, new Map([...NICKNAMES].map((name) => { const killerMatches = killerConceded.get(name)?.matches || new Set<string>(); const cutbackMatches = cutbackConceded.get(name)?.matches || new Set<string>(); const shared = new Set([...killerMatches].filter((id) => cutbackMatches.has(id))); return [name, { name, count: shared.size, appearances: appearances.get(name) || 0, opponents: new Set<string>(), matches: shared }]; })), "matches"),
    ] },
  ];
  const leader = (source: Map<string, any>, category: string) => [...source.entries()].filter(([key]) => key.startsWith(`${category}|`)).map(([, value]) => value).sort((a, b) => b.goals - a.goals || b.attempts - a.attempts)[0] || null;
  const award = (category: string, title: string, emoji: string) => { const user = leader(userShots, category); const rankings = [...playerShots.entries()].filter(([key]) => key.startsWith(`${category}|`)).map(([, value]) => ({ ...value, conversion: value.goals / Math.max(1, value.attempts) })).sort((a, b) => b.goals - a.goals || b.attempts - a.attempts); const player = rankings.find((value) => value.owner === user?.name) || null; return { id: category, title, emoji, user, player, rankings: rankings.slice(0, 10) }; };
  const shotAwards = [...shotAwardsConfig.map((config) => award(config.id, config.title, config.emoji)), award("outside", "중거리 포병", "🚀")];
  const keepers = [...goalkeepers.values()].map((x) => ({ ...x, concededPerGame: x.conceded / x.appearances, rating: x.ratingTotal / x.appearances })).filter((x) => x.appearances >= 3);
  const users = [...discipline.values()].map((user) => ({ ...user, aerialPassAccuracy: user.aerialPassSuccess / Math.max(1, user.aerialPassTry), aerialPassSuccessPerGame: user.aerialPassSuccess / Math.max(1, user.appearances) }));
  const investmentPlayers = players.filter((x) => x.appearances >= 5).map((x) => ({ ...x, gradeEfficiency: x.score / Math.max(1, x.grade) }));
  const top = (key: string, minimum = 1, descending = true) => players.filter((x) => x.appearances >= minimum).sort((a, b) => (Number(b[key]) - Number(a[key])) * (descending ? 1 : -1)).slice(0, 10);
  const perGame = (key: string) => players.filter((x) => x.appearances >= 5).map((x) => ({ ...x, perGameValue: Number(x[key] || 0) / x.appearances })).sort((a, b) => b.perGameValue - a.perGameValue).slice(0, 10);
  const boards = [
    { id: "dribble-rate", emoji: "🪩", title: "벗기기 선수", description: "5경기+ · 돌파 빈도·성공률·득점력을 합친 벗기기 지수", value: "takeOnImpact", decimal: true, rows: players.filter((x) => x.appearances >= 5 && x.dribbleTry >= 30).sort((a, b) => b.takeOnImpact - a.takeOnImpact || b.dribbleSuccess - a.dribbleSuccess).slice(0, 10) },
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
    { id: "trigger-happy", emoji: "🔫", title: "난사왕", description: "50회 이상 슈팅 중 골 전환율이 낮은 순", value: "goalConversion", percent: true, rows: players.filter((x) => x.shots >= 50).sort((a, b) => a.goalConversion - b.goalConversion || b.shots - a.shots).slice(0, 10) },
    { id: "body-block", emoji: "🛡️", title: "몸으로 말해요", description: "블록으로 슈팅을 막아낸 카드", value: "blocks", rows: top("blocks"), perGameRows: perGame("blocks") },
    { id: "aerial-delivery", emoji: "📦", title: "택배 크로스 후보", description: "유저별 롱패스·로빙 패스 성공 누적 (크로스 대체 지표)", value: "aerialPassSuccess", rows: [...users].sort((a, b) => b.aerialPassSuccess - a.aerialPassSuccess), perGameRows: [...users].filter((x) => x.appearances >= 5).map((x) => ({ ...x, perGameValue: x.aerialPassSuccessPerGame })).sort((a, b) => b.perGameValue - a.perGameValue) },
    { id: "aerial-accuracy", emoji: "🎁", title: "공중 배송 정확도", description: "공중 패스 20회 이상 시도한 유저의 성공률", value: "aerialPassAccuracy", percent: true, rows: [...users].filter((x) => x.aerialPassTry >= 20).sort((a, b) => b.aerialPassAccuracy - a.aerialPassAccuracy || b.aerialPassSuccess - a.aerialPassSuccess) },
    { id: "low-rating", emoji: "🫥", title: "평점 비상", description: "5경기 이상 출전 평균 평점 낮은 순", value: "rating", decimal: true, rows: [...players].filter((x) => x.appearances >= 5).sort((a, b) => a.rating - b.rating).slice(0, 10) },
    { id: "off-target", emoji: "🛰️", title: "골대 탐색 중", description: "20회 이상 슈팅한 카드의 유효 슈팅률 낮은 순", value: "effectiveShotRate", percent: true, rows: [...players].filter((x) => x.shots >= 20).sort((a, b) => a.effectiveShotRate - b.effectiveShotRate || b.shots - a.shots).slice(0, 10) },
    { id: "pass-lost", emoji: "🧭", title: "패스 길 잃음", description: "100회 이상 패스한 카드의 성공률 낮은 순", value: "passAccuracy", percent: true, rows: [...players].filter((x) => x.passTry >= 100).sort((a, b) => a.passAccuracy - b.passAccuracy || b.passTry - a.passTry).slice(0, 10) },
    { id: "dribble-stopped", emoji: "🚧", title: "돌파 공사 중", description: "30회 이상 드리블한 카드의 성공률 낮은 순", value: "dribbleSuccessRate", percent: true, rows: [...players].filter((x) => x.dribbleTry >= 30).sort((a, b) => a.dribbleSuccessRate - b.dribbleSuccessRate || b.dribbleTry - a.dribbleTry).slice(0, 10) },
    { id: "aerial-weak", emoji: "🪶", title: "공중볼 양보", description: "20회 이상 경합한 카드의 공중볼 성공률 낮은 순", value: "aerialSuccessRate", percent: true, rows: [...players].filter((x) => x.aerialTry >= 20).sort((a, b) => a.aerialSuccessRate - b.aerialSuccessRate || b.aerialTry - a.aerialTry).slice(0, 10) },
    { id: "attack-silence", emoji: "🤐", title: "공격 포인트 가뭄", description: "10경기 이상 공격수의 경기당 골+도움 낮은 순", value: "goalContributionsPerGame", decimal: true, rows: [...players].filter((x) => x.appearances >= 10 && x.position >= 20).sort((a, b) => a.goalContributionsPerGame - b.goalContributionsPerGame || b.appearances - a.appearances).slice(0, 10) },
    { id: "defence-walk", emoji: "🚶", title: "수비 산책", description: "10경기 이상 수비수의 경기당 수비 행동 낮은 순", value: "defensiveActionsPerGame", decimal: true, rows: [...players].filter((x) => x.appearances >= 10 && x.position >= 1 && x.position <= 8).sort((a, b) => a.defensiveActionsPerGame - b.defensiveActionsPerGame || b.appearances - a.appearances).slice(0, 10) },
  ];
  const negativeBoardIds = new Set(["oil-hands", "underperform", "yellow", "red", "fouls", "trigger-happy", "low-rating", "off-target", "pass-lost", "dribble-stopped", "aerial-weak", "attack-silence", "defence-walk"]);
  return { shotAwards, playmakingGroups, boards: boards.map((board) => ({ ...board, sentiment: negativeBoardIds.has(board.id) ? "negative" : "positive" })) };
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
        for (let offset = 0; offset < 10000; offset += 100) {
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
    const matches = details.filter((m) => m.matchInfo.length === 2 && m.matchInfo.every((x) => ouids.has(x.ouid)))
      .sort((a, b) => b.matchDate.localeCompare(a.matchDate));
    const monthKeys = [...new Set(matches.map((match) => match.matchDate.slice(0, 7)))].sort((a, b) => b.localeCompare(a));
    const monthly = monthKeys.map((key) => {
      const monthMatches = matches.filter((match) => match.matchDate.startsWith(key));
      const dates = monthMatches.map((match) => match.matchDate).sort();
      const firstDay = Number(dates[0]?.slice(8, 10) || 1);
      const isCurrent = key === new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" }).slice(0, 7);
      return {
        key,
        label: `${Number(key.slice(5, 7))}월`,
        matchCount: monthMatches.length,
        coverage: firstDay > 1 ? "partial" : isCurrent ? "ongoing" : "complete",
        from: dates[0] || null,
        to: dates.at(-1) || null,
        standings: { excludingShootout: table(monthMatches, false), includingShootout: table(monthMatches, true) },
      };
    });
    const [playerMeta, seasonMeta] = await Promise.all([
      fetch("https://open.api.nexon.com/static/fconline/meta/spid.json", { next: { revalidate: 86400 } }).then((r) => r.json()) as Promise<Array<{ id: number; name: string }>>,
      fetch("https://open.api.nexon.com/static/fconline/meta/seasonid.json", { next: { revalidate: 86400 } }).then((r) => r.json()) as Promise<Array<{ seasonId: number; className: string }>>,
    ]);
    const playerNames = new Map(playerMeta.map((player) => [player.id, player.name]));
    const seasonNames = new Map(seasonMeta.map((season) => [season.seasonId, season.className]));
    const weeklyMatches = matches.filter((m) => new Date(`${m.matchDate}+09:00`) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    const currentMonthMatches = matches.filter((match) => match.matchDate.startsWith(monthKeys[0] || ""));
    const weeklySelection = bestEleven(weeklyMatches, playerNames, 5);
    const seasonSelection = bestEleven(matches, playerNames, 10);
    return NextResponse.json({
      connected: true,
      updatedAt: new Date().toISOString(),
      playerCount: NICKNAMES.length,
      matchCount: matches.length,
      dateRange: { from: matches.at(-1)?.matchDate || null, to: matches[0]?.matchDate || null },
      standings: { excludingShootout: table(matches, false), includingShootout: table(matches, true) },
      monthly,
      currentMonth: monthly[0] ? { ...monthly[0], analytics: analytics(currentMonthMatches, playerNames) } : null,
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
