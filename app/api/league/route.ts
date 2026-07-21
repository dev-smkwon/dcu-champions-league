import { NextResponse } from "next/server";

const API = "https://open.api.nexon.com/fconline/v1";
const NICKNAMES = ["씅민쓰", "6년제", "따이민", "그냥강혜중", "대가대다님", "박수환", "빅수환", "6w91oap5jy"];
const START = new Date("2026-07-01T00:00:00+09:00");

type MatchInfo = {
  ouid: string;
  nickname: string;
  matchDetail: { matchResult: string; possession: number };
  shoot: { goalTotal: number; shootOutScore: number; shootTotal: number; effectiveShootTotal: number };
  pass: { passTry: number; passSuccess: number };
  shootDetail: Array<{ goalTime: number; x: number; y: number; result: number; inPenalty: boolean }>;
  player: Array<{ spId: number; spPosition: number; spGrade: number; status: { shoot: number; effectiveShoot: number; assist: number; goal: number; passTry: number; passSuccess: number; tackle: number; intercept: number; spRating: number } }>;
};

type Match = { matchId: string; matchDate: string; matchType: number; matchInfo: MatchInfo[] };

async function nexon<T>(path: string, key: string): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(`${API}${path}`, {
      headers: { "x-nxopen-api-key": key },
      next: { revalidate: 3600 },
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
  const result = Object.fromEntries(NICKNAMES.map((name) => [name, { matches: 0, shots: 0, onTarget: 0, goals: 0, passTry: 0, passSuccess: 0, possession: 0, routes: [0, 0, 0], goalBuckets: [0, 0, 0, 0, 0, 0], shotMap: [] as Array<{ x: number; y: number; goal: boolean }>, squad: {} as Record<string, any> }]));
  for (const match of matches) for (const info of match.matchInfo) {
    const row = result[info.nickname];
    row.matches++; row.shots += info.shoot.shootTotal || 0; row.onTarget += info.shoot.effectiveShootTotal || 0;
    row.goals += info.shoot.goalTotal || 0; row.passTry += info.pass.passTry || 0; row.passSuccess += info.pass.passSuccess || 0; row.possession += info.matchDetail.possession || 0;
    for (const shot of info.shootDetail || []) {
      const y = Math.max(0, Math.min(1, Number(shot.y || 0)));
      row.routes[y < .33 ? 0 : y < .66 ? 1 : 2]++;
      row.shotMap.push({ x: Math.max(0, Math.min(1, Number(shot.x || 0))), y, goal: Number(shot.result) === 3 });
      if (Number(shot.result) === 3) {
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

function weeklyBest(matches: Match[], names: Map<number, string>) {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const candidates = new Map<string, any>();
  for (const match of matches.filter((m) => new Date(`${m.matchDate}+09:00`) >= since)) for (const info of match.matchInfo) for (const player of info.player || []) {
    if (player.spPosition === 28 || player.status.spRating <= 0) continue;
    const key = `${info.nickname}-${player.spId}-${player.spGrade}`;
    const item = candidates.get(key) || { owner: info.nickname, spId: player.spId, name: names.get(player.spId) || `선수 ${player.spId}`, position: player.spPosition, grade: player.spGrade, appearances: 0, goals: 0, assists: 0, ratingTotal: 0 };
    item.appearances++; item.goals += player.status.goal || 0; item.assists += player.status.assist || 0; item.ratingTotal += player.status.spRating || 0; candidates.set(key, item);
  }
  const all = [...candidates.values()].map((x) => ({ ...x, rating: Math.round(x.ratingTotal / x.appearances * 100) / 100, score: x.ratingTotal / x.appearances + x.goals * .08 + x.assists * .06 }));
  const take = (test: (position: number) => boolean, count: number) => {
    const pool = all.filter((x) => test(x.position)).sort((a, b) => b.score - a.score || b.appearances - a.appearances);
    const stable = pool.filter((x) => x.appearances >= 2).slice(0, count);
    return [...stable, ...pool.filter((x) => !stable.includes(x)).slice(0, count - stable.length)];
  };
  return [...take((p) => p === 0, 1), ...take((p) => p >= 1 && p <= 8, 4), ...take((p) => p >= 9 && p <= 19, 3), ...take((p) => p >= 20 && p <= 27, 3)];
}

export async function GET() {
  const key = process.env.NEXON_API_KEY;
  if (!key) return NextResponse.json({ connected: false, reason: "NEXON_API_KEY가 설정되지 않았습니다." });

  try {
    const identities = await Promise.all(NICKNAMES.map(async (nickname) => {
      const result = await nexon<{ ouid: string }>(`/id?nickname=${encodeURIComponent(nickname)}`, key);
      return { nickname, ouid: result.ouid };
    }));
    const ouids = new Set(identities.map((x) => x.ouid));
    const matchTypes = [40];
    const playerLists = await Promise.all(identities.map(async ({ ouid }) => {
      const lists = [] as string[][];
      for (const type of matchTypes) {
        lists.push(await nexon<string[]>(`/user/match?ouid=${ouid}&matchtype=${type}&offset=0&limit=100`, key));
      }
      return [...new Set(lists.flat())];
    }));
    const counts = new Map<string, number>();
    playerLists.forEach((ids) => ids.forEach((id) => counts.set(id, (counts.get(id) || 0) + 1)));
    const ids = [...counts].filter(([, count]) => count >= 2).map(([id]) => id);
    const details: Match[] = [];
    for (let i = 0; i < ids.length; i += 5) {
      const batch = await Promise.all(ids.slice(i, i + 5).map((id) => nexon<Match>(`/match-detail?matchid=${id}`, key)));
      details.push(...batch);
    }
    const matches = details.filter((m) => new Date(`${m.matchDate}+09:00`) >= START && m.matchInfo.length === 2 && m.matchInfo.every((x) => ouids.has(x.ouid)))
      .sort((a, b) => b.matchDate.localeCompare(a.matchDate));
    const playerMeta = await fetch("https://open.api.nexon.com/static/fconline/meta/spid.json", { next: { revalidate: 86400 } }).then((r) => r.json()) as Array<{ id: number; name: string }>;
    const playerNames = new Map(playerMeta.map((player) => [player.id, player.name]));
    return NextResponse.json({
      connected: true,
      updatedAt: new Date().toISOString(),
      playerCount: NICKNAMES.length,
      matchCount: matches.length,
      standings: { excludingShootout: table(matches, false), includingShootout: table(matches, true) },
      analytics: analytics(matches, playerNames),
      weeklyBest: weeklyBest(matches, playerNames),
      matches: matches.map((m) => ({
        id: m.matchId, date: m.matchDate, type: m.matchType,
        home: m.matchInfo[0].nickname, away: m.matchInfo[1].nickname,
        homeGoals: m.matchInfo[0].shoot.goalTotal, awayGoals: m.matchInfo[1].shoot.goalTotal,
        homeShootout: m.matchInfo[0].shoot.shootOutScore || 0, awayShootout: m.matchInfo[1].shoot.shootOutScore || 0,
        homePossession: m.matchInfo[0].matchDetail.possession || 0, awayPossession: m.matchInfo[1].matchDetail.possession || 0,
        homeShots: m.matchInfo[0].shoot.shootTotal || 0, awayShots: m.matchInfo[1].shoot.shootTotal || 0,
      })),
    });
  } catch (error) {
    return NextResponse.json({ connected: false, reason: error instanceof Error ? error.message : "API 연결 실패" }, { status: 502 });
  }
}
