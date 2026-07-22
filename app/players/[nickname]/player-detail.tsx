"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FloatingNav } from "../../components/FloatingNav";
import { LoadingState } from "../../components/LoadingState";
import { useTriSort } from "../../hooks/useTriSort";

type SquadPlayer = { spId: number; name: string; position: number; grade: number; appearances: number; goals: number; assists: number; shots: number; passTry: number; passSuccess: number; tackles: number; interceptions: number; rating: number };
type Stats = { matches: number; shots: number; onTarget: number; goals: number; passTry: number; passSuccess: number; possession: number; routes: number[]; goalBuckets: number[]; shotMap: Array<{ x: number; y: number; goal: boolean }>; squad: SquadPlayer[] };
type Match = { id: string; date: string; home: string; away: string; homeGoals: number; awayGoals: number };

export function PlayerDetail({ nickname }: { nickname: string }) {
  const [data, setData] = useState<any>(null);
  useEffect(() => { fetch("/api/league").then((r) => r.json()).then(setData); }, []);
  const squadTable = useTriSort<(SquadPlayer & { passRate: number })>(((data?.analytics?.[nickname]?.squad || []) as SquadPlayer[]).map((card) => ({ ...card, passRate: Math.round(card.passSuccess / Math.max(1, card.passTry) * 100) })));
  if (!data) return <main className="subpage"><FloatingNav /><LoadingState /></main>;
  const player = data.standings?.excludingShootout?.find((p: any) => p.name === nickname);
  const stats = data.analytics?.[nickname] as Stats | undefined;
  const matches = (data.matches || []).filter((m: Match) => m.home === nickname || m.away === nickname).slice(0, 5);
  if (!player || !stats) return <main className="subpage"><FloatingNav /><div className="empty-state">유저를 찾을 수 없습니다.</div></main>;
  return <main className="subpage"><FloatingNav />
    <header className="profile-hero"><div className="avatar-xl">{nickname.slice(0, 1)}</div><div><p>RANK {player.rank}</p><h1>{nickname}</h1><span>{player.pts}점 · {player.w}승 {player.d}무 {player.l}패 · 득실 {player.gd > 0 ? "+" : ""}{player.gd}</span></div></header>
    <section className="page-shell detail-grid">
      <article className="clean-card span-two profile-record"><div className="card-heading"><div><p>SEASON RECORD</p><h2>리그 성적표</h2></div><Link href={`/analysis?player=${encodeURIComponent(nickname)}`}>전술 분석 보기 →</Link></div>
        <div className="record-score"><div><span>승점</span><strong>{player.pts}</strong><small>현재 {player.rank}위</small></div><div className="record-wdl"><b>{player.w}<small>승</small></b><b>{player.d}<small>무</small></b><b>{player.l}<small>패</small></b></div><div><span>득점 : 실점</span><strong>{player.gf} : {player.ga}</strong><small>득실차 {player.gd > 0 ? "+" : ""}{player.gd}</small></div></div>
        <div className="profile-form"><span>최근 흐름</span><div>{(player.form || []).map((result: string, index: number) => <i className={result} key={`${result}-${index}`}>{result === "W" ? "승" : result === "D" ? "무" : "패"}</i>)}</div><b>승률 {Math.round(player.w / Math.max(1, player.p) * 100)}%</b></div>
      </article>
      <article className="clean-card profile-activity"><div className="card-heading"><div><p>PROFILE</p><h2>활동 요약</h2></div></div><div><span>리그 경기</span><b>{stats.matches}</b><small>API 제공 전체 기간</small></div><div><span>사용 선수 카드</span><b>{stats.squad.length}</b><small>1경기 이상 출전</small></div><div><span>총 득점</span><b>{stats.goals}</b><small>리그 내부 경기</small></div><div><span>평균 점유율</span><b>{Math.round(stats.possession / Math.max(1, stats.matches))}%</b><small>플레이 성향 참고</small></div></article>
      <article className="clean-card span-three squad-record-card"><div className="card-heading"><div><p>SQUAD RECORDS</p><h2>{nickname}의 사용 선수 기록</h2></div><span>헤더를 눌러 정렬</span></div><div className="squad-table"><div className="squad-head">{([['name','선수'],['appearances','출장'],['goals','골'],['assists','도움'],['rating','평점'],['passRate','패스']] as Array<[keyof (SquadPlayer & {passRate:number}),string]>).map(([key,label]) => <button className="sort-head" onClick={() => squadTable.toggle(key)} key={key}>{label}<i>{squadTable.indicator(key)}</i></button>)}</div>{squadTable.rows.slice(0, 24).map((card) => <div key={`${card.spId}-${card.grade}`}><i>{card.name.slice(0,1)}</i><strong>{card.name}<small>+{card.grade} · POS {card.position}</small></strong><span>{card.appearances}</span><span>{card.goals}</span><span>{card.assists}</span><b>{card.rating.toFixed(1)}</b><span>{card.passRate}%</span></div>)}</div></article>
      <article className="clean-card span-three"><div className="card-heading"><div><p>RECENT FORM</p><h2>최근 경기</h2></div><Link href={`/matches?player=${encodeURIComponent(nickname)}`}>전체 보기 →</Link></div><div className="compact-matches">{matches.map((m: Match) => <Link href={`/matches/${m.id}`} key={m.id}><time>{new Date(`${m.date}+09:00`).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}</time><b>{m.home}</b><strong>{m.homeGoals} – {m.awayGoals}</strong><b>{m.away}</b></Link>)}</div></article>
    </section>
  </main>;
}
