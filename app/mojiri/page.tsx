import Link from "next/link";
import { FloatingNav } from "../components/FloatingNav";
import tournamentData from "../../data/mojiri-tournaments.json";

type Game = { matchId: string; startedAt: string; home: string; away: string; homeGoals: number; awayGoals: number; note?: string };
type Series = { id: string; label: string; bestOf: number; participants: string[]; seriesScore: Record<string, number>; seriesWinner: string | null; advancingLoser: string; note?: string; games: Game[] };
type Round = { id: string; name: string; series: Series[] };
type Tournament = { id: string; title: string; status: string; participants: string[]; excludedMembers: string[]; rounds: Round[]; mojiri: string };

const tournament = tournamentData.tournaments[0] as Tournament;
const timeLabel = (value: string) => new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));

function SeriesCard({ series, final = false }: { series: Series; final?: boolean }) {
  return <article className={`mojiri-series ${final ? "is-final" : ""}`}>
    <header><div><span>{series.label}</span><b>{series.bestOf ? `${series.bestOf}판 ${Math.ceil(series.bestOf / 2)}선승` : "부전패"}</b></div>{final && <i>FINAL</i>}</header>
    <div className="mojiri-versus">{series.participants.map((name) => <div className={name === series.advancingLoser ? "advances" : "escapes"} key={name}><span>{name.slice(0, 1)}</span><strong>{name}<small>{name === series.advancingLoser ? final ? "이달의 모지리" : "패자 진출" : "승리 탈출"}</small></strong><b>{series.seriesScore[name] ?? 0}</b></div>)}</div>
    {series.note && <p className="bye-note">{series.note}</p>}
    {!!series.games.length && <div className="mojiri-games">{series.games.map((game, index) => <Link href={`/matches/${game.matchId}`} className={game.note ? "is-forfeit" : ""} key={game.matchId}><time>{timeLabel(game.startedAt)}</time><span>G{index + 1}</span><strong>{game.home} <b>{game.homeGoals} : {game.awayGoals}</b> {game.away}{game.note && <small>{game.note}</small>}</strong><i>›</i></Link>)}</div>}
    <footer><span>{final ? "최종 패자" : "다음 라운드"}</span><strong>{series.advancingLoser} →</strong></footer>
  </article>;
}

export default function MojiriPage() {
  const [opening, semifinal, finalRound] = tournament.rounds;
  return <main className="subpage mojiri-page"><FloatingNav />
    <header className="subhero mojiri-hero"><div><p>REVERSE TOURNAMENT · {tournament.id}</p><h1>모지리 토너먼트</h1><span>승자는 탈출, 패자는 전진. 끝까지 패배한 단 한 명을 가립니다.</span></div><div className="mojiri-crown"><i>👑</i><span>7월의 모지리</span><strong>{tournament.mojiri}</strong></div></header>
    <section className="page-shell mojiri-shell">
      <div className="mojiri-rule"><div><span>01</span><b>패자가 진출</b><small>일반 토너먼트와 반대로 시리즈 패자가 다음 라운드로 갑니다.</small></div><div><span>02</span><b>3판 2선승</b><small>1라운드와 준결승은 먼저 2승을 거둔 유저가 탈출합니다.</small></div><div><span>03</span><b>결승 5판 3선승</b><small>최종전에서 3패를 기록한 유저가 이달의 모지리가 됩니다.</small></div></div>
      <div className="mojiri-meta"><span>참가 {tournament.participants.length}명</span><span>불참 {tournament.excludedMembers.join(", ")}</span><span>경기 시작 시각 · 한국시간</span><span>결과 영구 보관 · JSON</span></div>
      <div className="reverse-bracket">
        <section><header><span>ROUND 01</span><h2>{opening.name}</h2><small>A·B·C조 + D조 부전패</small></header><div>{opening.series.map((series) => <SeriesCard series={series} key={series.id} />)}</div></section>
        <section><header><span>ROUND 02</span><h2>{semifinal.name}</h2><small>각 조 패자끼리 재대결</small></header><div>{semifinal.series.map((series) => <SeriesCard series={series} key={series.id} />)}</div></section>
        <section><header><span>LAST ROUND</span><h2>{finalRound.name}</h2><small>패배의 왕좌가 결정되는 곳</small></header><div>{finalRound.series.map((series) => <SeriesCard series={series} final key={series.id} />)}</div></section>
      </div>
      <aside className="mojiri-result"><span>JULY 2026 · HALL OF SHAME</span><div><i>👑</i><strong>{tournament.mojiri}</strong><p>최종전 1승 3패<br/>초대 이달의 모지리 등극</p></div></aside>
    </section>
  </main>;
}
