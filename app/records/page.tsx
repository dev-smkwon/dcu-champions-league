"use client";

import { useEffect, useState } from "react";
import { FloatingNav } from "../components/FloatingNav";
import { LoadingState } from "../components/LoadingState";

type Leader = { name: string; owner?: string; goals: number; attempts: number };
type ShotAward = { title: string; emoji: string; user: Leader | null; player: Leader | null };
type BoardRow = { owner: string; spId?: number; name: string; grade?: number; appearances: number; [key: string]: string | number | undefined };
type Board = { id: string; emoji: string; title: string; description: string; value: string; percent?: boolean; decimal?: boolean; rows: BoardRow[] };

const displayValue = (board: Board, row: BoardRow) => {
  const value = Number(row[board.value] || 0);
  if (board.percent) return `${Math.round(value * 100)}%`;
  if (board.decimal) return value.toFixed(2);
  return value.toLocaleString("ko-KR");
};

export default function RecordsPage() {
  const [data, setData] = useState<{ records?: { shotAwards: ShotAward[]; boards: Board[] } } | null>(null);
  useEffect(() => { fetch("/api/league").then((response) => response.json()).then(setData); }, []);
  if (!data) return <main className="subpage"><FloatingNav /><LoadingState label="기록실을 정리하는 중" /></main>;
  const records = data.records;
  if (!records) return <main className="subpage"><FloatingNav /><div className="empty-state">기록을 불러오지 못했습니다.</div></main>;
  return <main className="subpage records-page"><FloatingNav />
    <header className="subhero records-hero"><div><p>DCU HALL OF RECORDS</p><h1>기록실</h1><span>진지한 숫자에 조금은 장난스러운 이름을 붙였습니다.</span></div><strong>🏆</strong></header>
    <section className="page-shell records-shell">
      <div className="records-intro"><div><p>SPECIALTY AWARDS</p><h2>골에도 스타일이 있다</h2></div><span>리그 내부 경기 · 승부차기 제외 · 7월 1일 이후</span></div>
      <div className="shot-award-grid">{records.shotAwards.map((award) => <article className="shot-award" key={award.title}><i>{award.emoji}</i><div><p>{award.title}</p><h3>{award.user?.name || "아직 없음"}</h3><span>유저 · {award.user?.goals || 0}골 / {award.user?.attempts || 0}회 시도</span></div><div className="award-player"><small>PLAYER</small><b>{award.player?.name || "기록 없음"}</b><span>{award.player?.owner || "-"} · {award.player?.goals || 0}골</span></div></article>)}</div>
      <div className="records-intro board-title"><div><p>LEADERBOARDS</p><h2>별별 랭킹</h2></div><span>카드 단위 누적 기록 · 최소 표본은 카드별 표기</span></div>
      <div className="record-board-grid">{records.boards.map((board) => <article className={`record-board board-${board.id}`} key={board.id}><header><i>{board.emoji}</i><div><h3>{board.title}</h3><p>{board.description}</p></div></header><div>{board.rows.length ? board.rows.slice(0, 7).map((row, index) => <div className="record-row" key={`${row.owner}-${row.spId || row.name}-${row.grade || 0}`}><em>{index + 1}</em><strong>{row.name}<small>{row.owner} · +{row.grade || 0} · {row.appearances}경기</small></strong><b>{displayValue(board, row)}</b></div>) : <p className="no-record">조건을 충족한 선수가 아직 없습니다.</p>}</div></article>)}</div>
      <aside className="record-notes"><b>기록 해석 안내</b><p>‘기름손 주의보’는 개인 실책 판정이 아니라 해당 골키퍼가 출전한 경기의 팀 실점을 경기 수로 나눈 값입니다. ‘가장 바쁜 수비수’도 실책이 아니라 태클·가로채기·블록·수비 행동의 경기당 합계입니다. ‘강화 효율왕’과 ‘고강화 아쉬움’은 시장 시세가 아니라 강화등급과 포지션 보정 성과점수를 비교한 참고 지표입니다.</p></aside>
    </section>
  </main>;
}
