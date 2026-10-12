type Game = { startedAt: string; home: string; away: string; homeGoals: number; awayGoals: number; winner?: string | null };
type Series = { id?: string; participants: string[]; games: Game[]; seriesScore: Record<string, number>; seriesWinner: string | null; advancingLoser: string; bestOf?: number };
export type Cup = { id: string; status: string; mojiri: string; participants: string[]; rounds: { series: Series[] }[] };

export type JinxCard = { title: string; copy: string; hits: number; count: number; evidence: string; event?: boolean };
export type MojiriCareer = {
  name: string; cups: number; finals: number; mojiri: number; mojiriRate: number; finalEscapeRate: number;
  seriesPlayed: number; seriesEscapes: number; seriesEscapeRate: number; sweepLosses: number; decidingSeries: number;
  goalsFor: number; goalsAgainst: number; biggestDefeat: number; nemesis: string; nemesisLosses: number;
  maxFinalStreak: number; maxMojiriStreak: number; maxEarlyEscapeStreak: number;
};

const completed = (tournaments: Cup[]) => tournaments.filter(t => t.status === 'completed').sort((a,b) => a.id.localeCompare(b.id));
const finalSeries = (cup: Cup) => cup.rounds.at(-1)?.series[0];
const opponent = (series: Series, name: string) => series.participants.find(p => p !== name) || '';
const isSweepLoss = (series: Series, name: string) => {
  if (!series.games.length || series.seriesWinner === name) return false;
  const other = opponent(series, name);
  return (series.seriesScore[name] || 0) === 0 && (series.seriesScore[other] || 0) === Math.ceil((series.bestOf || (series.games.length > 3 ? 5 : 3)) / 2);
};

export function buildJinxes(tournaments: Cup[]): JinxCard[] {
  const cups = completed(tournaments);
  const byeCups = cups.filter(t => t.rounds[0]?.series.some(s => s.participants.length === 1 && !s.games.length));
  const byeHits = byeCups.filter(t => t.rounds[0].series.some(s => s.participants.length === 1 && s.participants[0] === t.mojiri));
  const finalCases = cups.flatMap(t => {
    const final = finalSeries(t);
    const game = final?.games.toSorted((a,b) => a.startedAt.localeCompare(b.startedAt))[0];
    if (!game) return [];
    const winner = game.winner || (game.homeGoals > game.awayGoals ? game.home : game.awayGoals > game.homeGoals ? game.away : null);
    if (!winner) return [];
    return [{ cup:t, loser:winner === game.home ? game.away : game.home }];
  });
  const finalHits = finalCases.filter(c => c.loser === c.cup.mojiri);

  const hyejung = '그냥강혜중';
  const hyejungEntered = cups.filter(t => t.participants.includes(hyejung));
  const hyejungOpeningSweeps = hyejungEntered.filter(t => {
    const opening = t.rounds[0]?.series.find(s => s.participants.includes(hyejung));
    return opening ? isSweepLoss(opening, hyejung) : false;
  });

  const danim = '대가대다님';
  const danimEntered = cups.filter(t => t.participants.includes(danim));
  const danimFinals = danimEntered.filter(t => finalSeries(t)?.participants.includes(danim));

  const suwhan = '박수환';
  const suwhanSeries = cups.flatMap(t => t.rounds.flatMap(r => r.series.map(s => ({ cup:t, series:s })))).filter(x => x.series.games.length && x.series.participants.includes(suwhan));
  const suwhanWins = suwhanSeries.filter(x => x.series.seriesWinner === suwhan);

  const reboundCases = cups.slice(0,-1).map((cup,index) => ({ previous:cup, next:cups[index+1] })).filter(x => x.next.participants.includes(x.previous.mojiri));
  const reboundHits = reboundCases.filter(x => x.next.mojiri !== x.previous.mojiri);

  const rematches = cups.slice(0,-1).flatMap((cup,index) => {
    const next = cups[index+1], before = finalSeries(cup), after = finalSeries(next);
    if (!before || !after || before.participants.slice().sort().join('|') !== after.participants.slice().sort().join('|')) return [];
    return [{ before:cup, after:next, winner:after.seriesWinner, previousMojiri:cup.mojiri }];
  });
  const revengeHits = rematches.filter(x => x.winner === x.previousMojiri);

  return [
    { title:'강혜중의 첫 관문 자동문', copy:'그냥강혜중이 1라운드에서 0:2 셧아웃 패배', hits:hyejungOpeningSweeps.length, count:hyejungEntered.length, evidence:hyejungOpeningSweeps.map(t=>t.id).join(' · ') },
    { title:'대가대다님의 결승 정기권', copy:'대가대다님이 참가한 대회에서 결승까지 생존', hits:danimFinals.length, count:danimEntered.length, evidence:danimFinals.map(t=>`${t.id}${t.mojiri === danim ? ' 모지리' : ' 탈출'}`).join(' · ') },
    { title:'박수환의 모지리 안전지대', copy:'박수환이 실제로 치른 토너먼트 시리즈에서 승리 탈출', hits:suwhanWins.length, count:suwhanSeries.length, evidence:suwhanWins.map(x=>`${x.cup.id} ${x.series.id || ''}`).join(' · ') },
    { title:'전월 모지리의 반등', copy:'전월 모지리가 다음 대회에서 연속 모지리를 피함', hits:reboundHits.length, count:reboundCases.length, evidence:reboundHits.map(x=>`${x.previous.mojiri} · ${x.previous.id}→${x.next.id}`).join(' · ') },
    { title:'결승 첫판의 저주', copy:'결승 첫 경기를 진 유저가 최종 모지리로', hits:finalHits.length, count:finalCases.length, evidence:finalHits.map(c=>`${c.cup.id} ${c.loser}`).join(' · ') },
    { title:'부전패 복불복', copy:'부전패로 시작한 유저가 최종 모지리까지 생존', hits:byeHits.length, count:byeCups.length, evidence:byeHits.map(t=>`${t.id} ${t.mojiri}`).join(' · ') },
    { title:'결승 리벤지 매치', copy:'연속 결승 재대결에서 전월 모지리가 복수에 성공', hits:revengeHits.length, count:rematches.length, evidence:revengeHits.map(x=>`${x.before.id}→${x.after.id} ${x.previousMojiri}`).join(' · '), event:true },
  ].filter(c => c.count > 0);
}

const maxRun = (values: boolean[]) => values.reduce((state, value) => ({ current:value ? state.current + 1 : 0, max:Math.max(state.max, value ? state.current + 1 : 0) }), { current:0, max:0 }).max;

export function buildMojiriCareers(tournaments: Cup[]): MojiriCareer[] {
  const cups = completed(tournaments);
  const names = [...new Set(cups.flatMap(cup => cup.participants))];
  return names.map(name => {
    const entered = cups.filter(cup => cup.participants.includes(name));
    let finals = 0, titles = 0, seriesPlayed = 0, seriesEscapes = 0, sweepLosses = 0, decidingSeries = 0;
    let goalsFor = 0, goalsAgainst = 0, biggestDefeat = 0;
    const nemeses = new Map<string,number>();
    for (const cup of entered) {
      if (finalSeries(cup)?.participants.includes(name)) finals++;
      if (cup.mojiri === name) titles++;
      for (const series of cup.rounds.flatMap(r => r.series).filter(s => s.participants.includes(name))) {
        if (!series.games.length) continue;
        seriesPlayed++;
        if (series.seriesWinner === name) seriesEscapes++;
        else { const other=opponent(series,name); if(other) nemeses.set(other,(nemeses.get(other)||0)+1); }
        if (isSweepLoss(series,name)) sweepLosses++;
        if (series.games.length === (series.bestOf || (series.games.length > 3 ? 5 : 3))) decidingSeries++;
        for (const game of series.games) {
          const home = game.home === name;
          const gf = home ? game.homeGoals : game.awayGoals, ga = home ? game.awayGoals : game.homeGoals;
          goalsFor += gf; goalsAgainst += ga;
          const lost = game.winner ? game.winner !== name : gf < ga;
          if (lost) biggestDefeat = Math.max(biggestDefeat, ga-gf);
        }
      }
    }
    const nemesisEntry = [...nemeses].sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0],'ko'))[0];
    const finalFlags = entered.map(cup => !!finalSeries(cup)?.participants.includes(name));
    const titleFlags = entered.map(cup => cup.mojiri === name);
    const earlyFlags = entered.map(cup => !finalSeries(cup)?.participants.includes(name));
    return {
      name, cups:entered.length, finals, mojiri:titles, mojiriRate:entered.length ? titles/entered.length*100 : 0,
      finalEscapeRate:finals ? (finals-titles)/finals*100 : 0, seriesPlayed, seriesEscapes,
      seriesEscapeRate:seriesPlayed ? seriesEscapes/seriesPlayed*100 : 0, sweepLosses, decidingSeries,
      goalsFor, goalsAgainst, biggestDefeat, nemesis:nemesisEntry?.[0] || '-', nemesisLosses:nemesisEntry?.[1] || 0,
      maxFinalStreak:maxRun(finalFlags), maxMojiriStreak:maxRun(titleFlags), maxEarlyEscapeStreak:maxRun(earlyFlags),
    };
  });
}
