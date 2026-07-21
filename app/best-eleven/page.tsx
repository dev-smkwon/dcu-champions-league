"use client";

import { useEffect, useMemo, useState } from "react";
import { FloatingNav } from "../components/FloatingNav";
import { LoadingState } from "../components/LoadingState";

type Pick = { owner: string; spId: number; name: string; position: number; grade: number; appearances: number; goals: number; assists: number; shots: number; effectiveShots: number; passTry: number; passSuccess: number; tackles: number; interceptions: number; blocks: number; defending: number; aerials: number; rating: number; score: number; goalsPerGame: number; assistsPerGame: number; goalConversion: number; effectiveShotRate: number; defensiveActionsPerGame: number; passAccuracy: number };
const positionLabels: Record<number, string> = { 0: "GK", 1: "SW", 2: "RWB", 3: "RB", 4: "RCB", 5: "CB", 6: "LCB", 7: "LB", 8: "LWB", 9: "RDM", 10: "CDM", 11: "LDM", 12: "RM", 13: "RCM", 14: "CM", 15: "LCM", 16: "LM", 17: "RAM", 18: "CAM", 19: "LAM", 20: "RF", 21: "CF", 22: "LF", 23: "RW", 24: "RS", 25: "ST", 26: "LS", 27: "LW" };
const pickKey = (pick: Pick) => `${pick.owner}-${pick.spId}-${pick.grade}`;
const pct = (value: number) => `${Math.round(value * 100)}%`;

export default function BestElevenPage() {
  const [picks, setPicks] = useState<Pick[] | null>(null);
  const [selected, setSelected] = useState("");
  useEffect(() => { fetch("/api/league").then((r) => r.json()).then((data) => { const list = data.weeklyBest || []; setPicks(list); if (list[0]) setSelected(pickKey(list[0])); }); }, []);
  const selectedPick = useMemo(() => picks?.find((pick) => pickKey(pick) === selected) || picks?.[0], [picks, selected]);

  return <main className="subpage"><FloatingNav />
    <header className="subhero best-header"><div><p>WEEKLY SELECTION</p><h1>주간 베스트 XI</h1><span>최근 7일 리그 내부 친선경기 · 4-3-3 · 5경기 이상 출전</span></div><div className="criteria-help" tabIndex={0} aria-label="베스트 일레븐 선정 기준">?<aside><b>선정 기준</b><p>5경기 이상 출전한 카드만 후보가 됩니다. 누적 기록 대신 평균 평점, 경기당 골·도움, 골 전환율, 유효 슈팅률, 경기당 수비 행동과 패스 성공률을 조합합니다. 출전 수는 신뢰도 보정에만 작게 반영해 많이 뛴 것만으로 유리해지지 않습니다.</p><small>대상: 최근 7일 리그 멤버 간 친선경기</small></aside></div></header>
    <section className="page-shell">{!picks ? <LoadingState /> : picks.length === 0 ? <div className="empty-state">포지션별 5경기 이상 출전한 후보가 아직 없습니다.</div> : <>
      <div className="best-layout"><div className="best-pitch"><div className="best-box top"/><div className="best-box bottom"/><div className="best-mid"/><div className="best-circle"/>{picks.map((pick, index) => <button type="button" onClick={() => setSelected(pickKey(pick))} className={`best-card slot-${index} ${selected === pickKey(pick) ? "selected" : ""}`} key={pickKey(pick)}>
        <span>{positionLabels[pick.position] || "-"}</span><strong>{pick.rating.toFixed(1)}</strong><b>{pick.name}</b><small>{pick.owner} · +{pick.grade}</small><em>{pick.appearances}경기 · {pick.goals}골 {pick.assists}도움</em>
      </button>)}</div>
      <aside className="best-roster"><div className="best-roster-head"><div><p>SELECTED XI</p><h2>선수별 기록</h2></div><span>카드를 눌러 상세 확인</span></div>
        {selectedPick && <div className="best-player-detail"><div><i>{positionLabels[selectedPick.position]}</i><strong>{selectedPick.name}<small>{selectedPick.owner} · +{selectedPick.grade} · {selectedPick.appearances}경기</small></strong><b>{selectedPick.rating.toFixed(2)}<small>평균 평점</small></b></div><dl>
          <div><dt>득점 / 도움</dt><dd>{selectedPick.goals} / {selectedPick.assists}</dd></div><div><dt>경기당 G / A</dt><dd>{selectedPick.goalsPerGame.toFixed(2)} / {selectedPick.assistsPerGame.toFixed(2)}</dd></div>
          <div><dt>슈팅 / 유효</dt><dd>{selectedPick.shots} / {selectedPick.effectiveShots}</dd></div><div><dt>골 전환율</dt><dd>{pct(selectedPick.goalConversion)}</dd></div>
          <div><dt>유효 슈팅률</dt><dd>{pct(selectedPick.effectiveShotRate)}</dd></div><div><dt>패스 성공</dt><dd>{selectedPick.passSuccess}/{selectedPick.passTry} · {pct(selectedPick.passAccuracy)}</dd></div>
          <div><dt>태클 / 가로채기</dt><dd>{selectedPick.tackles} / {selectedPick.interceptions}</dd></div><div><dt>블록 / 수비</dt><dd>{selectedPick.blocks} / {selectedPick.defending}</dd></div>
          <div><dt>공중볼 성공</dt><dd>{selectedPick.aerials}</dd></div><div><dt>선정 점수</dt><dd>{selectedPick.score.toFixed(2)}</dd></div>
        </dl></div>}
        <div className="best-table-head"><span>선수</span><span>출장</span><span>평점</span><span>경기당 G+A</span><span>결정력</span></div>{picks.map((pick) => <button type="button" onClick={() => setSelected(pickKey(pick))} className={selected === pickKey(pick) ? "selected" : ""} key={pickKey(pick)}><i>{positionLabels[pick.position]}</i><strong>{pick.name}<small>{pick.owner} · +{pick.grade}</small></strong><span>{pick.appearances}</span><b>{pick.rating.toFixed(1)}</b><span>{(pick.goalsPerGame + pick.assistsPerGame).toFixed(2)}</span><span>{pct(pick.goalConversion)}</span></button>)}</aside></div>
      <div className="best-note"><b>선정 산식 안내</b><p>평균 평점 55%를 기반으로 경기당 골·도움, 골 전환율, 유효 슈팅률, 패스 성공률을 더합니다. 수비수와 골키퍼는 경기당 태클·가로채기·블록·수비 기록의 비중이 더 큽니다. 출장 횟수는 누적 가산점이 아니라 5경기 자격 조건과 최대 10경기까지의 작은 신뢰도 보정에만 사용합니다.</p></div>
    </>}</section>
  </main>;
}
