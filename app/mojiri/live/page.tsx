import { FloatingNav } from "../../components/FloatingNav";
import { MojiriLiveClient } from "./live-client";

export const metadata = { title: "8월 모지리컵 LIVE | DCU Champions League", description: "넥슨 경기 기록으로 자동 갱신되는 모지리컵 라이브 대진표" };

export default function MojiriLivePage() {
  return <main className="mojiri-live-page"><FloatingNav/><header className="live-hero"><div><p>2026 AUGUST · REVERSE TOURNAMENT</p><h1>모지리컵 <em>결과 공개</em></h1><span>확정 대진과 경기 시간을 기준으로 NEXON 기록을 자동 판정합니다.</span></div><div className="live-kickoff"><span>RESULT OPEN</span><strong>내일 09:00</strong><small>8월 22일 · 한국시간</small></div></header><MojiriLiveClient/></main>;
}
