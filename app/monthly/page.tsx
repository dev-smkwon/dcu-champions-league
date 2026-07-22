"use client";

import { useEffect, useMemo, useState } from "react";
import { FloatingNav } from "../components/FloatingNav";
import { LoadingState } from "../components/LoadingState";

type Row = { rank: number; name: string; p: number; w: number; d: number; l: number; gf: number; ga: number; gd: number; pts: number; form: string[] };
type Standings = { excludingShootout: Row[]; includingShootout: Row[] };
type Month = { key: string; label: string; matchCount: number; coverage: "partial" | "ongoing" | "complete"; from: string | null; to: string | null; standings: Standings };
type League = { connected: boolean; matchCount: number; standings: Standings; monthly: Month[]; dateRange: { from: string | null; to: string | null } };

const dateLabel = (value: string | null) => value ? new Date(`${value}+09:00`).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" }) : "-";

export default function MonthlyPage() {
  const [data, setData] = useState<League | null>(null);
  const [mode, setMode] = useState<"monthly" | "cumulative">("monthly");
  const [monthKey, setMonthKey] = useState("");
  const [shootout, setShootout] = useState(false);
  useEffect(() => { fetch("/api/league").then((response) => response.json()).then((value) => { setData(value); setMonthKey(value.monthly?.[0]?.key || ""); }); }, []);
  const selected = useMemo(() => data?.monthly?.find((month) => month.key === monthKey) || data?.monthly?.[0], [data, monthKey]);
  if (!data) return <main className="subpage"><FloatingNav /><LoadingState label="월간 기록을 나누는 중" /></main>;
  if (!data.connected) return <main className="subpage"><FloatingNav /><div className="empty-state">월간 기록을 불러오지 못했습니다.</div></main>;
  const standings = mode === "monthly" ? selected?.standings : data.standings;
  const rows = shootout ? standings?.includingShootout || [] : standings?.excludingShootout || [];
  const coverageText = selected?.coverage === "partial" ? "부분 집계" : selected?.coverage === "ongoing" ? "진행 중" : "전체 집계";
  const from = mode === "monthly" ? selected?.from || null : data.dateRange.from;
  const to = mode === "monthly" ? selected?.to || null : data.dateRange.to;
  const count = mode === "monthly" ? selected?.matchCount || 0 : data.matchCount;

  return <main className="subpage monthly-page"><FloatingNav />
    <header className="subhero monthly-hero"><div><p>MONTHLY LEAGUE</p><h1>월간 순위</h1><span>달마다 다시 시작하는 경쟁, 누적 기록은 그대로 보관합니다.</span></div><strong>{mode === "monthly" ? selected?.label : "ALL"}</strong></header>
    <section className="page-shell monthly-shell">
      <div className="monthly-toolbar">
        <div className="period-switch"><button className={mode === "monthly" ? "active" : ""} onClick={() => setMode("monthly")}>월간 순위</button><button className={mode === "cumulative" ? "active" : ""} onClick={() => setMode("cumulative")}>누적 순위</button></div>
        {mode === "monthly" && <select value={selected?.key || ""} onChange={(event) => setMonthKey(event.target.value)}>{data.monthly.map((month) => <option value={month.key} key={month.key}>{month.key.replace("-", "년 ")}월 · {month.matchCount}경기</option>)}</select>}
        <label className="toggle-row"><span>승부차기 포함</span><input type="checkbox" checked={shootout} onChange={(event) => setShootout(event.target.checked)} /><i /></label>
      </div>
      <div className="monthly-summary"><div><span>집계 구분</span><b>{mode === "monthly" ? coverageText : "API 전체 누적"}</b></div><div><span>대상 경기</span><b>{count}</b></div><div><span>조회 범위</span><b>{dateLabel(from)} – {dateLabel(to)}</b></div></div>
      {mode === "monthly" && selected?.coverage === "partial" && <p className="partial-notice">이 월은 넥슨 API가 월 중간부터 반환한 데이터만 포함한 부분 집계입니다. 월 전체 순위로 해석할 때 주의해 주세요.</p>}
      <article className="monthly-table-card"><header><div><p>{mode === "monthly" ? selected?.key : "ALL AVAILABLE"}</p><h2>{mode === "monthly" ? `${selected?.label} 리그 테이블` : "누적 리그 테이블"}</h2></div><span>승 3점 · 무 1점 · 패 0점</span></header>
        <div className="table-wrap"><table><thead><tr><th>#</th><th>감독명</th><th>경기</th><th>승</th><th>무</th><th>패</th><th>득점</th><th>실점</th><th>득실</th><th>승점</th><th>최근 5경기</th></tr></thead><tbody>{rows.map((row) => <tr key={row.name}><td><b className={`rank r${row.rank}`}>{row.rank}</b></td><td><div className="manager"><span>{row.name.slice(0, 1)}</span><b>{row.name}</b>{row.rank === 1 && <small>LEADER</small>}</div></td><td>{row.p}</td><td>{row.w}</td><td>{row.d}</td><td>{row.l}</td><td>{row.gf}</td><td>{row.ga}</td><td className={row.gd > 0 ? "positive" : row.gd < 0 ? "negative" : ""}>{row.gd > 0 ? "+" : ""}{row.gd}</td><td><strong className="points">{row.pts}</strong></td><td><div className="form">{row.form.map((result, index) => <i className={result} key={index}>{result}</i>)}</div></td></tr>)}</tbody></table></div>
      </article>
    </section>
  </main>;
}
