type Game = { startedAt: string; home: string; away: string; homeGoals: number; awayGoals: number; winner?: string | null };
type Series = { participants: string[]; games: Game[]; seriesScore: Record<string, number>; seriesWinner: string | null; advancingLoser: string };
export type Cup = { id: string; status: string; mojiri: string; participants: string[]; rounds: { series: Series[] }[] };

export function buildJinxes(tournaments: Cup[]) {
  const cups = tournaments.filter(t => t.status === 'completed').sort((a,b) => a.id.localeCompare(b.id));
  const byeCups = cups.filter(t => t.rounds[0]?.series.some(s => s.participants.length === 1 && !s.games.length));
  const byeHits = byeCups.filter(t => t.rounds[0].series.some(s => s.participants.length === 1 && s.participants[0] === t.mojiri));
  const finalCases = cups.flatMap(t => {
    const final = t.rounds.at(-1)?.series[0];
    const game = final?.games.toSorted((a,b) => a.startedAt.localeCompare(b.startedAt))[0];
    if (!game) return [];
    const winner = game.winner || (game.homeGoals > game.awayGoals ? game.home : game.awayGoals > game.homeGoals ? game.away : null);
    if (!winner) return []; // An unresolved draw is not a first-game loss.
    return [{ cup:t, loser:winner === game.home ? game.away : game.home }];
  });
  const finalHits = finalCases.filter(c => c.loser === c.cup.mojiri);
  const name = '그냥강혜중';
  const entered = cups.filter(t => t.participants.includes(name));
  const halfHits = entered.filter(t => {
    const opening = t.rounds[0]?.series.find(s => s.participants.includes(name));
    const semi = t.rounds[1]?.series.find(s => s.participants.includes(name));
    if (!opening || !semi) return false;
    const opponent = (s: Series) => s.participants.find(p => p !== name) || '';
    return opening.games.length === 2 && opening.seriesScore[name] === 0 && opening.seriesScore[opponent(opening)] === 2
      && semi.games.length === 2 && semi.seriesScore[name] === 2 && semi.seriesScore[opponent(semi)] === 0;
  });
  return [
    { title:'부전패의 저주', copy:'부전패로 시작한 유저가 최종 모지리까지', hits:byeHits.length, count:byeCups.length, evidence:byeHits.map(t=>`${t.id} ${t.mojiri}`).join(' · ') },
    { title:'첫판 지면 모지리', copy:'결승 첫 경기를 진 유저가 최종 모지리로', hits:finalHits.length, count:finalCases.length, evidence:finalHits.map(c=>`${c.cup.id} ${c.loser}`).join(' · ') },
    { title:'강혜중의 반반 공식', copy:'그냥강혜중 · 첫 라운드 0:2 → 준결승 2:0, 정확히 2승 2패', hits:halfHits.length, count:entered.length, evidence:halfHits.map(t=>t.id).join(' · ') },
  ].filter(c => c.count >= 2);
}
