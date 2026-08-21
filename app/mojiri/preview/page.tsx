import { FloatingNav } from "../../components/FloatingNav";
import { MojiriLiveClient } from "../live/live-client";

export default function MojiriPreviewPage() {
  return <main className="mojiri-live-page preview-mode"><FloatingNav/><header className="live-hero"><div><p>PAST MATCH SIMULATION · AUGUST PREVIEW</p><h1>모지리컵 <em>가상 결과</em></h1><span>확정 대진에 과거 맞대결을 끼워 넣어, 완성된 대회 화면을 미리 봅니다.</span></div><div className="live-kickoff"><span>PREVIEW ONLY</span><strong>실제 결과 아님</strong><small>최근 친선경기 기반 임시 판정</small></div></header><MojiriLiveClient preview/></main>;
}
