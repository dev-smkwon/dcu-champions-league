import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const env = await readFile(new URL('.env.local', root), 'utf8');
const key = env.match(/^NEXON_API_KEY=(.+)$/m)?.[1]?.trim().replace(/^['"]|['"]$/g, '');
if (!key) throw new Error('NEXON_API_KEY missing');
const headers = { 'x-nxopen-api-key': key };
const get = async id => {
  const response = await fetch(`https://open.api.nexon.com/fconline/v1/match-detail?matchid=${id}`, { headers });
  if (!response.ok) throw new Error(`${id}: NEXON ${response.status}`);
  return response.json();
};

// The user confirmed the reconstructed 9/18 opening draw. These series follow
// consecutive 21:00–22:53 pairings; warm-ups and exhibitions are excluded.
const plan = [
  { id:'round-1', name:'1라운드', series:[
    { id:'A', label:'A조', participants:['씅민쓰','박수환'], ids:['6aad25ab8b4b5febbc3d06a1','6aad281422958a3562e3b60d','6aad2a8871355951b1ba1a84'] },
    { id:'B', label:'B조', participants:['그냥강혜중','따이민'], ids:['6aad27a78e5c6f05b29b29a1','6aad2a3d78199af10437d731'] },
    { id:'C', label:'C조', participants:['대가대다님','6w91oap5jy'], ids:['6aad2d47b1ad00dedfd7746c','6aad2f9ce973b75fe5beb845'] },
    { id:'D', label:'D조', participants:['6년제'], ids:[] },
  ]},
  { id:'semifinal', name:'패자 준결승', series:[
    { id:'AB', label:'A·B조 패자전', participants:['씅민쓰','그냥강혜중'], ids:['6aad32b4c8f3937c92576c49','6aad3588cdda1e8bc442fc3d'] },
    { id:'CD', label:'C·D조 패자전', participants:['대가대다님','6년제'], ids:['6aad322fb559aa364fd7983f','6aad3593d7f98ea4152bef6d'] },
  ]},
  { id:'final', name:'최종 모지리 결정전', series:[
    { id:'FINAL', label:'최종 라운드', participants:['그냥강혜중','대가대다님'], ids:['6aad3ac8680d5c32b5fde38f','6aad3d9108e1229120298779','6aad3feccbfb1a3fe822134f'] },
  ]},
];

const ids = plan.flatMap(round => round.series.flatMap(series => series.ids));
if (new Set(ids).size !== 14) throw new Error('Expected 14 distinct matches');
const details = new Map((await Promise.all(ids.map(get))).map(match => [match.matchId, match]));
const roundData = plan.map(round => ({ id:round.id, name:round.name, series:round.series.map(series => {
  const bestOf = series.id === 'D' ? 0 : series.id === 'FINAL' ? 5 : 3;
  const score = Object.fromEntries(series.participants.map(name => [name, 0]));
  const games = series.ids.map(id => {
    const match = details.get(id);
    if (!match || match.matchType !== 40 || match.matchInfo?.length !== 2 || !match.matchInfo.every(info => series.participants.includes(info.nickname))) throw new Error(`Unexpected match ${id}`);
    const [home, away] = match.matchInfo;
    const homeGoals = Number(home.shoot.goalTotal || 0), awayGoals = Number(away.shoot.goalTotal || 0);
    const winner = home.matchDetail.matchResult === '승' ? home.nickname : away.matchDetail.matchResult === '승' ? away.nickname : homeGoals > awayGoals ? home.nickname : awayGoals > homeGoals ? away.nickname : null;
    if (winner) score[winner]++;
    return { matchId:id, startedAt:`${match.matchDate}Z`, home:home.nickname, away:away.nickname, homeGoals, awayGoals, winner, ...(homeGoals === awayGoals && home.shoot.shootOutScore !== away.shoot.shootOutScore ? { shootout:{ home:home.shoot.shootOutScore, away:away.shoot.shootOutScore } } : {}) };
  });
  if (games.some((game, index) => index && game.startedAt <= games[index-1].startedAt)) throw new Error(`Game order: ${series.id}`);
  const seriesWinner = bestOf ? series.participants.find(name => score[name] >= Math.ceil(bestOf/2)) : null;
  if (bestOf && !seriesWinner) throw new Error(`Incomplete series ${series.id}`);
  const advancingLoser = bestOf ? series.participants.find(name => name !== seriesWinner) : series.participants[0];
  return { id:series.id, label:series.label, bestOf, participants:series.participants, seriesScore:score, seriesWinner, advancingLoser, ...(bestOf ? {} : {note:'상대 없이 부전패로 준결승 진출'}), games };
}) }));

const [opening, semifinal, final] = roundData.map(round => round.series);
for (const [series, feeder] of [[semifinal[0],[opening[0],opening[1]]],[semifinal[1],[opening[2],opening[3]]],[final[0],semifinal]]) {
  if (series.participants.slice().sort().join('|') !== feeder.map(item => item.advancingLoser).sort().join('|')) throw new Error(`Bracket mismatch: ${series.id}`);
}
if (final[0].advancingLoser !== '대가대다님') throw new Error('Reported Mojiri does not match inferred bracket');

const tournament = {
  id:'2026-09', year:2026, month:9, title:'9월 모지리 토너먼트', status:'completed', playedAt:'2026-09-18',
  excludedMembers:['빅수환'], participants:['씅민쓰','박수환','그냥강혜중','따이민','대가대다님','6w91oap5jy','6년제'],
  format:{description:'각 시리즈의 패자가 다음 라운드로 진출하는 역토너먼트',earlyRoundsBestOf:3,finalBestOf:5},
  inferenceNote:'9월 18일 경기 기록과 패자 진출 규칙으로 대진을 복원했고, 1라운드 대진은 주최자에게 확인함. 20시대 연습 경기와 23:16 이후 친선경기는 제외.',
  rounds:roundData, mojiriEleven:{best:[],worst:[]}, footballRecords:[], negativeFootballRecords:[], mojiri:'대가대다님',
};

const tournamentUrl = new URL('data/mojiri-tournaments.json', root);
const archiveUrl = new URL('data/mojiri-match-details.json', root);
const archive = JSON.parse(await readFile(archiveUrl, 'utf8'));
const data = JSON.parse(await readFile(tournamentUrl, 'utf8'));
if (data.tournaments.some(item => item.id === tournament.id)) throw new Error('2026-09 is already archived');
for (const [id, match] of details) archive.matches[id] = match;
data.tournaments.unshift(tournament);
await writeFile(archiveUrl, `${JSON.stringify(archive)}\n`);
await writeFile(tournamentUrl, `${JSON.stringify(data,null,2)}\n`);
console.log(JSON.stringify({month:tournament.id,matches:ids.length,mojiri:tournament.mojiri,opening:opening.map(item=>[item.id,item.advancingLoser]),semifinal:semifinal.map(item=>[item.id,item.advancingLoser])}));
