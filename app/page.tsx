"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FloatingNav } from "./components/FloatingNav";

type PlayerRow = { rank: number; name: string; p: number; w: number; d: number; l: number; gf: number; ga: number; gd: number; pts: number; form: string[] };
type ApiMatch = { id: string; date: string; type: number; home: string; away: string; homeGoals: number; awayGoals: number; homeShootout: number; awayShootout: number };
type PlayerAnalytics = { matches: number; shots: number; onTarget: number; goals: number; passTry: number; passSuccess: number; routes: number[]; goalBuckets: number[]; shotMap: Array<{ x: number; y: number; goal: boolean }> };
type LeagueData = { connected: boolean; playerCount?: number; matchCount?: number; matches?: ApiMatch[]; standings?: { excludingShootout: PlayerRow[]; includingShootout: PlayerRow[] }; analytics?: Record<string, PlayerAnalytics> };

const previewPlayers = [
  { rank: 1, name: "씅민쓰", p: 12, w: 8, d: 2, l: 2, gf: 29, ga: 15, form: ["W", "W", "D", "W", "W"] },
  { rank: 2, name: "6년제", p: 12, w: 7, d: 2, l: 3, gf: 24, ga: 16, form: ["W", "L", "W", "W", "D"] },
  { rank: 3, name: "따이민", p: 11, w: 6, d: 2, l: 3, gf: 21, ga: 16, form: ["D", "W", "W", "L", "W"] },
  { rank: 4, name: "그냥강혜중", p: 12, w: 5, d: 3, l: 4, gf: 20, ga: 20, form: ["L", "D", "W", "W", "D"] },
  { rank: 5, name: "대가대다님", p: 11, w: 4, d: 2, l: 5, gf: 17, ga: 20, form: ["W", "L", "L", "D", "W"] },
  { rank: 6, name: "박수환", p: 12, w: 3, d: 2, l: 7, gf: 16, ga: 25, form: ["L", "W", "L", "D", "L"] },
  { rank: 7, name: "빅수환", p: 12, w: 2, d: 1, l: 9, gf: 12, ga: 27, form: ["L", "L", "W", "L", "L"] },
  { rank: 8, name: "6w91oap5jy", p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, form: [] },
];

const previewMatches = [
  { date: "7월 20일 · 23:41", home: "씅민쓰", away: "6년제", score: "3 : 1", note: "공식경기" },
  { date: "7월 20일 · 22:18", home: "따이민", away: "박수환", score: "2 : 2", note: "친선경기 · 승부차기 4:3" },
  { date: "7월 19일 · 01:06", home: "그냥강혜중", away: "대가대다님", score: "1 : 0", note: "공식경기" },
];

export default function Home() {
  const [shootout, setShootout] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState("씅민쓰");
  const [live, setLive] = useState<LeagueData | null>(null);
  useEffect(() => { fetch("/api/league").then((r) => r.json()).then(setLive).catch(() => setLive({ connected: false })); }, []);
  const table = useMemo(() => live?.connected
    ? (shootout ? live.standings!.includingShootout : live.standings!.excludingShootout)
    : previewPlayers.map((x) => ({ ...x, pts: x.w * 3 + x.d, gd: x.gf - x.ga })), [live, shootout]);
  const matchList = live?.connected ? live.matches!.slice(0, 3).map((m) => ({
    date: new Date(`${m.date}+09:00`).toLocaleString("ko-KR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }),
    home: m.home, away: m.away, score: `${m.homeGoals} : ${m.awayGoals}`,
    note: `${m.type === 50 ? "공식경기" : "친선경기"}${m.homeShootout || m.awayShootout ? ` · 승부차기 ${m.homeShootout}:${m.awayShootout}` : ""}`,
  })) : previewMatches;
  const stats = live?.analytics?.[selectedPlayer];
  const routeTotal = stats?.routes.reduce((sum, value) => sum + value, 0) || 0;
  const routes = stats ? stats.routes.map((value) => Math.round(value / Math.max(1, routeTotal) * 100)) : [31, 48, 21];
  const shotAccuracy = stats ? Math.round(stats.onTarget / Math.max(1, stats.shots) * 1000) / 10 : 42.8;
  const shotsPerGame = stats ? Math.round(stats.shots / Math.max(1, stats.matches) * 10) / 10 : 8.4;
  const goalsPerGame = stats ? Math.round(stats.goals / Math.max(1, stats.matches) * 10) / 10 : 2.4;
  const passAccuracy = stats ? Math.round(stats.passSuccess / Math.max(1, stats.passTry) * 100) : 87;
  const goalBuckets = stats?.goalBuckets || [22, 38, 62, 88, 55, 34];
  const bucketMax = Math.max(1, ...goalBuckets);
  return (
    <main><FloatingNav />

      <section className="hero" id="top">
        <div>
          <p className="eyebrow">2026 SUMMER SEASON · 7월 1일 시작</p>
          <h1>우리의 경기,<br/><em>하나의 리그.</em></h1>
          <p className="lede">대구가톨릭대 친구들의 FC Online 기록을 모아<br/>순위부터 플레이 패턴까지 한눈에.</p>
          <div className="hero-actions"><Link href="/matches">모든 경기 보기</Link><Link href="/players">유저 살펴보기</Link></div>
        </div>
        <div className="hero-stats">
          <div><span>LEAGUE LEADER</span><strong>{table[0]?.name || "-"}</strong><small>{table[0]?.pts || 0} PTS</small></div>
          <div><span>TOTAL MATCHES</span><strong>{live?.connected ? live.matchCount : 41}</strong><small>8 PLAYERS</small></div>
          <div><span>LAST UPDATED</span><strong>2시간 전</strong><small>NEXON OPEN API</small></div>
        </div>
      </section>

      <section className="content-grid">
        <article className="panel standings" id="standings">
          <div className="panel-head">
            <div><p className="eyebrow dark">LEAGUE TABLE</p><h2>리그 순위</h2></div>
            <label className="toggle-row">
              <span>승부차기 포함</span>
              <input type="checkbox" checked={shootout} onChange={(e) => setShootout(e.target.checked)} />
              <i />
            </label>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>#</th><th>감독명</th><th>경기</th><th>승</th><th>무</th><th>패</th><th>득점</th><th>실점</th><th>득실차</th><th>승점</th><th>최근 5경기</th></tr></thead>
              <tbody>{table.map((x) => <tr key={x.name}>
                <td><b className={`rank r${x.rank}`}>{x.rank}</b></td>
                <td><div className="manager"><span>{x.name.slice(0,1)}</span><b>{x.name}</b>{x.rank === 1 && <small>LEADER</small>}</div></td>
                <td>{x.p}</td><td>{x.w}</td><td>{x.d}</td><td>{x.l}</td><td>{x.gf}</td><td>{x.ga}</td><td className={x.gd > 0 ? "positive" : "negative"}>{x.gd > 0 ? "+" : ""}{x.gd}</td><td><strong className="points">{x.pts}</strong></td>
                <td><div className="form">{x.form.map((f, i) => <i className={f} key={i}>{f}</i>)}</div></td>
              </tr>)}</tbody>
            </table>
          </div>
          <p className="caption">동률 시 득실차 → 다득점 → 상대 전적 순으로 정렬 · {shootout ? "승부차기 결과 포함" : "승부차기 결과 제외"}</p>
        </article>

        <aside className="panel recent" id="matches">
          <div className="panel-head"><div><p className="eyebrow dark">RECENT</p><h2>최근 경기</h2></div><button className="link-btn">전체 보기 →</button></div>
          <div className="matches">{matchList.map((m) => <div className="match" key={`${m.date}-${m.home}`}>
            <div className="match-meta"><span>{m.date}</span><small>{m.note}</small></div>
            <div className="scoreline"><b>{m.home}</b><strong>{m.score}</strong><b>{m.away}</b></div>
          </div>)}</div>
        </aside>
      </section>

      <section className="analysis-section" id="analysis">
        <div className="section-title"><div><p className="eyebrow">PLAYSTYLE LAB</p><h2>리그 플레이 패턴</h2></div><p>슈팅 좌표·경기 기록 기반 · <Link href="/analysis">상세 분석 보기 →</Link></p></div>
        <div className="analysis-grid">
          <article className="dark-card attack" id="player-analysis">
            <div className="card-title"><div><span>01</span><h3>주 공격 루트</h3></div><select aria-label="분석 유저" value={selectedPlayer} onChange={(e) => setSelectedPlayer(e.target.value)}>{previewPlayers.map((player) => <option key={player.name}>{player.name}</option>)}</select></div>
            <div className="pitch">
              <div className="halfway"/><div className="circle"/><div className="box left"/><div className="box right"/>
              {stats?.shotMap?.slice(-100).map((shot, i) => <i key={i} className={shot.goal ? "shot-dot goal" : "shot-dot"} style={{ left: `${shot.x * 100}%`, top: `${shot.y * 100}%` }} />)}
            </div>
            <div className="route-bars"><div><span>왼쪽</span><i><b style={{width:`${routes[0]}%`}}/></i><strong>{routes[0]}%</strong></div><div><span>중앙</span><i><b style={{width:`${routes[1]}%`}}/></i><strong>{routes[1]}%</strong></div><div><span>오른쪽</span><i><b style={{width:`${routes[2]}%`}}/></i><strong>{routes[2]}%</strong></div></div>
          </article>
          <article className="dark-card efficiency">
            <div className="card-title"><div><span>02</span><h3>공격 효율</h3></div><small>최근 10경기</small></div>
            <div className="big-metric"><strong>{shotAccuracy}<sup>%</sup></strong><span>유효 슈팅률<b>{selectedPlayer} · 7월 1일 이후</b></span></div>
            <div className="mini-metrics"><div><span>경기당 슈팅</span><b>{shotsPerGame}</b></div><div><span>경기당 득점</span><b>{goalsPerGame}</b></div><div><span>패스 성공률</span><b>{passAccuracy}%</b></div></div>
          </article>
          <article className="dark-card timing">
            <div className="card-title"><div><span>03</span><h3>득점 시간대</h3></div><small>전체 29골</small></div>
            <div className="chart">{goalBuckets.map((v,i)=><div key={i}><b style={{height:`${Math.max(6, v / bucketMax * 100)}%`}}/><span>{["0–15","16–30","31–45","46–60","61–75","76–90"][i]}</span></div>)}</div>
            <p className="insight"><i>↑</i><span><b>후반 초반에 강합니다</b>46–60분 득점이 리그 평균보다 18% 높아요.</span></p>
          </article>
        </div>
      </section>

      <footer><div className="brand small"><span className="crest">D</span><span><b>DCU</b><small>CHAMPIONS LEAGUE</small></span></div><p>친구들과 만드는 우리만의 리그 · NEXON Open API 기반</p><span>2026 SUMMER</span></footer>
    </main>
  );
}
