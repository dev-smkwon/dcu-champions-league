"use client";

import Link from "next/link";
import type { MojiriDrawPayload } from "../../../../lib/mojiri-draw";

const SLOT_ORDER = ["A1", "B1", "C1", "A2", "B2", "C2", "D1"] as const;

function downloadJson(payload: MojiriDrawPayload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" }); const href = URL.createObjectURL(blob); const anchor = document.createElement("a");
  anchor.href = href; anchor.download = `${payload.tournamentMonth}-mojiri-draw.json`; anchor.click(); URL.revokeObjectURL(href);
}

function downloadPng(payload: MojiriDrawPayload) {
  const canvas = document.createElement("canvas"); canvas.width = 1600; canvas.height = 900; const context = canvas.getContext("2d"); if (!context) return;
  const gradient = context.createLinearGradient(0, 0, 1600, 900); gradient.addColorStop(0, "#07133b"); gradient.addColorStop(.55, "#173b9e"); gradient.addColorStop(1, "#07112f"); context.fillStyle = gradient; context.fillRect(0, 0, 1600, 900);
  context.strokeStyle = "rgba(255,255,255,.12)"; context.lineWidth = 2; for (let radius = 180; radius < 760; radius += 145) { context.beginPath(); context.arc(1320, 120, radius, 0, Math.PI * 2); context.stroke(); }
  context.fillStyle = "#77a2ff"; context.font = "700 25px Arial"; context.fillText("DCU CHAMPIONS LEAGUE · OFFICIAL DRAW", 105, 105);
  context.fillStyle = "#fff"; context.font = "900 74px 'Noto Sans KR', Arial"; context.fillText(payload.title, 105, 205);
  context.fillStyle = "#c8d5f5"; context.font = "500 25px 'Noto Sans KR', Arial"; context.fillText(`추첨 ID  ${payload.drawId}`, 108, 255);
  const groups = [{ label: "A조", a: payload.slots.A1, b: payload.slots.A2 }, { label: "B조", a: payload.slots.B1, b: payload.slots.B2 }, { label: "C조", a: payload.slots.C1, b: payload.slots.C2 }, { label: "D조", a: payload.slots.D1, b: "부전패" }];
  groups.forEach((group, index) => { const x = 105 + (index % 2) * 745; const y = 345 + Math.floor(index / 2) * 235; context.fillStyle = "rgba(255,255,255,.09)"; context.beginPath(); context.roundRect(x, y, 675, 180, 28); context.fill(); context.fillStyle = index === 3 ? "#f2c45b" : "#77a2ff"; context.font = "800 23px 'Noto Sans KR', Arial"; context.fillText(group.label, x + 35, y + 48); context.fillStyle = "#fff"; context.font = "800 34px 'Noto Sans KR', Arial"; context.fillText(group.a, x + 35, y + 115); context.fillStyle = "#7f93c3"; context.font = "800 20px Arial"; context.fillText(index === 3 ? "BYE" : "VS", x + 310, y + 112); context.fillStyle = index === 3 ? "#f2c45b" : "#fff"; context.font = "800 34px 'Noto Sans KR', Arial"; context.textAlign = "right"; context.fillText(group.b, x + 640, y + 115); context.textAlign = "left"; });
  context.fillStyle = "#8393bb"; context.font = "500 20px 'Noto Sans KR', Arial"; context.fillText("서명으로 검증된 1회성 조 추첨 결과 · dcu-champions-league.vercel.app", 105, 835);
  const anchor = document.createElement("a"); anchor.download = `${payload.tournamentMonth}-mojiri-draw.png`; anchor.href = canvas.toDataURL("image/png"); anchor.click();
}

export function ResultClient({ payload }: { payload: MojiriDrawPayload }) {
  const groups = [{ label: "A조", slots: ["A1", "A2"] as const }, { label: "B조", slots: ["B1", "B2"] as const }, { label: "C조", slots: ["C1", "C2"] as const }, { label: "D조", slots: ["D1"] as const }];
  const copyResult = async () => {
    const rows = SLOT_ORDER.map((slot) => `${slot}: ${payload.slots[slot]}${slot === "D1" ? " — 부전패" : ""}`).join("\n"); await navigator.clipboard.writeText(`${payload.title}\n\n${rows}\n\n추첨 ID: ${payload.drawId}\n${window.location.href}`);
  };
  return <main className="draw-result-page"><header><div className="verified-mark"><i>✓</i><span><b>서명된 추첨 결과</b><small>데이터 검증 완료</small></span></div><p>MOJIRI CUP · {payload.tournamentMonth}</p><h1>{payload.title}</h1><span>{new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "long", timeStyle: "short" }).format(new Date(payload.drawnAt))}</span></header><section className="result-bracket">{groups.map((group) => <article className={group.label === "D조" ? "bye" : ""} key={group.label}><span>{group.label}</span><div><strong>{payload.slots[group.slots[0]]}</strong><i>{group.slots.length === 1 ? "부전패" : "VS"}</i><strong>{group.slots.length === 2 ? payload.slots[group.slots[1]] : "준결승 직행"}</strong></div><small>{group.slots.join(" · ")}</small></article>)}</section><aside className="draw-proof"><span>DRAW ID</span><code>{payload.drawId}</code><p>이 주소의 결과 데이터는 발급 후 변경되지 않았음을 서버 서명으로 검증합니다. 운영자 신원이나 무작위성 자체를 인증하는 장치는 아닙니다.</p></aside><div className="result-actions"><button onClick={copyResult}>결과·URL 복사</button><button onClick={() => downloadPng(payload)}>PNG 저장</button><button onClick={() => downloadJson(payload)}>JSON 저장</button><Link href="/mojiri/draw">새 추첨 시작</Link></div></main>;
}
