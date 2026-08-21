import { NextResponse } from "next/server";

export const maxDuration = 120;

const API = "https://open.api.nexon.com/fconline/v1";
const START_AT = "2026-08-21T21:30:00";
const REVEAL_AT = "2026-08-22T05:00:00+09:00";
const MEMBERS = ["대가대다님", "6w91oap5jy", "씅민쓰", "그냥강혜중", "박수환", "6년제", "따이민"];
const OPENING = [
  { id: "A", label: "A조", participants: ["대가대다님", "6w91oap5jy"] },
  { id: "B", label: "B조", participants: ["씅민쓰", "그냥강혜중"] },
  { id: "C", label: "C조", participants: ["박수환", "6년제"] },
] as const;

type MatchInfo = { nickname: string; ouid: string; matchDetail: { matchResult: string; matchEndType: number }; shoot: { goalTotal: number; shootOutScore: number } };
type NexonMatch = { matchId: string; matchDate: string; matchType: number; matchInfo: MatchInfo[] };
type LiveGame = { matchId: string; startedAt: string; home: string; away: string; homeGoals: number; awayGoals: number; homeShootout: number; awayShootout: number; specialEnd: boolean };
type LiveSeries = { id: string; label: string; bestOf: number; participants: string[]; games: LiveGame[]; score: Record<string, number>; complete: boolean; winner: string | null; advancingLoser: string | null; eligibleFrom: string | null; note?: string };

async function nexon<T>(path: string, key: string, revalidate: number | false = 45): Promise<T> {
  const response = await fetch(`${API}${path}`, { headers: { "x-nxopen-api-key": key }, ...(revalidate === false ? { cache: "force-cache" as const } : { next: { revalidate } }) });
  if (!response.ok) throw new Error(`NEXON API ${response.status}`);
  return response.json() as Promise<T>;
}

function pairKey(a: string, b: string) { return [a, b].sort().join("|"); }

function resolveSeries(id: string, label: string, participants: string[] | null, bestOf: number, matches: LiveGame[], eligibleFrom: string | null, note?: string): LiveSeries {
  if (!participants) return { id, label, bestOf, participants: [], games: [], score: {}, complete: false, winner: null, advancingLoser: null, eligibleFrom, note };
  if (!bestOf) return { id, label, bestOf, participants, games: [], score: { [participants[0]]: 0 }, complete: true, winner: null, advancingLoser: participants[0], eligibleFrom, note };
  const needed = Math.ceil(bestOf / 2);
  const score: Record<string, number> = Object.fromEntries(participants.map((name) => [name, 0]));
  const games: LiveGame[] = [];
  const candidates = matches.filter((match) => pairKey(match.home, match.away) === pairKey(participants[0], participants[1]) && (!eligibleFrom || match.startedAt > eligibleFrom)).sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  let winner: string | null = null;
  for (const game of candidates) {
    if (winner) break;
    games.push(game);
    const homeScore = game.homeGoals + (game.homeGoals === game.awayGoals ? game.homeShootout : 0);
    const awayScore = game.awayGoals + (game.homeGoals === game.awayGoals ? game.awayShootout : 0);
    if (homeScore > awayScore) score[game.home]++;
    if (awayScore > homeScore) score[game.away]++;
    winner = participants.find((name) => score[name] >= needed) || null;
  }
  return { id, label, bestOf, participants, games, score, complete: !!winner, winner, advancingLoser: winner ? participants.find((name) => name !== winner) || null : null, eligibleFrom, note };
}

function resolvePreviewSeries(id: string, label: string, participants: string[] | null, bestOf: number, matches: LiveGame[], note?: string): LiveSeries {
  if (!participants) return resolveSeries(id, label, null, bestOf, matches, null, note);
  if (!bestOf) return resolveSeries(id, label, participants, bestOf, matches, null, note);
  const needed = Math.ceil(bestOf / 2);
  const score: Record<string, number> = Object.fromEntries(participants.map((name) => [name, 0]));
  const games: LiveGame[] = [];
  const candidates = matches.filter((match) => pairKey(match.home, match.away) === pairKey(participants[0], participants[1])).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  for (const game of candidates) {
    games.push(game);
    const homeScore = game.homeGoals + (game.homeGoals === game.awayGoals ? game.homeShootout : 0);
    const awayScore = game.awayGoals + (game.homeGoals === game.awayGoals ? game.awayShootout : 0);
    if (homeScore > awayScore) score[game.home]++;
    if (awayScore > homeScore) score[game.away]++;
    if (Object.values(score).some((value) => value >= needed)) break;
  }
  games.reverse();
  const winner = participants.find((name) => score[name] >= needed) || null;
  return { id, label, bestOf, participants, games, score, complete: !!winner, winner, advancingLoser: winner ? participants.find((name) => name !== winner) || null : null, eligibleFrom: null, note };
}

const finishedAt = (series: LiveSeries) => series.complete && series.games.length ? series.games.at(-1)!.startedAt : null;

export async function GET(request: Request) {
  if (Date.now() < new Date(REVEAL_AT).getTime()) return NextResponse.json({ connected: true, locked: true, updatedAt: new Date().toISOString(), startsAt: `${START_AT}+09:00`, revealAt: REVEAL_AT, status: "scheduled", matchedGames: 0, mojiri: null }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } });
  const key = process.env.NEXON_API_KEY;
  if (!key) return NextResponse.json({ connected: false, reason: "NEXON_API_KEY가 설정되지 않았습니다." }, { status: 503 });
  try {
    const identities = await Promise.all(MEMBERS.map(async (nickname) => ({ nickname, ...(await nexon<{ ouid: string }>(`/id?nickname=${encodeURIComponent(nickname)}`, key, 86400)) })));
    const preview = new URL(request.url).searchParams.get("preview") === "1";
    const lists = await Promise.all(identities.map(({ ouid }) => nexon<string[]>(`/user/match?ouid=${ouid}&matchtype=40&offset=0&limit=${preview ? 100 : 50}`, key)));
    const counts = new Map<string, number>();
    lists.forEach((ids) => ids.forEach((id) => counts.set(id, (counts.get(id) || 0) + 1)));
    const ids = [...counts].filter(([, count]) => count >= 2).map(([id]) => id);
    const details: NexonMatch[] = [];
    for (let index = 0; index < ids.length; index += 8) details.push(...await Promise.all(ids.slice(index, index + 8).map((id) => nexon<NexonMatch>(`/match-detail?matchid=${id}`, key, false))));
    const memberSet = new Set(MEMBERS);
    const matches: LiveGame[] = details.filter((match) => (preview || match.matchDate >= START_AT) && match.matchInfo.length === 2 && match.matchInfo.every((info) => memberSet.has(info.nickname))).map((match) => ({
      matchId: match.matchId, startedAt: match.matchDate, home: match.matchInfo[0].nickname, away: match.matchInfo[1].nickname,
      homeGoals: Number(match.matchInfo[0].shoot.goalTotal || 0), awayGoals: Number(match.matchInfo[1].shoot.goalTotal || 0),
      homeShootout: Number(match.matchInfo[0].shoot.shootOutScore || 0), awayShootout: Number(match.matchInfo[1].shoot.shootOutScore || 0),
      specialEnd: Number(match.matchInfo[0].matchDetail.matchEndType || 0) !== 0,
    })).sort((a, b) => a.startedAt.localeCompare(b.startedAt));

    if (preview) {
      const opening = OPENING.map((series) => resolvePreviewSeries(series.id, series.label, [...series.participants], 3, matches));
      opening.push(resolvePreviewSeries("D", "D조", ["따이민"], 0, matches, "부전패 · 패자 준결승 자동 진출"));
      const semifinal = [
        resolvePreviewSeries("AB", "A·B조 패자전", opening[0].complete && opening[1].complete ? [opening[0].advancingLoser!, opening[1].advancingLoser!] : null, 3, matches),
        resolvePreviewSeries("CD", "C·D조 패자전", opening[2].complete ? [opening[2].advancingLoser!, "따이민"] : null, 3, matches),
      ];
      const final = resolvePreviewSeries("FINAL", "최종 모지리 결정전", semifinal.every((series) => series.complete) ? [semifinal[0].advancingLoser!, semifinal[1].advancingLoser!] : null, 5, matches);
      return NextResponse.json({ connected: true, preview: true, updatedAt: new Date().toISOString(), startsAt: `${START_AT}+09:00`, status: final.complete ? "complete" : "live", rounds: { opening, semifinal, final }, matchedGames: [...new Set([...opening, ...semifinal, final].flatMap((series) => series.games.map((game) => game.matchId)))].length, mojiri: final.advancingLoser }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
    }

    const opening = OPENING.map((series) => resolveSeries(series.id, series.label, [...series.participants], 3, matches, START_AT));
    opening.push(resolveSeries("D", "D조", ["따이민"], 0, matches, START_AT, "부전패 · 패자 준결승 자동 진출"));
    const abStart = opening[0].complete && opening[1].complete ? [finishedAt(opening[0]), finishedAt(opening[1])].sort().at(-1)! : null;
    const cdStart = opening[2].complete ? finishedAt(opening[2]) : null;
    const semifinal = [
      resolveSeries("AB", "A·B조 패자전", abStart ? [opening[0].advancingLoser!, opening[1].advancingLoser!] : null, 3, matches, abStart),
      resolveSeries("CD", "C·D조 패자전", cdStart ? [opening[2].advancingLoser!, "따이민"] : null, 3, matches, cdStart),
    ];
    const finalStart = semifinal.every((series) => series.complete) ? semifinal.map(finishedAt).sort().at(-1)! : null;
    const final = resolveSeries("FINAL", "최종 모지리 결정전", finalStart ? [semifinal[0].advancingLoser!, semifinal[1].advancingLoser!] : null, 5, matches, finalStart);
    return NextResponse.json({ connected: true, updatedAt: new Date().toISOString(), startsAt: `${START_AT}+09:00`, status: Date.now() < new Date(`${START_AT}+09:00`).getTime() ? "scheduled" : final.complete ? "complete" : "live", rounds: { opening, semifinal, final }, matchedGames: [...new Set([...opening, ...semifinal, final].flatMap((series) => series.games.map((game) => game.matchId)))].length, mojiri: final.advancingLoser }, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } });
  } catch (error) {
    return NextResponse.json({ connected: false, reason: error instanceof Error ? error.message : "라이브 경기 조회 실패" }, { status: 502 });
  }
}
