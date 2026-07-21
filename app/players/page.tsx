"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FloatingNav } from "../components/FloatingNav";
import { LoadingState } from "../components/LoadingState";

type Player = { rank: number; name: string; p: number; w: number; d: number; l: number; gf: number; ga: number; gd: number; pts: number; form: string[] };

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[] | null>(null);
  useEffect(() => { fetch("/api/league").then((r) => r.json()).then((data) => setPlayers(data.standings?.excludingShootout || [])); }, []);
  return <main className="subpage"><FloatingNav />
    <header className="subhero"><p>THE SQUAD</p><h1>리그 선수</h1><span>8명의 감독, 하나의 테이블</span></header>
    <section className="page-shell">{!players ? <LoadingState /> : <div className="player-grid">{players.map((player) => <Link href={`/players/${encodeURIComponent(player.name)}`} className="player-card" key={player.name}>
      <div className="player-card-top"><span>{player.rank.toString().padStart(2, "0")}</span><i>{player.name.slice(0, 1)}</i></div><h2>{player.name}</h2><p>{player.pts} PTS · {player.p} MATCHES</p>
      <div className="player-record"><span><b>{player.w}</b>승</span><span><b>{player.d}</b>무</span><span><b>{player.l}</b>패</span><span><b>{player.gd > 0 ? `+${player.gd}` : player.gd}</b>득실</span></div>
      <div className="form">{player.form.map((f, i) => <i className={f} key={i}>{f}</i>)}</div><em>상세 보기 →</em>
    </Link>)}</div>}</section>
  </main>;
}
