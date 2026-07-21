"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FloatingNav } from "../../components/FloatingNav";
import { LoadingState } from "../../components/LoadingState";

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
  return <main className="subpage"><FloatingNav />
    <header className="match-hero"><p>{new Date(`${match.matchDate}+09:00`).toLocaleString("ko-KR")}</p><div><Link href={`/players/${encodeURIComponent(home.nickname)}`}>{home.nickname}</Link><strong>{home.shoot.goalTotal}<span>–</span>{away.shoot.goalTotal}</strong><Link href={`/players/${encodeURIComponent(away.nickname)}`}>{away.nickname}</Link></div><small>리그 친선경기 · 승부차기 제외 기준</small></header>
    <section className="page-shell detail-grid">
      <article className="clean-card span-two"><div className="card-heading"><div><p>MATCH STATS</p><h2>경기 지표</h2></div></div><div className="versus-stats">{metrics.map(([label, h, a, unit]) => { const total = Number(h) + Number(a) || 1; return <div key={String(label)}><b>{h}{unit}</b><span>{label}</span><b>{a}{unit}</b><i><em style={{ width: `${Number(h) / total * 100}%` }} /><em style={{ width: `${Number(a) / total * 100}%` }} /></i></div>; })}</div></article>
      <article className="clean-card"><div className="card-heading"><div><p>RESULT</p><h2>경기 요약</h2></div></div><div className="summary-list"><div><span>홈 결과</span><b>{home.matchDetail.matchResult}</b></div><div><span>원정 결과</span><b>{away.matchDetail.matchResult}</b></div><div><span>경기 종료</span><b>{home.matchDetail.matchEndType === 0 ? "정상 종료" : "특수 종료"}</b></div><div><span>매치 ID</span><small>{match.matchId}</small></div></div></article>
      {[home, away].map((side: any) => <article className="clean-card" key={side.nickname}><div className="card-heading"><div><p>SHOT MAP</p><h2>{side.nickname}</h2></div></div><div className="dynamic-pitch compact"><div className="pitch-mid"/><div className="pitch-center"/><div className="pitch-box p-left"/><div className="pitch-box p-right"/>{(side.shootDetail || []).map((shot: any, i: number) => <i key={i} className={Number(shot.result) === 3 ? "shot-dot goal" : "shot-dot"} style={{ left: `${Math.max(0, Math.min(1, shot.x)) * 100}%`, top: `${Math.max(0, Math.min(1, shot.y)) * 100}%` }} />)}</div></article>)}
    </section>
  </main>;
}
