"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FloatingNav } from "../components/FloatingNav";
import { LoadingState } from "../components/LoadingState";

type Pick = { owner: string; spId: number; name: string; position: number; grade: number; appearances: number; goals: number; assists: number; rating: number };

const positionLabels: Record<number, string> = { 0: "GK", 1: "SW", 2: "RWB", 3: "RB", 4: "RCB", 5: "CB", 6: "LCB", 7: "LB", 8: "LWB", 9: "RDM", 10: "CDM", 11: "LDM", 12: "RM", 13: "RCM", 14: "CM", 15: "LCM", 16: "LM", 17: "RAM", 18: "CAM", 19: "LAM", 20: "RF", 21: "CF", 22: "LF", 23: "RW", 24: "RS", 25: "ST", 26: "LS", 27: "LW" };

export default function BestElevenPage() {
  const [picks, setPicks] = useState<Pick[] | null>(null);
  useEffect(() => { fetch("/api/league").then((r) => r.json()).then((data) => setPicks(data.weeklyBest || [])); }, []);
  return <main className="subpage"><FloatingNav />
    <header className="subhero"><p>WEEKLY SELECTION</p><h1>주간 베스트 XI</h1><span>최근 7일 리그 내부 친선경기 · 4-3-3 · 평균 평점 우선</span></header>
    <section className="page-shell">{!picks ? <LoadingState /> : <>
      <div className="best-pitch"><div className="best-box top"/><div className="best-box bottom"/><div className="best-mid"/><div className="best-circle"/>{picks.map((pick, index) => <Link href={`/players/${encodeURIComponent(pick.owner)}`} className={`best-card slot-${index}`} key={`${pick.owner}-${pick.spId}-${pick.grade}`}>
        <span>{positionLabels[pick.position] || "-"}</span><strong>{pick.rating.toFixed(1)}</strong><b>{pick.name}</b><small>{pick.owner} · +{pick.grade}</small><em>{pick.appearances}경기 · {pick.goals}골 {pick.assists}도움</em>
      </Link>)}</div>
      <div className="best-note"><b>선정 방식</b><p>최근 7일간 리그 멤버끼리 치른 친선경기만 사용합니다. 포지션별 평균 평점을 중심으로 골과 도움을 보조 점수로 반영하며, 2경기 이상 출전한 카드를 우선합니다. 같은 실제 선수라도 소유 유저와 강화 등급이 다르면 별도 후보로 계산합니다.</p></div>
    </>}</section>
  </main>;
}
