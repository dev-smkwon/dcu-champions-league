"use client";

import { useEffect, useMemo, useState } from "react";
import { FloatingNav } from "../components/FloatingNav";
import { LoadingState } from "../components/LoadingState";
import { useTriSort } from "../hooks/useTriSort";

type Pick = { owner: string; spId: number; name: string; position: number; grade: number; appearances: number; goals: number; assists: number; shots: number; effectiveShots: number; passTry: number; passSuccess: number; tackles: number; interceptions: number; blocks: number; defending: number; aerials: number; rating: number; score: number; goalsPerGame: number; assistsPerGame: number; goalConversion: number; effectiveShotRate: number; defensiveActionsPerGame: number; passAccuracy: number };
const positionLabels: Record<number, string> = { 0: "GK", 1: "SW", 2: "RWB", 3: "RB", 4: "RCB", 5: "CB", 6: "LCB", 7: "LB", 8: "LWB", 9: "RDM", 10: "CDM", 11: "LDM", 12: "RM", 13: "RCM", 14: "CM", 15: "LCM", 16: "LM", 17: "RAM", 18: "CAM", 19: "LAM", 20: "RF", 21: "CF", 22: "LF", 23: "RW", 24: "RS", 25: "ST", 26: "LS", 27: "LW" };
const pickKey = (pick: Pick) => `${pick.owner}-${pick.spId}-${pick.grade}`;
const pct = (value: number) => `${Math.round(value * 100)}%`;
type PlayerRow = Pick & { positionName: string };
const playerColumns: Array<[keyof PlayerRow, string]> = [["name","선수"],["owner","유저"],["positionName","포지션"],["appearances","출장"],["goals","골"],["assists","도움"],["shots","슈팅"],["effectiveShots","유효"],["rating","평점"],["passAccuracy","패스"],["tackles","태클"],["interceptions","가로채기"],["score","점수"]];
const playerValue = (pick: PlayerRow, key: keyof PlayerRow) => key === "rating" || key === "score" ? Number(pick[key]).toFixed(2) : key === "passAccuracy" ? pct(pick.passAccuracy) : String(pick[key]);

export default function BestElevenPage() {
  const [data, setData] = useState<{ weeklyBest: Pick[]; seasonBest: Pick[]; weeklyPlayers: Pick[]; seasonPlayers: Pick[] } | null>(null);
  const [period, setPeriod] = useState<"weekly" | "season">("weekly");
  const [selected, setSelected] = useState("");
  useEffect(() => { fetch("/api/league").then((r) => r.json()).then((value) => { setData(value); const list = value.weeklyBest || []; if (list[0]) setSelected(pickKey(list[0])); }); }, []);
  const picks = data ? (period === "weekly" ? data.weeklyBest || [] : data.seasonBest || []) : null;
  const allPlayers = data ? (period === "weekly" ? data.weeklyPlayers || [] : data.seasonPlayers || []) : [];
  const rosterTable = useTriSort<PlayerRow>(allPlayers.map((pick) => ({ ...pick, positionName: positionLabels[pick.position] || "-" })));
  const selectedPick = useMemo(() => allPlayers.find((pick) => pickKey(pick) === selected) || picks?.[0] || allPlayers[0], [allPlayers, picks, selected]);
  const changePeriod = (next: "weekly" | "season") => { setPeriod(next); const list = next === "weekly" ? data?.weeklyBest : data?.seasonBest; if (list?.[0]) setSelected(pickKey(list[0])); };

  return <main className="subpage"><FloatingNav />
    <header className="subhero best-header"><div><p>{period === "weekly" ? "WEEKLY SELECTION" : "SEASON SELECTION"}</p><h1>{period === "weekly" ? "주간 베스트 XI" : "시즌 베스트 XI"}</h1><span>{period === "weekly" ? "최근 7일 · 4-3-3 · 5경기 이상 출전" : "API 제공 전체 기간 · 4-3-3 · 10경기 이상 출전"}</span></div><div className="best-actions"><div className="period-switch"><button className={period === "weekly" ? "active" : ""} onClick={() => changePeriod("weekly")}>주간</button><button className={period === "season" ? "active" : ""} onClick={() => changePeriod("season")}>시즌 누적</button></div><div className="criteria-help" tabIndex={0} aria-label="베스트 일레븐 선정 기준">?<aside><b>선정 기준</b><p>주간은 5경기, 시즌 누적은 10경기 이상 출전한 카드만 후보가 됩니다. 평균 평점과 경기당 생산성을 중심으로 계산해 단순 누적 출장 횟수의 영향을 줄였습니다.</p><small>대상: 리그 멤버 간 친선경기</small></aside></div></div></header>
    <section className="page-shell">{!picks ? <LoadingState /> : picks.length === 0 ? <div className="empty-state">포지션별 5경기 이상 출전한 후보가 아직 없습니다.</div> : <>
      <div className="best-layout"><div className="best-pitch"><div className="best-box top"/><div className="best-box bottom"/><div className="best-mid"/><div className="best-circle"/>{picks.map((pick, index) => <button type="button" onClick={() => setSelected(pickKey(pick))} className={`best-card slot-${index} ${selected === pickKey(pick) ? "selected" : ""}`} key={pickKey(pick)}>
        <span>{positionLabels[pick.position] || "-"}</span><strong>{pick.rating.toFixed(1)}</strong><b>{pick.name}</b><small>{pick.owner} · +{pick.grade}</small><em>{pick.appearances}경기 · {pick.goals}골 {pick.assists}도움</em>
      </button>)}</div>
      <aside className="best-roster"><div className="best-roster-head"><div><p>PLAYER DATABASE</p><h2>전체 선수 기록</h2></div><span>1경기 이상 · {allPlayers.length}명</span></div>
        {selectedPick && <div className="best-player-detail"><div><i>{positionLabels[selectedPick.position]}</i><strong>{selectedPick.name}<small>{selectedPick.owner} · +{selectedPick.grade} · {selectedPick.appearances}경기</small></strong><b>{selectedPick.rating.toFixed(2)}<small>평균 평점</small></b></div><dl>
          <div><dt>득점 / 도움</dt><dd>{selectedPick.goals} / {selectedPick.assists}</dd></div><div><dt>경기당 G / A</dt><dd>{selectedPick.goalsPerGame.toFixed(2)} / {selectedPick.assistsPerGame.toFixed(2)}</dd></div>
          <div><dt>슈팅 / 유효</dt><dd>{selectedPick.shots} / {selectedPick.effectiveShots}</dd></div><div><dt>골 전환율</dt><dd>{pct(selectedPick.goalConversion)}</dd></div>
          <div><dt>유효 슈팅률</dt><dd>{pct(selectedPick.effectiveShotRate)}</dd></div><div><dt>패스 성공</dt><dd>{selectedPick.passSuccess}/{selectedPick.passTry} · {pct(selectedPick.passAccuracy)}</dd></div>
          <div><dt>태클 / 가로채기</dt><dd>{selectedPick.tackles} / {selectedPick.interceptions}</dd></div><div><dt>블록 / 수비</dt><dd>{selectedPick.blocks} / {selectedPick.defending}</dd></div>
          <div><dt>공중볼 성공</dt><dd>{selectedPick.aerials}</dd></div><div><dt>선정 점수</dt><dd>{selectedPick.score.toFixed(2)}</dd></div>
        </dl></div>}
        <div className="best-table-scroll player-db"><div className="best-table-head">{playerColumns.map(([key,label]) => <button className="sort-head" key={key} onClick={() => rosterTable.toggle(key)}>{label}<i>{rosterTable.indicator(key)}</i></button>)}</div>{rosterTable.rows.map((pick) => <button type="button" onClick={() => setSelected(pickKey(pick))} className={selected === pickKey(pick) ? "selected" : ""} key={pickKey(pick)}>{playerColumns.map(([key]) => key === "name" ? <strong key={key}>{pick.name}<small>+{pick.grade}</small></strong> : key === "positionName" ? <i key={key}>{pick.positionName}</i> : <span className={key === "rating" || key === "score" ? "accent" : ""} key={key}>{playerValue(pick, key)}</span>)}</button>)}</div></aside></div>
      <div className="best-note"><b>선정 산식 안내</b><p>평균 평점을 기반으로 경기당 골·도움, 골 전환율, 유효 슈팅률, 패스 성공률을 더합니다. 수비수와 골키퍼는 경기당 수비 행동의 비중이 더 큽니다. 출장 횟수는 누적 가산점이 아니라 후보 자격과 작은 신뢰도 보정에만 사용합니다.</p></div>
    </>}</section>
  </main>;
}
