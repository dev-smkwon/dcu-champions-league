"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FloatingNav } from "../components/FloatingNav";
import { LoadingState } from "../components/LoadingState";

type Match = { id: string; date: string; home: string; away: string; homeGoals: number; awayGoals: number; homeShootout: number; awayShootout: number; homePossession: number; awayPossession: number; homeShots: number; awayShots: number };

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  useEffect(() => { const player = new URLSearchParams(window.location.search).get("player"); if (player) setQuery(player); fetch("/api/league").then((r) => r.json()).then((data) => setMatches(data.matches || [])); }, []);
  const filtered = useMemo(() => (matches || []).filter((m) => !query || m.home.includes(query) || m.away.includes(query)), [matches, query]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / 10));
  const visible = filtered.slice((page - 1) * 10, page * 10);
  return <main className="subpage"><FloatingNav />
    <header className="subhero"><p>DCU CHAMPIONS LEAGUE</p><h1>경기 기록</h1><span>2026. 07. 01 이후 · 리그 멤버 간 친선경기만</span></header>
    <section className="page-shell">
      <div className="toolbar"><div><strong>{filtered.length}</strong><span>리그 매치</span></div><input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="감독명으로 검색" aria-label="감독명 검색" /></div>
      {!matches ? <LoadingState /> : <div className="match-list">{visible.map((match) => <Link href={`/matches/${match.id}`} className="match-row" key={match.id}>
        <time>{new Date(`${match.date}+09:00`).toLocaleDateString("ko-KR", { month: "short", day: "numeric", weekday: "short" })}</time>
        <div className="match-side home"><b>{match.home}</b><small>점유율 {match.homePossession}% · 슈팅 {match.homeShots}</small></div>
        <div className="match-score"><strong>{match.homeGoals}</strong><span>–</span><strong>{match.awayGoals}</strong>{(match.homeShootout || match.awayShootout) > 0 && <small>PSO {match.homeShootout}:{match.awayShootout}</small>}</div>
        <div className="match-side away"><b>{match.away}</b><small>점유율 {match.awayPossession}% · 슈팅 {match.awayShots}</small></div><i>›</i>
      </Link>)}</div>}
      {matches && <div className="pagination"><button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>이전</button><span>{page} / {totalPages}</span><button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>다음</button></div>}
    </section>
  </main>;
}
