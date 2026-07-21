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

function analytics(matches: Match[]) {
  const result = Object.fromEntries(NICKNAMES.map((name) => [name, { matches: 0, shots: 0, onTarget: 0, goals: 0, passTry: 0, passSuccess: 0, possession: 0, routes: [0, 0, 0], goalBuckets: [0, 0, 0, 0, 0, 0], shotMap: [] as Array<{ x: number; y: number; goal: boolean }> }]));
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
  }
  return result;
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
    return NextResponse.json({
      connected: true,
      updatedAt: new Date().toISOString(),
      playerCount: NICKNAMES.length,
      matchCount: matches.length,
      standings: { excludingShootout: table(matches, false), includingShootout: table(matches, true) },
      analytics: analytics(matches),
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
