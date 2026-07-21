import { NextResponse } from "next/server";

const MEMBERS = new Set(["씅민쓰", "6년제", "따이민", "그냥강혜중", "대가대다님", "박수환", "빅수환", "6w91oap5jy"]);
const START = new Date("2026-07-01T00:00:00+09:00");

export async function GET(_request: Request, context: { params: Promise<{ matchId: string }> }) {
  const key = process.env.NEXON_API_KEY;
  if (!key) return NextResponse.json({ error: "API 키가 없습니다." }, { status: 503 });
  const { matchId } = await context.params;
  const response = await fetch(`https://open.api.nexon.com/fconline/v1/match-detail?matchid=${encodeURIComponent(matchId)}`, {
    headers: { "x-nxopen-api-key": key }, next: { revalidate: 3600 },
  });
  if (!response.ok) return NextResponse.json({ error: `NEXON API ${response.status}` }, { status: response.status });
  const match = await response.json();
  const allowed = match.matchType === 40 && new Date(`${match.matchDate}+09:00`) >= START && match.matchInfo?.length === 2 && match.matchInfo.every((player: { nickname: string }) => MEMBERS.has(player.nickname));
  if (!allowed) return NextResponse.json({ error: "리그 내부 친선경기가 아닙니다." }, { status: 404 });
  const playerMeta = await fetch("https://open.api.nexon.com/static/fconline/meta/spid.json", { next: { revalidate: 86400 } }).then((r) => r.json()) as Array<{ id: number; name: string }>;
  const playerNames = new Map(playerMeta.map((player) => [player.id, player.name]));
  for (const side of match.matchInfo) for (const shot of side.shootDetail || []) {
    shot.playerName = playerNames.get(shot.spId) || `선수 ${shot.spId}`;
    shot.assistPlayerName = shot.assist && shot.assistSpId > 0 ? playerNames.get(shot.assistSpId) || `선수 ${shot.assistSpId}` : null;
  }
  return NextResponse.json(match);
}
