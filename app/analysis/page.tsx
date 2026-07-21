"use client";

import { useEffect, useMemo, useState } from "react";
import { FloatingNav } from "../components/FloatingNav";
import { LoadingState } from "../components/LoadingState";

type Stats = { matches: number; shots: number; onTarget: number; goals: number; passTry: number; passSuccess: number; possession: number; routes: number[]; goalBuckets: number[]; shotMap: Array<{ x: number; y: number; goal: boolean }> };
type LeagueMatch = { id: string; date: string; home: string; away: string; homeGoals: number; awayGoals: number; homePossession: number; awayPossession: number; homeShots: number; awayShots: number; homeClasses: Array<{ name: string; count: number }>; awayClasses: Array<{ name: string; count: number }> };

export default function AnalysisPage() {
  const [data, setData] = useState<any>(null);
  const [selected, setSelected] = useState("씅민쓰");
  const [opponent, setOpponent] = useState("6년제");
  useEffect(() => { fetch("/api/league").then((r) => r.json()).then(setData); }, []);
  useEffect(() => { if (selected === opponent && data) setOpponent(Object.keys(data.analytics).find((name) => name !== selected) || ""); }, [selected, opponent, data]);
  const stats = data?.analytics?.[selected] as Stats | undefined;
  const ranking = useMemo(() => !data ? [] : Object.entries(data.analytics || {}).map(([name, raw]) => { const s = raw as Stats; return { name, matches: s.matches, goalsPerGame: s.goals / Math.max(1, s.matches), shotAccuracy: s.onTarget / Math.max(1, s.shots) * 100, passAccuracy: s.passSuccess / Math.max(1, s.passTry) * 100 }; }).sort((a, b) => b.goalsPerGame - a.goalsPerGame), [data]);
  const headToHead = useMemo(() => {
    const games = ((data?.matches || []) as LeagueMatch[]).filter((m) => (m.home === selected && m.away === opponent) || (m.home === opponent && m.away === selected)).map((m) => {
      const selectedHome = m.home === selected;
      return { ...m, gf: selectedHome ? m.homeGoals : m.awayGoals, ga: selectedHome ? m.awayGoals : m.homeGoals, possession: selectedHome ? m.homePossession : m.awayPossession, shots: selectedHome ? m.homeShots : m.awayShots, myClasses: selectedHome ? m.homeClasses : m.awayClasses, theirClasses: selectedHome ? m.awayClasses : m.homeClasses };
    });
    const combinations = new Map<string, { mine: string; theirs: string; p: number; w: number; d: number; l: number; gf: number; ga: number }>();
    for (const game of games) { const mine = game.myClasses?.[0]?.name || "혼합 스쿼드"; const theirs = game.theirClasses?.[0]?.name || "혼합 스쿼드"; const key = `${mine}|${theirs}`; const row = combinations.get(key) || { mine, theirs, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 }; row.p++; row.gf += game.gf; row.ga += game.ga; if (game.gf > game.ga) row.w++; else if (game.gf < game.ga) row.l++; else row.d++; combinations.set(key, row); }
    return { games, combinations: [...combinations.values()].sort((a, b) => b.p - a.p), w: games.filter((g) => g.gf > g.ga).length, d: games.filter((g) => g.gf === g.ga).length, l: games.filter((g) => g.gf < g.ga).length, gf: games.reduce((s, g) => s + g.gf, 0), ga: games.reduce((s, g) => s + g.ga, 0) };
  }, [data, selected, opponent]);
  if (!data || !stats) return <main className="subpage"><FloatingNav /><LoadingState label="플레이 분석을 계산하는 중" /></main>;
  const routeTotal = stats.routes.reduce((a, b) => a + b, 0) || 1;
  const maxBucket = Math.max(1, ...stats.goalBuckets);
  return <main className="subpage"><FloatingNav />
    <header className="subhero analysis-head"><div><p>PERFORMANCE LAB</p><h1>플레이 분석</h1><span>리그 내부 친선경기만으로 계산한 실제 플레이 패턴</span></div><select value={selected} onChange={(e) => setSelected(e.target.value)}>{Object.keys(data.analytics).map((name) => <option key={name}>{name}</option>)}</select></header>
    <section className="page-shell analysis-layout">
      <article className="clean-card span-two"><div className="card-heading"><div><p>SHOT LOCATION</p><h2>{selected}의 공격 지도</h2></div><span>{stats.shotMap.length}개 슈팅</span></div><div className="dynamic-pitch analysis-pitch"><div className="pitch-mid"/><div className="pitch-center"/><div className="pitch-box p-left"/><div className="pitch-box p-right"/>{stats.shotMap.slice(-180).map((shot, i) => <i key={i} className={shot.goal ? "shot-dot goal" : "shot-dot"} style={{ left: `${shot.x * 100}%`, top: `${shot.y * 100}%` }} />)}</div><div className="map-legend"><span><i className="shot-dot"/>슈팅</span><span><i className="shot-dot goal"/>득점</span></div></article>
      <article className="clean-card analysis-kpis"><div><span>경기당 득점</span><b>{(stats.goals / Math.max(1, stats.matches)).toFixed(2)}</b><small>{stats.goals}골 / {stats.matches}경기</small></div><div><span>유효 슈팅률</span><b>{Math.round(stats.onTarget / Math.max(1, stats.shots) * 100)}%</b><small>{stats.onTarget} / {stats.shots}</small></div><div><span>패스 성공률</span><b>{Math.round(stats.passSuccess / Math.max(1, stats.passTry) * 100)}%</b><small>{stats.passSuccess}회 성공</small></div><div><span>평균 점유율</span><b>{Math.round(stats.possession / Math.max(1, stats.matches))}%</b><small>내부 경기 기준</small></div></article>
      <article className="clean-card"><div className="card-heading"><div><p>ATTACK CHANNEL</p><h2>공격 방향</h2></div></div><div className="channel-donut" style={{ background: `conic-gradient(#315efb 0 ${stats.routes[0] / routeTotal * 100}%, #7898ff 0 ${(stats.routes[0] + stats.routes[1]) / routeTotal * 100}%, #cad5f7 0)` }}><div><b>{Math.round(Math.max(...stats.routes) / routeTotal * 100)}%</b><span>주요 루트</span></div></div><div className="route-summary">{["왼쪽","중앙","오른쪽"].map((x,i)=><div key={x}><span>{x}</span><b>{Math.round(stats.routes[i]/routeTotal*100)}%</b><i><em style={{width:`${stats.routes[i]/routeTotal*100}%`}}/></i></div>)}</div></article>
      <article className="clean-card"><div className="card-heading"><div><p>GOAL TIMING</p><h2>득점 시간대</h2></div></div><div className="time-chart">{stats.goalBuckets.map((value, i) => <div key={i}><b style={{height:`${Math.max(5,value/maxBucket*100)}%`}}/><span>{["0–15","16–30","31–45","46–60","61–75","76–90"][i]}</span><small>{value}</small></div>)}</div></article>
      <article className="clean-card span-three h2h-card"><div className="card-heading"><div><p>HEAD TO HEAD</p><h2>유저별 맞대결 분석</h2></div><div className="h2h-selectors"><select value={selected} onChange={(e) => setSelected(e.target.value)}>{Object.keys(data.analytics).filter((name) => name !== opponent).map((name) => <option key={name}>{name}</option>)}</select><span>VS</span><select value={opponent} onChange={(e) => setOpponent(e.target.value)}>{Object.keys(data.analytics).filter((name) => name !== selected).map((name) => <option key={name}>{name}</option>)}</select></div></div>
        <div className="h2h-summary"><div><span>맞대결</span><b>{headToHead.games.length}</b><small>경기</small></div><div><span>{selected}</span><b>{headToHead.w}승 {headToHead.d}무 {headToHead.l}패</b><small>승률 {Math.round(headToHead.w / Math.max(1, headToHead.games.length) * 100)}%</small></div><div><span>득실</span><b>{headToHead.gf} : {headToHead.ga}</b><small>{selected} 기준</small></div></div>
        <div className="class-matchups"><div className="class-head"><span>{selected} 주력 클래스</span><span>{opponent} 주력 클래스</span><span>경기</span><span>전적</span><span>득실</span></div>{headToHead.combinations.length ? headToHead.combinations.slice(0, 8).map((row) => <div key={`${row.mine}-${row.theirs}`}><strong>{row.mine}</strong><strong>{row.theirs}</strong><span>{row.p}</span><span>{row.w}승 {row.d}무 {row.l}패</span><b>{row.gf}:{row.ga}</b></div>) : <p>두 유저의 리그 맞대결이 아직 없습니다.</p>}</div>
        <p className="class-disclaimer">※ 실제 활성 팀컬러는 API에서 제공하지 않아, 각 경기 선발 카드에서 가장 많이 사용된 시즌 클래스를 스쿼드 성향으로 비교합니다.</p>
      </article>
      <article className="clean-card span-three"><div className="card-heading"><div><p>LEAGUE COMPARISON</p><h2>유저별 공격 효율</h2></div><span>경기당 득점순</span></div><div className="comparison-table"><div className="comparison-head"><span>#</span><span>유저</span><span>경기</span><span>경기당 득점</span><span>유효 슈팅률</span><span>패스 성공률</span></div>{ranking.map((row, i) => <div key={row.name}><b>{i + 1}</b><strong>{row.name}</strong><span>{row.matches}</span><span>{row.goalsPerGame.toFixed(2)}</span><span>{Math.round(row.shotAccuracy)}%</span><span>{Math.round(row.passAccuracy)}%</span></div>)}</div></article>
    </section>
  </main>;
}
