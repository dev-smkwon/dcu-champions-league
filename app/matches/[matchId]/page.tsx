import { MatchDetail } from "./match-detail";

export default async function MatchPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  return <MatchDetail matchId={matchId} />;
}
