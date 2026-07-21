"use client";

import { useEffect, useState } from "react";
import { FloatingNav } from "../components/FloatingNav";
import { LoadingState } from "../components/LoadingState";

type Leader = { name: string; owner?: string; goals: number; attempts: number };
type ShotRanking = Leader & { owner: string; spId: number; conversion: number };
type ShotAward = { id: string; title: string; emoji: string; user: Leader | null; player: Leader | null; rankings: ShotRanking[] };
type BoardRow = { owner: string; spId?: number; name: string; kind?: string; grade?: number; appearances: number; [key: string]: string | number | undefined };
type Board = { id: string; emoji: string; title: string; description: string; value: string; percent?: boolean; decimal?: boolean; rows: BoardRow[]; perGameRows?: BoardRow[] };

const displayValue = (board: Board, row: BoardRow) => {
  const value = Number(row[board.value] || 0);
  if (board.percent) return `${Math.round(value * 100)}%`;
  if (board.decimal) return value.toFixed(2);
  return value.toLocaleString("ko-KR");
};

export default function RecordsPage() {
  const [data, setData] = useState<{ records?: { shotAwards: ShotAward[]; boards: Board[] } } | null>(null);
  const [boardMode, setBoardMode] = useState<"total" | "perGame">("total");
  const [selectedAward, setSelectedAward] = useState("2");
  const [shotRankingOpen, setShotRankingOpen] = useState(false);
  useEffect(() => { fetch("/api/league").then((response) => response.json()).then(setData); }, []);
  if (!data) return <main className="subpage"><FloatingNav /><LoadingState label="기록실을 정리하는 중" /></main>;
  const records = data.records;
  if (!records) return <main className="subpage"><FloatingNav /><div className="empty-state">기록을 불러오지 못했습니다.</div></main>;
  const activeAward = records.shotAwards.find((award) => award.id === selectedAward) || records.shotAwards[0];
  return <main className="subpage records-page"><FloatingNav />
    <header className="subhero records-hero"><div><p>DCU HALL OF RECORDS</p><h1>기록실</h1><span>진지한 숫자에 조금은 장난스러운 이름을 붙였습니다.</span></div><strong>🏆</strong></header>
    <section className="page-shell records-shell">
      <div className="records-intro"><div><p>SPECIALTY AWARDS</p><h2>골에도 스타일이 있다</h2></div><span>리그 내부 경기 · 승부차기 제외 · 7월 1일 이후</span></div>
      <div className="shot-award-grid">{records.shotAwards.map((award) => <button type="button" onClick={() => { setSelectedAward(award.id); setShotRankingOpen(true); }} className={`shot-award ${activeAward.id === award.id ? "selected" : ""}`} key={award.title}><i>{award.emoji}</i><div><p>{award.title}</p><h3>{award.user?.name || "아직 없음"}</h3><span>유저 · {award.user?.goals || 0}골 / {award.user?.attempts || 0}회 시도</span></div><div className="award-player"><small>PLAYER</small><b>{award.player?.name || "기록 없음"}</b><span>{award.player?.owner || "-"} · {award.player?.goals || 0}골</span></div></button>)}</div>
      {shotRankingOpen ? <article className="shot-ranking"><header><div><p>{activeAward.emoji} SHOT TYPE RANKING</p><h2>{activeAward.title} 선수 랭킹</h2></div><div className="shot-ranking-actions"><span>득점 우선 · 동률 시 시도 횟수</span><button type="button" onClick={() => setShotRankingOpen(false)}>접기 ↑</button></div></header><div className="shot-ranking-head"><span>#</span><span>선수</span><span>유저</span><span>득점</span><span>시도</span><span>성공률</span></div>{activeAward.rankings.length ? activeAward.rankings.slice(0, 10).map((row, index) => <div className="shot-ranking-row" key={`${activeAward.id}-${row.owner}-${row.spId}`}><b>{index + 1}</b><strong>{row.name}</strong><span>{row.owner}</span><em>{row.goals}</em><span>{row.attempts}</span><span>{Math.round(row.conversion * 100)}%</span></div>) : <p className="no-record">해당 유형의 슈팅 기록이 아직 없습니다.</p>}</article> : <button type="button" className="shot-ranking-opener" onClick={() => setShotRankingOpen(true)}>{activeAward.emoji} {activeAward.title} 선수 랭킹 펼치기 ↓</button>}
      <div className="records-intro board-title"><div><p>LEADERBOARDS</p><h2>별별 랭킹</h2></div><div className="board-mode"><button className={boardMode === "total" ? "active" : ""} onClick={() => setBoardMode("total")}>누적</button><button className={boardMode === "perGame" ? "active" : ""} onClick={() => setBoardMode("perGame")}>경기당</button></div></div>
      <div className="record-board-grid">{records.boards.map((board) => { const isPerGame = boardMode === "perGame" && !!board.perGameRows; const rows = isPerGame ? board.perGameRows! : board.rows; return <article className={`record-board board-${board.id}`} key={board.id}><header><i>{board.emoji}</i><div><h3>{board.title}</h3><p>{board.description}</p></div><small className="board-mode-badge">{isPerGame ? "경기당 · 5경기+" : boardMode === "perGame" ? "기존 비율" : "누적"}</small></header><div>{rows.length ? rows.slice(0, 7).map((row, index) => <div className="record-row" key={`${row.owner}-${row.spId || row.name}-${row.grade || 0}`}><em>{index + 1}</em><strong>{row.name}<small>{row.kind === "user" ? `유저 · ${row.appearances}경기` : `${row.owner} · +${row.grade || 0} · ${row.appearances}경기`}</small></strong><b>{isPerGame ? Number(row.perGameValue || 0).toFixed(2) : displayValue(board, row)}</b></div>) : <p className="no-record">조건을 충족한 선수가 아직 없습니다.</p>}</div></article>; })}</div>
      <aside className="record-notes"><b>기록 해석 안내</b><p>‘기름손 주의보’는 개인 실책 판정이 아니라 해당 골키퍼가 출전한 경기의 팀 실점을 경기 수로 나눈 값입니다. ‘가장 바쁜 수비수’도 실책이 아니라 태클·가로채기·블록·수비 행동의 경기당 합계입니다. ‘강화 효율왕’과 ‘고강화 아쉬움’은 시장 시세가 아니라 강화등급과 포지션 보정 성과점수를 비교한 참고 지표입니다. API에는 개인기 발동 횟수는 없으며, 드리블은 실제 시도·성공 기록으로 계산합니다.</p></aside>
    </section>
  </main>;
}
