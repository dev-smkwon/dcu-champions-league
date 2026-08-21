import { FloatingNav } from "../../components/FloatingNav";
import { MojiriLiveClient } from "./live-client";

export const metadata = { title: "8월 모지리컵 LIVE | DCU Champions League", description: "넥슨 경기 기록으로 자동 갱신되는 모지리컵 라이브 대진표" };

export default function MojiriLivePage() {
  return <main className="mojiri-live-page"><FloatingNav/><header className="live-hero"><div><p>2026 AUGUST · REVERSE TOURNAMENT</p><h1>모지리컵 <em>LIVE</em></h1><span>경기가 끝나면 NEXON 기록을 확인해 대진표를 자동 갱신합니다.</span></div><div className="live-kickoff"><span>KICK OFF</span><strong>오늘 21:30</strong><small>한국시간 · 리그 친선경기</small></div></header><MojiriLiveClient/></main>;
}
