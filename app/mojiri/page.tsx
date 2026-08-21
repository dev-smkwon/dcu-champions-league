import Link from "next/link";
import { FloatingNav } from "../components/FloatingNav";
import tournamentData from "../../data/mojiri-tournaments.json";

type Game = { matchId: string; startedAt: string; home: string; away: string; homeGoals: number; awayGoals: number; note?: string };
type Series = { id: string; label: string; bestOf: number; participants: string[]; seriesScore: Record<string, number>; seriesWinner: string | null; advancingLoser: string; note?: string; games: Game[] };
type Round = { id: string; name: string; series: Series[] };
type FootballRecord = { id: string; title: string; icon: string; owner: string; player: string; spId?: number; value: number; unit: string; proxy?: boolean };
type ElevenPlayer = { owner: string; spId: number; name: string; position: number; grade: number; appearances: number; goals: number; assists: number; rating: number };
type Tournament = { id: string; title: string; status: string; participants: string[]; excludedMembers: string[]; rounds: Round[]; mojiriEleven: { best: ElevenPlayer[]; worst: ElevenPlayer[] }; footballRecords: FootballRecord[]; negativeFootballRecords: FootballRecord[]; mojiri: string };
type MojiriStat = { name: string; played: number; wins: number; losses: number; goalsFor: number; goalsAgainst: number; scoreless: number; biggestDefeat: number; maxLosingStreak: number; forfeits: number; titles: number };

const tournaments = tournamentData.tournaments as Tournament[];
const tournament = tournaments[0];
const timeLabel = (value: string) => new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));

function buildMojiriStats() {
  const names = [...new Set(tournaments.flatMap((item) => item.participants))];
  const stats = new Map(names.map((name) => [name, { name, played: 0, wins: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, scoreless: 0, biggestDefeat: 0, maxLosingStreak: 0, forfeits: 0, titles: 0 } satisfies MojiriStat]));
  const histories = new Map(names.map((name) => [name, [] as { at: string; lost: boolean }[]]));
  tournaments.forEach((item) => {
    stats.get(item.mojiri)!.titles += 1;
    item.rounds.flatMap((round) => round.series).flatMap((series) => series.games).forEach((game) => {
      const home = stats.get(game.home)!;
      const away = stats.get(game.away)!;
      const homeLost = game.homeGoals < game.awayGoals;
      const awayLost = game.awayGoals < game.homeGoals;
      home.played += 1; away.played += 1;
      home.goalsFor += game.homeGoals; home.goalsAgainst += game.awayGoals;
      away.goalsFor += game.awayGoals; away.goalsAgainst += game.homeGoals;
      if (homeLost) { home.losses += 1; away.wins += 1; home.biggestDefeat = Math.max(home.biggestDefeat, game.awayGoals - game.homeGoals); }
      if (awayLost) { away.losses += 1; home.wins += 1; away.biggestDefeat = Math.max(away.biggestDefeat, game.homeGoals - game.awayGoals); }
      if (game.homeGoals === 0) home.scoreless += 1;
      if (game.awayGoals === 0) away.scoreless += 1;
      if (game.note?.includes("몰수패")) (homeLost ? home : away).forfeits += 1;
      histories.get(game.home)!.push({ at: game.startedAt, lost: homeLost });
      histories.get(game.away)!.push({ at: game.startedAt, lost: awayLost });
    });
  });
  histories.forEach((history, name) => {
    let streak = 0;
    history.sort((a, b) => a.at.localeCompare(b.at)).forEach(({ lost }) => { streak = lost ? streak + 1 : 0; stats.get(name)!.maxLosingStreak = Math.max(stats.get(name)!.maxLosingStreak, streak); });
  });
  return [...stats.values()].filter((stat) => stat.played > 0);
}

const mojiriStats = buildMojiriStats();
const leaders = (value: (stat: MojiriStat) => number, direction: "max" | "min" = "max") => {
  const ranked = mojiriStats.map((stat) => ({ stat, value: value(stat) }));
  const best = direction === "max" ? Math.max(...ranked.map((item) => item.value)) : Math.min(...ranked.map((item) => item.value));
  return { names: ranked.filter((item) => item.value === best).map((item) => item.stat.name).join(" · "), value: best };
};

function RecordCard({ icon, title, copy, result, unit, negative = false }: { icon: string; title: string; copy: string; result: { names: string; value: number }; unit: string; negative?: boolean }) {
  return <article className={`mojiri-record ${negative ? "is-negative" : "is-positive"}`}><div><i>{icon}</i><span><b>{title}</b><small>{copy}</small></span></div><strong>{result.names}</strong><p>{Number.isInteger(result.value) ? result.value : result.value.toFixed(1)}{unit}</p></article>;
}

function FootballRecordCard({ record, negative = false }: { record: FootballRecord; negative?: boolean }) {
  return <article className={`mojiri-football-record ${negative ? "is-negative" : ""} record-${record.id}`}><i>{record.icon}</i><div><span>{record.title}{record.proxy && <em>추정</em>}</span><strong>{record.player}</strong><small>{record.spId ? `${record.owner}의 선수` : record.owner === "-" ? "해당 기록 없음" : "유저 기록"}</small></div><b>{Number.isInteger(record.value) ? record.value : record.value.toFixed(2)}<small>{record.unit}</small></b></article>;
}

function BracketConnector({ from }: { from: 4 | 2 }) {
  const paths = from === 4
    ? ["M0 12.5 H50 V25 H100", "M0 37.5 H50 V25", "M0 62.5 H50 V75 H100", "M0 87.5 H50 V75"]
    : ["M0 25 H50 V50 H100", "M0 75 H50 V50"];
  return <div className="bracket-connector" aria-hidden="true"><svg viewBox="0 0 100 100" preserveAspectRatio="none">{paths.map((path) => <path d={path} vectorEffect="non-scaling-stroke" key={path} />)}</svg></div>;
}

function MojiriLineup({ title, subtitle, players, best }: { title: string; subtitle: string; players: ElevenPlayer[]; best: boolean }) {
  const rows = [[...players.filter((player) => player.position >= 20)], [...players.filter((player) => player.position >= 9 && player.position < 20)], [...players.filter((player) => player.position > 0 && player.position < 9)], [...players.filter((player) => player.position === 0)]];
  return <article className={`mojiri-lineup ${best ? "is-best" : "is-worst"}`}><header><span>{best ? "CLOSE TO MOJIRI" : "FAR FROM MOJIRI"}</span><h3>{title}</h3><p>{subtitle}</p></header><div className="mojiri-lineup-pitch"><i className="pitch-half"/><i className="pitch-circle"/>{rows.map((row, rowIndex) => <div className={`lineup-row row-${rowIndex}`} key={rowIndex}>{row.map((player) => <div className="lineup-player" key={`${player.owner}-${player.spId}`}><b>{player.name}</b><span>{player.owner} · +{player.grade}</span><small>{player.appearances}경기 · {player.goals}골 {player.assists}도움 · <em>{player.rating.toFixed(2)}</em></small></div>)}</div>)}</div></article>;
}

function SeriesCard({ series, final = false }: { series: Series; final?: boolean }) {
  return <article className={`mojiri-series ${final ? "is-final" : ""}`}>
    <header><div><span>{series.label}</span><b>{series.bestOf ? `${series.bestOf}판 ${Math.ceil(series.bestOf / 2)}선승` : "부전패"}</b></div>{final && <i>FINAL</i>}</header>
    <div className="mojiri-versus">{series.participants.map((name) => { const advances = name === series.advancingLoser; return <div className={advances ? final ? "advances final-advances" : "advances" : "escapes"} key={name}><span>{name.slice(0, 1)}</span><strong>{name}<small>{advances ? final ? "★ 이달의 모지리" : "→ 패자 진출" : "승리 탈출"}</small></strong><b>{series.seriesScore[name] ?? 0}</b></div>; })}</div>
    {series.note && <p className="bye-note">{series.note}</p>}
    {!!series.games.length && <details className="mojiri-game-fold"><summary>경기 기록 {series.games.length}개 보기</summary><div className="mojiri-games">{series.games.map((game, index) => <Link href={`/matches/${game.matchId}`} className={game.note ? "is-forfeit" : ""} key={game.matchId}><time>{timeLabel(game.startedAt)}</time><span>G{index + 1}</span><strong>{game.home} <b>{game.homeGoals} : {game.awayGoals}</b> {game.away}{game.note && <small>{game.note}</small>}</strong><i>›</i></Link>)}</div></details>}
  </article>;
}

export default function MojiriPage() {
  const [opening, semifinal, finalRound] = tournament.rounds;
  const tournamentGames = tournament.rounds.flatMap((round) => round.series.flatMap((series) => series.games.map((game, index) => ({ ...game, round: round.name, series: series.label, gameNumber: index + 1 })))).sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  return <main className="subpage mojiri-page"><FloatingNav />
    <header className="subhero mojiri-hero"><div><p>REVERSE TOURNAMENT · {tournament.id}</p><h1>모지리 토너먼트</h1><span>끝까지 살아남은 패배자, 단 한 명.</span><Link className="mojiri-draw-link" href="/mojiri/live">8월 결과 · 내일 09:00 공개 →</Link><Link className="mojiri-draw-link" href="/mojiri/draw">조 추첨식 열기 →</Link></div><div className="mojiri-crown"><i>🤡</i><span>7월의 모지리</span><strong>{tournament.mojiri}</strong></div></header>
    <section className="page-shell mojiri-shell">
      <div className="reverse-bracket">
        <section><header><span>ROUND 01</span><h2>{opening.name}</h2></header><div>{opening.series.map((series) => <SeriesCard series={series} key={series.id} />)}</div></section>
        <BracketConnector from={4} />
        <section><header><span>ROUND 02</span><h2>{semifinal.name}</h2></header><div>{semifinal.series.map((series) => <SeriesCard series={series} key={series.id} />)}</div></section>
        <BracketConnector from={2} />
        <section><header><span>FINAL</span><h2>{finalRound.name}</h2></header><div>{finalRound.series.map((series) => <SeriesCard series={series} final key={series.id} />)}</div></section>
      </div>
      <aside className="mojiri-result"><span>JULY 2026 · HALL OF SHAME</span><div><i>🤡</i><strong>{tournament.mojiri}</strong><p>최종전 1승 3패<br/>초대 이달의 모지리 등극</p></div></aside>
      <section className="mojiri-records"><header><div><span>MOJIRI ARCHIVE</span><h2>모지리 기록실</h2></div><p>저장된 모든 모지리 대회 누적 · 공동 기록은 함께 수상</p></header>
        <section className="mojiri-eleven"><header><div><span>REVERSE BEST ELEVEN · 4-3-3</span><h2>모지리 베스트 & 워스트 11</h2></div><p>BEST 11: 패자 진출 경험 필수 · 선수 최소 2경기</p></header><div><MojiriLineup title="모지리 BEST 11" subtitle="패배하며 살아남은 스쿼드만 후보" players={tournament.mojiriEleven.best} best/><MojiriLineup title="모지리 WORST 11" subtitle="너무 잘해서 탈락 · 전체 참가자 대상" players={tournament.mojiriEleven.worst} best={false}/></div><aside><b>BEST 11 후보 조건</b><span>소속 유저가 최소 한 번 패자로 다음 라운드에 진출해야 하며, 선수는 2경기 이상 출전해야 합니다. 이후 포지션 평균 3경기분을 섞어 표본을 보정합니다. WORST 11은 전체 참가자를 대상으로 기존 기준을 유지합니다.</span></aside></section>
        <h3 className="football-title">기본 축구 기록 <small>7월 대회 · API 기록 보관</small></h3><div className="mojiri-football-grid">{tournament.footballRecords.map((record) => <FootballRecordCard record={record} key={record.id} />)}</div>
        <h3>그래도 잘한 것들</h3><div className="mojiri-record-grid positive-grid">
          <RecordCard icon="🏃" title="탈출왕" copy="가장 적은 경기만 치르고 빠르게 탈출" result={leaders((stat) => stat.played, "min")} unit="경기" />
          <RecordCard icon="💥" title="화풀이 장인" copy="경기 수를 보정한 경기당 최다 득점" result={leaders((stat) => stat.goalsFor / stat.played)} unit="골/경기" />
          <RecordCard icon="🔒" title="문단속 우등생" copy="경기당 실점을 가장 적게 한 사람" result={leaders((stat) => stat.goalsAgainst / stat.played, "min")} unit="골/경기" />
        </div>
        <h3 className="negative-title">본격 흑역사</h3><div className="mojiri-record-grid">
          <RecordCard negative icon="🛍️" title="패배 수집가" copy="패배라면 일단 주워 담고 보는 사람" result={leaders((stat) => stat.losses)} unit="패" />
          <RecordCard negative icon="🚪" title="자동문" copy="상대 공격수에게 늘 열려 있던 수비" result={leaders((stat) => stat.goalsAgainst)} unit="실점" />
          <RecordCard negative icon="🥚" title="무득점 장인" copy="골망과 철저히 거리를 둔 경기" result={leaders((stat) => stat.scoreless)} unit="경기" />
          <RecordCard negative icon="💣" title="대패 전문점" copy="한 경기 최대 점수 차 패배" result={leaders((stat) => stat.biggestDefeat)} unit="골 차" />
          <RecordCard negative icon="🎢" title="연패 풀코스" copy="브레이크 없이 이어진 최장 연패" result={leaders((stat) => stat.maxLosingStreak)} unit="연패" />
          <RecordCard negative icon="📉" title="승률 실종 사건" copy="승리를 가장 찾기 어려웠던 사람" result={leaders((stat) => stat.wins / stat.played * 100, "min")} unit="%" />
          <RecordCard negative icon="🎁" title="경기당 골 나눔" copy="매 경기 가장 후하게 실점한 사람" result={leaders((stat) => stat.goalsAgainst / stat.played)} unit="골/경기" />
          <RecordCard negative icon="🤡" title="모지리 GOAT" copy="이달의 모지리에 가장 많이 오른 사람" result={leaders((stat) => stat.titles)} unit="회" />
          <RecordCard negative icon="🕳️" title="골득실 블랙홀" copy="넣은 골보다 먹힌 골이 가장 많았던 사람" result={leaders((stat) => stat.goalsAgainst - stat.goalsFor)} unit="골" />
        </div>
        <details className="mojiri-extra-records"><summary><span>선수·경기 세부 흑역사</span><b>{tournament.negativeFootballRecords.length}개 기록 펼쳐보기 ↓</b></summary><div className="mojiri-football-grid negative-football-grid">{tournament.negativeFootballRecords.map((record) => <FootballRecordCard record={record} negative key={record.id} />)}</div><p>비율 기록은 최소 2경기 및 항목별 최소 시도 조건을 적용했습니다. `추정` 표시는 API가 사건 간 직접 연결을 제공하지 않아 근사값으로 계산한 기록입니다.</p></details>
        <section className="mojiri-match-archive"><header><div><span>FULL MATCH TIMELINE</span><h3>모든 경기</h3></div><p>전체 {tournamentGames.length}경기 · 한국시간 · 오래된 경기순</p></header><div>{tournamentGames.map((game) => <Link href={`/matches/${game.matchId}`} className={game.note ? "is-forfeit" : ""} key={game.matchId}><time>{timeLabel(game.startedAt)}</time><span>{game.round}<small>{game.series} · G{game.gameNumber}</small></span><strong>{game.home}</strong><b>{game.homeGoals}<i>:</i>{game.awayGoals}</b><strong>{game.away}</strong><em>{game.note || "상세 보기 ›"}</em></Link>)}</div></section>
      </section>
    </section>
  </main>;
}
