import { FloatingNav } from "../../../components/FloatingNav";
import { verifySignedPayload } from "../../../../lib/mojiri-draw";
import { ResultClient } from "./result-client";

export default async function MojiriDrawResultPage({ searchParams }: { searchParams: Promise<{ data?: string; signature?: string }> }) {
  const query = await searchParams; const result = query.data && query.signature ? verifySignedPayload(query.data, query.signature) : { verified: false as const, payload: null };
  if (!result.verified || !result.payload) return <main className="subpage invalid-draw-page"><FloatingNav/><section><i>!</i><h1>검증할 수 없는 추첨 결과입니다.</h1><p>주소가 일부 누락되었거나 결과 데이터가 변경되었습니다.</p><a href="/mojiri/draw">새 추첨 시작</a></section></main>;
  return <><FloatingNav/><ResultClient payload={result.payload}/></>;
}
