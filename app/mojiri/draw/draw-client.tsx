"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DrawBowl3D } from "./draw-bowl-3d";

const MEMBERS = ["씅민쓰", "6년제", "따이민", "그냥강혜중", "대가대다님", "박수환", "빅수환", "6w91oap5jy"];
const DRAW_SLOTS = ["A1", "B1", "C1", "A2", "B2", "C2", "D1"] as const;
type DrawBall = { id: string; name: string; revealed: boolean; tone: number };
type Draft = { drawId: string | null; title: string; tournamentMonth: string; participants: string[]; balls: DrawBall[]; assignments: Record<string, string>; started: boolean; complete: boolean };
const STORAGE_KEY = "dcu-mojiri-draw-draft-v1";
const month = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit" }).format(new Date()).slice(0, 7);
const initialDraft = (): Draft => ({ drawId: null, title: `${Number(month.slice(5))}월 모지리컵 조 추첨`, tournamentMonth: month, participants: [], balls: [], assignments: {}, started: false, complete: false });

function shuffle<T>(items: T[]) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const random = new Uint32Array(1); crypto.getRandomValues(random); const target = random[0] % (index + 1);
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

export function DrawClient() {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [ready, setReady] = useState(false); const [openingId, setOpeningId] = useState<string | null>(null); const [error, setError] = useState(""); const [signing, setSigning] = useState(false); const [shuffling, setShuffling] = useState(false); const [byeCelebration, setByeCelebration] = useState("");
  useEffect(() => { try { const saved = localStorage.getItem(STORAGE_KEY); if (saved) { const parsed = JSON.parse(saved) as Draft; setDraft({ ...parsed, balls: parsed.balls.map((ball, index) => ({ ...ball, tone: ball.tone ?? index })) }); } } catch {} setReady(true); }, []);
  useEffect(() => { if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(draft)); }, [draft, ready]);
  const nextSlot = DRAW_SLOTS[Object.keys(draft.assignments).length];
  const remainingBalls = draft.balls.filter((ball) => !ball.revealed);
  const groups = useMemo(() => ([{ id: "A", one: draft.assignments.A1, two: draft.assignments.A2 }, { id: "B", one: draft.assignments.B1, two: draft.assignments.B2 }, { id: "C", one: draft.assignments.C1, two: draft.assignments.C2 }, { id: "D", one: draft.assignments.D1, two: "부전패" }]), [draft.assignments]);
  const toggleParticipant = (name: string) => setDraft((current) => ({ ...current, participants: current.participants.includes(name) ? current.participants.filter((item) => item !== name) : current.participants.length < 7 ? [...current.participants, name] : current.participants }));
  const start = () => {
    if (draft.participants.length !== 7) return setError("참가자 7명을 선택해 주세요.");
    if (draft.title.trim().length < 2 || !/^\d{4}-\d{2}$/.test(draft.tournamentMonth)) return setError("대회명과 개최 월을 확인해 주세요.");
    const balls = shuffle(draft.participants).map((name, tone) => ({ id: crypto.randomUUID(), name, revealed: false, tone }));
    setDraft((current) => ({ ...current, drawId: crypto.randomUUID(), balls, assignments: {}, started: true, complete: false })); setError("");
  };
  const reveal = (ball: DrawBall) => {
    if (!nextSlot || openingId || shuffling) return;
    const isByeDraw = nextSlot === "D1";
    setOpeningId(ball.id);
    window.setTimeout(() => {
      setDraft((current) => {
        const assignments = { ...current.assignments, [nextSlot]: ball.name }; const balls = current.balls.map((item) => item.id === ball.id ? { ...item, revealed: true } : item);
        const complete = Object.keys(assignments).length === 7;
        return { ...current, balls, assignments, complete };
      });
      setOpeningId(null); if (isByeDraw) { setByeCelebration(ball.name); window.setTimeout(() => setByeCelebration(""), 3200); }
    }, 1050);
  };
  const shuffleBowl = () => {
    if (openingId || shuffling || draft.complete || remainingBalls.length < 2) return;
    setShuffling(true); window.setTimeout(() => setShuffling(false), 2300);
  };
  const reset = () => {
    if (draft.started && !window.confirm("현재 추첨을 폐기하고 새 추첨을 시작할까요? 결과와 추첨 ID가 모두 새로 만들어집니다.")) return;
    const fresh = initialDraft(); setDraft(fresh); localStorage.removeItem(STORAGE_KEY); setError("");
  };
  const finalize = async () => {
    if (!draft.complete) return;
    setSigning(true); setError("");
    try {
      const response = await fetch("/api/mojiri/draw/sign", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ drawId: draft.drawId, title: draft.title, tournamentMonth: draft.tournamentMonth, participants: draft.participants, slots: draft.assignments }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "서명 발급 실패");
      localStorage.removeItem(STORAGE_KEY); router.push(result.resultUrl);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "결과를 확정하지 못했습니다."); setSigning(false); }
  };
  if (!ready) return <div className="draw-loading">추첨함을 준비하는 중…</div>;
  return <div className="draw-layout">
    <aside className="draw-setup">
      <span>DRAW CONTROL</span><h2>{draft.started ? "추첨 진행 현황" : "참가자 설정"}</h2>
      {!draft.started ? <><label>대회명<input value={draft.title} maxLength={40} onChange={(event) => setDraft({ ...draft, title: event.target.value })}/></label><label>개최 월<input type="month" value={draft.tournamentMonth} onChange={(event) => setDraft({ ...draft, tournamentMonth: event.target.value })}/></label><div className="participant-picks">{MEMBERS.map((name) => <button type="button" className={draft.participants.includes(name) ? "selected" : ""} onClick={() => toggleParticipant(name)} key={name}><i>{name.slice(0, 1)}</i><b>{name}</b><span>{draft.participants.includes(name) ? "참가" : "대기"}</span></button>)}</div><p>{draft.participants.length}/7명 선택 · 선택되지 않은 유저는 불참</p><button className="draw-primary" type="button" onClick={start}>명단 잠금 · 추첨 시작</button></> : <><code className="live-draw-id">DRAW ID · {draft.drawId}</code><div className="draw-order">{DRAW_SLOTS.map((slot, index) => <div className={draft.assignments[slot] ? "done" : slot === nextSlot ? "current" : ""} key={slot}><span>{index + 1}</span><b>{slot}</b><strong>{draft.assignments[slot] || (slot === "D1" ? "마지막 공 직접 추첨" : "추첨 대기")}</strong></div>)}</div><button className="draw-reset" type="button" onClick={reset}>새 추첨 시작</button></>}
      {error && <p className="draw-error">{error}</p>}
    </aside>
    <section className={`draw-stage ${nextSlot === "D1" ? "bye-round" : ""}`}>
      <header><span>MOJIRI CUP · OFFICIAL DRAW</span><h1>{draft.started ? draft.complete ? "대진 추첨 완료" : nextSlot === "D1" ? "운명의 부전패 추첨" : `${nextSlot} 추첨` : "조 추첨식"}</h1><p>{draft.started ? draft.complete ? "마지막 공까지 직접 열어 모든 운명이 확정되었습니다." : nextSlot === "D1" ? "마지막 공을 열면 싸워보기도 전에 패자 준결승으로 직행합니다." : "원하는 공을 선택해 참가자를 공개하세요." : "참가자 7명을 확정하면 추첨함이 열립니다."}</p></header>
      {draft.started && !draft.complete && remainingBalls.length > 1 && <button className={`shuffle-balls ${shuffling ? "active" : ""}`} type="button" disabled={!!openingId || shuffling} onClick={shuffleBowl}>↻ {shuffling ? "캡슐 섞는 중…" : "캡슐 섞기"}</button>}
      <div className={`draw-bowl ${draft.started ? "is-ready" : ""} ${shuffling ? "shuffling" : ""}`}>{draft.started ? <DrawBowl3D balls={remainingBalls.map((ball) => ({ id: ball.id }))} shuffling={shuffling} disabled={draft.complete || !!openingId || shuffling} onReveal={(id) => { const ball = remainingBalls.find((item) => item.id === id); if (ball) reveal(ball); }}/> : <div className="empty-bowl"><i>🤡</i><strong>THE DRAW AWAITS</strong></div>}{openingId && <div className={`three-ball-reveal ${nextSlot === "D1" ? "bye" : ""}`}><span>OPENING BALL</span><strong>{draft.balls.find((ball) => ball.id === openingId)?.name}</strong></div>}</div>
      {byeCelebration && <div className="bye-celebration"><i>🤡</i><span>축! 경기 시작 전 1패 적립</span><strong>{byeCelebration}</strong><p>싸우지도 않고 패자 준결승 직행!</p></div>}
      {draft.complete && <button className="draw-finalize" type="button" disabled={signing} onClick={finalize}>{signing ? "공식 서명 발급 중…" : "결과 확정 · 공유 URL 만들기"}</button>}
    </section>
    <aside className="draw-bracket-preview"><span>LIVE BRACKET</span><h2>1라운드 대진</h2>{groups.map((group) => <article className={group.id === "D" ? "bye" : ""} key={group.id}><b>{group.id}조</b><div><strong>{group.one || "—"}</strong><i>{group.id === "D" ? "BYE" : "VS"}</i><strong>{group.two || "—"}</strong></div></article>)}</aside>
  </div>;
}
