"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FloatingNav } from "../../components/FloatingNav";
import { LoadingState } from "../../components/LoadingState";

const shotTypes: Record<number, string> = { 1: "일반 슛", 2: "감아차기", 3: "헤더", 4: "로빙 슛", 5: "발리 슛", 6: "프리킥", 7: "페널티킥", 8: "강력한 슛" };
const shotResults: Record<number, string> = { 1: "빗나감", 2: "유효 슈팅", 3: "골" };
function matchMinute(value: number) {
  const block = 2 ** 24;
  const period = Math.floor(value / block);
  const offsets = [0, 45 * 60, 90 * 60, 105 * 60, 120 * 60];
  const seconds = value - period * block + (offsets[period] || 0);
  return `${Math.floor(seconds / 60) + 1}'`;
}
function goalDirection(y: number) {
  return y < .38 ? "골문 위쪽" : y > .62 ? "골문 아래쪽" : "골문 중앙";
}

export function MatchDetail({ matchId }: { matchId: string }) {
  const [match, setMatch] = useState<any>(null);
  const [error, setError] = useState("");
  useEffect(() => { fetch(`/api/matches/${matchId}`).then(async (r) => { const value = await r.json(); if (!r.ok) throw new Error(value.error); return value; }).then(setMatch).catch((e) => setError(e.message)); }, [matchId]);
  if (error) return <main className="subpage"><FloatingNav /><div className="empty-state">{error}</div></main>;
  if (!match) return <main className="subpage"><FloatingNav /><LoadingState label="경기 상세 기록을 불러오는 중" /></main>;
  const [home, away] = match.matchInfo;
  const metrics = [
    ["점유율", home.matchDetail.possession, away.matchDetail.possession, "%"],
    ["전체 슈팅", home.shoot.shootTotal, away.shoot.shootTotal, ""],
    ["유효 슈팅", home.shoot.effectiveShootTotal, away.shoot.effectiveShootTotal, ""],
    ["패스 성공", home.pass.passSuccess, away.pass.passSuccess, ""],
    ["코너킥", home.matchDetail.cornerKick, away.matchDetail.cornerKick, ""],
    ["파울", home.matchDetail.foul, away.matchDetail.foul, ""],
  ];
  const goals = [home, away].flatMap((side: any) => (side.shootDetail || []).filter((shot: any) => Number(shot.result) === 3).map((shot: any) => ({ ...shot, owner: side.nickname }))).sort((a: any, b: any) => a.goalTime - b.goalTime);
  return <main className="subpage"><FloatingNav />
    <header className="match-hero"><p>{new Date(`${match.matchDate}+09:00`).toLocaleString("ko-KR")}</p><div><Link href={`/players/${encodeURIComponent(home.nickname)}`}>{home.nickname}</Link><strong>{home.shoot.goalTotal}<span>–</span>{away.shoot.goalTotal}</strong><Link href={`/players/${encodeURIComponent(away.nickname)}`}>{away.nickname}</Link></div><small>리그 친선경기 · 승부차기 제외 기준</small></header>
    <section className="page-shell detail-grid">
      <article className="clean-card span-two"><div className="card-heading"><div><p>MATCH STATS</p><h2>경기 지표</h2></div></div><div className="versus-stats">{metrics.map(([label, h, a, unit]) => { const total = Number(h) + Number(a) || 1; return <div key={String(label)}><b>{h}{unit}</b><span>{label}</span><b>{a}{unit}</b><i><em style={{ width: `${Number(h) / total * 100}%` }} /><em style={{ width: `${Number(a) / total * 100}%` }} /></i></div>; })}</div></article>
      <article className="clean-card"><div className="card-heading"><div><p>RESULT</p><h2>경기 요약</h2></div></div><div className="summary-list"><div><span>홈 결과</span><b>{home.matchDetail.matchResult}</b></div><div><span>원정 결과</span><b>{away.matchDetail.matchResult}</b></div><div><span>경기 종료</span><b>{home.matchDetail.matchEndType === 0 ? "정상 종료" : "특수 종료"}</b></div><div><span>매치 ID</span><small>{match.matchId}</small></div></div><div className="goal-timeline"><h3>득점 기록</h3>{goals.length ? goals.map((goal: any, i: number) => <div key={`${goal.owner}-${goal.goalTime}-${i}`}><time>{matchMinute(goal.goalTime)}</time><span><b>{goal.playerName}</b><small>{goal.owner}{goal.assistPlayerName ? ` · 도움 ${goal.assistPlayerName}` : ""}</small></span><em>GOAL</em></div>) : <p>득점 기록 없음</p>}</div></article>
      {[home, away].map((side: any) => <article className="clean-card" key={side.nickname}><div className="card-heading"><div><p>SHOT MAP</p><h2>{side.nickname}</h2></div><span>점에 마우스를 올려 상세 확인</span></div><div className="dynamic-pitch compact shot-map"><div className="pitch-mid"/><div className="pitch-center"/><div className="pitch-box p-left"/><div className="pitch-box p-right"/>{(side.shootDetail || []).map((shot: any, i: number) => { const x = Math.max(0, Math.min(1, shot.x)); const y = Math.max(0, Math.min(1, shot.y)); const goal = Number(shot.result) === 3; return <div className={`shot-event ${goal ? "goal" : ""}`} key={i}><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><line x1={x * 100} y1={y * 100} x2="100" y2="50" /></svg><button type="button" aria-label={`${shot.playerName} ${shotResults[shot.result] || "슛"}`} style={{ left: `${x * 100}%`, top: `${y * 100}%` }}><i/><span><b>{shot.playerName} · {matchMinute(shot.goalTime)}</b><small>{shotTypes[shot.type] || `슛 유형 ${shot.type}`} · {shotResults[shot.result] || "결과 미상"}</small><small>{goalDirection(y)} 방향{shot.hitPost ? " · 골대 맞음" : ""}</small>{shot.assistPlayerName && <small>도움 {shot.assistPlayerName}</small>}<em>{goal ? "GOAL" : "SHOT"}</em></span></button></div>; })}</div><p className="shot-map-note">선은 슛 위치에서 골문 중앙까지의 방향 가이드이며 실제 공의 최종 도착 좌표는 API에서 제공하지 않습니다.</p></article>)}
    </section>
  </main>;
}
