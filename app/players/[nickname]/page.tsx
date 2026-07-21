import { PlayerDetail } from "./player-detail";

export default async function PlayerPage({ params }: { params: Promise<{ nickname: string }> }) {
  const { nickname } = await params;
  return <PlayerDetail nickname={decodeURIComponent(nickname)} />;
}
