"use client";

import { useEffect, useState } from "react";
import { FloatingNav } from "../components/FloatingNav";
import { LoadingState } from "../components/LoadingState";

type Pick = { owner: string; spId: number; name: string; position: number; grade: number; appearances: number; goals: number; assists: number; shots: number; effectiveShots: number; passTry: number; passSuccess: number; tackles: number; interceptions: number; blocks: number; defending: number; aerials: number; rating: number };
const positionLabels: Record<number, string> = { 0: "GK", 1: "SW", 2: "RWB", 3: "RB", 4: "RCB", 5: "CB", 6: "LCB", 7: "LB", 8: "LWB", 9: "RDM", 10: "CDM", 11: "LDM", 12: "RM", 13: "RCM", 14: "CM", 15: "LCM", 16: "LM", 17: "RAM", 18: "CAM", 19: "LAM", 20: "RF", 21: "CF", 22: "LF", 23: "RW", 24: "RS", 25: "ST", 26: "LS", 27: "LW" };
const pickKey = (pick: Pick) => `${pick.owner}-${pick.spId}-${pick.grade}`;

export default function BestElevenPage() {
  const [picks, setPicks] = useState<Pick[] | null>(null);
  const [selected, setSelected] = useState("");
  useEffect(() => { fetch("/api/league").then((r) => r.json()).then((data) => { const list = data.weeklyBest || []; setPicks(list); if (list[0]) setSelected(pickKey(list[0])); }); }, []);
  return <main className="subpage"><FloatingNav />
    <header className="subhero best-header"><div><p>WEEKLY SELECTION</p><h1>주간 베스트 XI</h1><span>최근 7일 리그 내부 친선경기 · 4-3-3 · 평균 평점 우선</span></div><div className="criteria-help" tabIndex={0} aria-label="베스트 일레븐 선정 기준">?<aside><b>선정 기준</b><p>포지션별 평균 평점을 중심으로 골과 도움을 보조 점수로 반영합니다. 2경기 이상 출전한 카드를 우선하며, 후보가 부족할 때만 1경기 출전 카드를 사용합니다. 같은 선수도 소유 유저·강화 등급이 다르면 별도 후보입니다.</p><small>대상: 최근 7일 리그 멤버 간 친선경기</small></aside></div></header>
    <section className="page-shell">{!picks ? <LoadingState /> : <>
      <div className="best-layout"><div className="best-pitch"><div className="best-box top"/><div className="best-box bottom"/><div className="best-mid"/><div className="best-circle"/>{picks.map((pick, index) => <button type="button" onClick={() => setSelected(pickKey(pick))} className={`best-card slot-${index} ${selected === pickKey(pick) ? "selected" : ""}`} key={pickKey(pick)}>
        <span>{positionLabels[pick.position] || "-"}</span><strong>{pick.rating.toFixed(1)}</strong><b>{pick.name}</b><small>{pick.owner} · +{pick.grade}</small><em>{pick.appearances}경기 · {pick.goals}골 {pick.assists}도움</em>
      </button>)}</div>
      <aside className="best-roster"><div className="best-roster-head"><div><p>SELECTED XI</p><h2>선수별 기록</h2></div><span>카드를 눌러 강조</span></div><div className="best-table-head"><span>선수</span><span>평점</span><span>G/A</span><span>수비</span></div>{picks.map((pick) => <button type="button" onClick={() => setSelected(pickKey(pick))} className={selected === pickKey(pick) ? "selected" : ""} key={pickKey(pick)}><i>{positionLabels[pick.position]}</i><strong>{pick.name}<small>{pick.owner} · +{pick.grade} · {pick.appearances}경기</small></strong><b>{pick.rating.toFixed(1)}</b><span>{pick.goals}/{pick.assists}</span><span>{pick.tackles + pick.interceptions + pick.blocks}</span><em><small>슈팅 {pick.effectiveShots}/{pick.shots}</small><small>패스 {Math.round(pick.passSuccess / Math.max(1, pick.passTry) * 100)}%</small>{pick.position === 0 && <small>수비·선방 {pick.defending + pick.blocks}</small>}</em></button>)}</aside></div>
      <div className="best-note"><b>표시 데이터 안내</b><p>득점, 도움, 평점, 슈팅, 패스, 태클, 가로채기, 블록과 수비 기록은 FC Online 매치 상세 데이터에서 집계합니다. API가 직접 제공하지 않는 실책 수치는 표시하지 않습니다. 골키퍼의 ‘수비·선방’은 제공되는 defending와 block 기록의 합계이며 게임 화면의 선방 표기와 완전히 동일하지 않을 수 있습니다.</p></div>
    </>}</section>
  </main>;
}
