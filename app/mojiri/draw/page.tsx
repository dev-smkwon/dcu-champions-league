import Link from "next/link";
import { FloatingNav } from "../../components/FloatingNav";
import { DrawClient } from "./draw-client";

export default function MojiriDrawPage() {
  return <main className="subpage mojiri-draw-page"><FloatingNav/><header className="draw-hero"><div><p>ONE NIGHT · ONE DRAW · ONE MOJIRI</p><h1>모지리컵<br/><em>조 추첨식</em></h1><span>공을 고르고, 이름을 공개하고, 운명을 확정하세요.</span></div><Link href="/mojiri">지난 대회 보기 →</Link></header><DrawClient/></main>;
}
