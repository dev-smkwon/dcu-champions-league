"use client";

import { useMemo, useState } from "react";

const players = [
  { rank: 1, name: "씅민쓰", p: 12, w: 8, d: 2, l: 2, gf: 29, ga: 15, form: ["W", "W", "D", "W", "W"] },
  { rank: 2, name: "6년제", p: 12, w: 7, d: 2, l: 3, gf: 24, ga: 16, form: ["W", "L", "W", "W", "D"] },
  { rank: 3, name: "따이민", p: 11, w: 6, d: 2, l: 3, gf: 21, ga: 16, form: ["D", "W", "W", "L", "W"] },
  { rank: 4, name: "그냥강혜중", p: 12, w: 5, d: 3, l: 4, gf: 20, ga: 20, form: ["L", "D", "W", "W", "D"] },
  { rank: 5, name: "대가대다님", p: 11, w: 4, d: 2, l: 5, gf: 17, ga: 20, form: ["W", "L", "L", "D", "W"] },
  { rank: 6, name: "박수환", p: 12, w: 3, d: 2, l: 7, gf: 16, ga: 25, form: ["L", "W", "L", "D", "L"] },
  { rank: 7, name: "빅수환", p: 12, w: 2, d: 1, l: 9, gf: 12, ga: 27, form: ["L", "L", "W", "L", "L"] },
];

const matches = [
  { date: "7월 20일 · 23:41", home: "씅민쓰", away: "6년제", score: "3 : 1", note: "공식경기" },
  { date: "7월 20일 · 22:18", home: "따이민", away: "박수환", score: "2 : 2", note: "친선경기 · 승부차기 4:3" },
  { date: "7월 19일 · 01:06", home: "그냥강혜중", away: "대가대다님", score: "1 : 0", note: "공식경기" },
];

export default function Home() {
  const [shootout, setShootout] = useState(false);
  const [tab, setTab] = useState("순위");
  const table = useMemo(() => players.map((x) => ({ ...x, pts: x.w * 3 + x.d, gd: x.gf - x.ga })), []);

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="DCU Champions League 홈">
          <span className="crest">D</span>
          <span><b>DCU</b><small>CHAMPIONS LEAGUE</small></span>
        </a>
        <nav aria-label="주 메뉴">
          {["순위", "경기", "분석", "선수"].map((item) => (
            <button className={tab === item ? "active" : ""} onClick={() => setTab(item)} key={item}>{item}</button>
          ))}
        </nav>
        <div className="sync"><i /> 예시 데이터 <span>API 연결 전</span></div>
      </header>

      <section className="hero" id="top">
        <div>
          <p className="eyebrow">2026 SUMMER SEASON · 7월 1일 시작</p>
          <h1>우리의 경기,<br/><em>하나의 리그.</em></h1>
          <p className="lede">대구가톨릭대 친구들의 FC Online 기록을 모아<br/>순위부터 플레이 패턴까지 한눈에.</p>
        </div>
        <div className="hero-stats">
          <div><span>LEAGUE LEADER</span><strong>씅민쓰</strong><small>26 PTS</small></div>
          <div><span>TOTAL MATCHES</span><strong>41</strong><small>7 PLAYERS</small></div>
          <div><span>LAST UPDATED</span><strong>2시간 전</strong><small>NEXON OPEN API</small></div>
        </div>
      </section>

      <section className="content-grid">
        <article className="panel standings">
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
              <thead><tr><th>#</th><th>감독명</th><th>경기</th><th>승</th><th>무</th><th>패</th><th>득실</th><th>승점</th><th>최근 5경기</th></tr></thead>
              <tbody>{table.map((x) => <tr key={x.name}>
                <td><b className={`rank r${x.rank}`}>{x.rank}</b></td>
                <td><div className="manager"><span>{x.name.slice(0,1)}</span><b>{x.name}</b>{x.rank === 1 && <small>LEADER</small>}</div></td>
                <td>{x.p}</td><td>{x.w}</td><td>{x.d}</td><td>{x.l}</td><td className={x.gd > 0 ? "positive" : "negative"}>{x.gd > 0 ? "+" : ""}{x.gd}</td><td><strong className="points">{x.pts}</strong></td>
                <td><div className="form">{x.form.map((f, i) => <i className={f} key={i}>{f}</i>)}</div></td>
              </tr>)}</tbody>
            </table>
          </div>
          <p className="caption">동률 시 득실차 → 다득점 → 상대 전적 순으로 정렬 · {shootout ? "승부차기 결과 포함" : "승부차기 결과 제외"}</p>
        </article>

        <aside className="panel recent">
          <div className="panel-head"><div><p className="eyebrow dark">RECENT</p><h2>최근 경기</h2></div><button className="link-btn">전체 보기 →</button></div>
          <div className="matches">{matches.map((m) => <div className="match" key={m.date}>
            <div className="match-meta"><span>{m.date}</span><small>{m.note}</small></div>
            <div className="scoreline"><b>{m.home}</b><strong>{m.score}</strong><b>{m.away}</b></div>
          </div>)}</div>
        </aside>
      </section>

      <section className="analysis-section">
        <div className="section-title"><div><p className="eyebrow">PLAYSTYLE LAB</p><h2>리그 플레이 패턴</h2></div><p>슈팅 좌표·경기 기록으로 계산한 추정 지표입니다.</p></div>
        <div className="analysis-grid">
          <article className="dark-card attack">
            <div className="card-title"><div><span>01</span><h3>주 공격 루트</h3></div><select aria-label="분석 선수"><option>씅민쓰</option><option>6년제</option><option>따이민</option></select></div>
            <div className="pitch">
              <div className="halfway"/><div className="circle"/><div className="box left"/><div className="box right"/>
              <i className="hot h1"/><i className="hot h2"/><i className="hot h3"/>
            </div>
            <div className="route-bars"><div><span>왼쪽</span><i><b style={{width:"31%"}}/></i><strong>31%</strong></div><div><span>중앙</span><i><b style={{width:"48%"}}/></i><strong>48%</strong></div><div><span>오른쪽</span><i><b style={{width:"21%"}}/></i><strong>21%</strong></div></div>
          </article>
          <article className="dark-card efficiency">
            <div className="card-title"><div><span>02</span><h3>공격 효율</h3></div><small>최근 10경기</small></div>
            <div className="big-metric"><strong>42.8<sup>%</sup></strong><span>유효 슈팅률<b>리그 평균 35.2%</b></span></div>
            <div className="mini-metrics"><div><span>경기당 슈팅</span><b>8.4</b></div><div><span>경기당 득점</span><b>2.4</b></div><div><span>패스 성공률</span><b>87%</b></div></div>
          </article>
          <article className="dark-card timing">
            <div className="card-title"><div><span>03</span><h3>득점 시간대</h3></div><small>전체 29골</small></div>
            <div className="chart">{[22,38,62,88,55,34].map((v,i)=><div key={i}><b style={{height:`${v}%`}}/><span>{["0–15","16–30","31–45","46–60","61–75","76–90"][i]}</span></div>)}</div>
            <p className="insight"><i>↑</i><span><b>후반 초반에 강합니다</b>46–60분 득점이 리그 평균보다 18% 높아요.</span></p>
          </article>
        </div>
      </section>

      <footer><div className="brand small"><span className="crest">D</span><span><b>DCU</b><small>CHAMPIONS LEAGUE</small></span></div><p>친구들과 만드는 우리만의 리그 · NEXON Open API 기반</p><span>2026 SUMMER</span></footer>
    </main>
  );
}
