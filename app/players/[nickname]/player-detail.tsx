"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FloatingNav } from "../../components/FloatingNav";
import { LoadingState } from "../../components/LoadingState";

type Stats = { matches: number; shots: number; onTarget: number; goals: number; passTry: number; passSuccess: number; possession: number; routes: number[]; goalBuckets: number[]; shotMap: Array<{ x: number; y: number; goal: boolean }> };
type Match = { id: string; date: string; home: string; away: string; homeGoals: number; awayGoals: number };

export function PlayerDetail({ nickname }: { nickname: string }) {
  const [data, setData] = useState<any>(null);
  useEffect(() => { fetch("/api/league").then((r) => r.json()).then(setData); }, []);
  if (!data) return <main className="subpage"><FloatingNav /><LoadingState /></main>;
  const player = data.standings?.excludingShootout?.find((p: any) => p.name === nickname);
  const stats = data.analytics?.[nickname] as Stats | undefined;
  const matches = (data.matches || []).filter((m: Match) => m.home === nickname || m.away === nickname).slice(0, 5);
  if (!player || !stats) return <main className="subpage"><FloatingNav /><div className="empty-state">선수를 찾을 수 없습니다.</div></main>;
  const routeTotal = stats.routes.reduce((a, b) => a + b, 0) || 1;
  return <main className="subpage"><FloatingNav />
    <header className="profile-hero"><div className="avatar-xl">{nickname.slice(0, 1)}</div><div><p>RANK {player.rank}</p><h1>{nickname}</h1><span>{player.pts}점 · {player.w}승 {player.d}무 {player.l}패 · 득실 {player.gd > 0 ? "+" : ""}{player.gd}</span></div></header>
    <section className="page-shell detail-grid">
      <article className="clean-card span-two"><div className="card-heading"><div><p>ATTACK MAP</p><h2>슈팅 분포와 공격 루트</h2></div><span>리그 내부 경기 {stats.matches}회</span></div>
        <div className="dynamic-pitch"><div className="pitch-mid"/><div className="pitch-center"/><div className="pitch-box p-left"/><div className="pitch-box p-right"/>{stats.shotMap.slice(-120).map((shot, i) => <i key={i} className={shot.goal ? "shot-dot goal" : "shot-dot"} style={{ left: `${shot.x * 100}%`, top: `${shot.y * 100}%` }} />)}</div>
        <div className="route-summary">{["왼쪽", "중앙", "오른쪽"].map((label, i) => <div key={label}><span>{label}</span><b>{Math.round(stats.routes[i] / routeTotal * 100)}%</b><i><em style={{ width: `${stats.routes[i] / routeTotal * 100}%` }} /></i></div>)}</div>
      </article>
      <article className="clean-card stat-stack"><div><span>경기당 득점</span><b>{(stats.goals / Math.max(1, stats.matches)).toFixed(2)}</b></div><div><span>유효 슈팅률</span><b>{Math.round(stats.onTarget / Math.max(1, stats.shots) * 100)}%</b></div><div><span>패스 성공률</span><b>{Math.round(stats.passSuccess / Math.max(1, stats.passTry) * 100)}%</b></div><div><span>평균 점유율</span><b>{Math.round(stats.possession / Math.max(1, stats.matches))}%</b></div></article>
      <article className="clean-card span-three"><div className="card-heading"><div><p>RECENT FORM</p><h2>최근 경기</h2></div><Link href={`/matches?player=${encodeURIComponent(nickname)}`}>전체 보기 →</Link></div><div className="compact-matches">{matches.map((m: Match) => <Link href={`/matches/${m.id}`} key={m.id}><time>{new Date(`${m.date}+09:00`).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}</time><b>{m.home}</b><strong>{m.homeGoals} – {m.awayGoals}</strong><b>{m.away}</b></Link>)}</div></article>
    </section>
  </main>;
}
