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

// Draw ID 63a9e4cd-8e4b-4abf-930d-1a26d0df0436. The 17 consecutive
// tournament games started 14 minutes after the signed draw was created.
const plan = [
  { id:'round-1', name:'1라운드', series:[
    { id:'A', label:'A조', participants:['대가대다님','6년제'], ids:['6ac0ba0036ed2583e4caf7d7','6ac0bc48c94b4d0ffa05ea99','6ac0bf869d6c6b8ccfb8451b'] },
    { id:'B', label:'B조', participants:['따이민','씅민쓰'], ids:['6ac0b9d47e091da8c74fdc53','6ac0bc68168568dc2bb21233'] },
    { id:'C', label:'C조', participants:['그냥강혜중','6w91oap5jy'], ids:['6ac0b9db2c00d21fa02a8e55','6ac0bde29ba25e2f836fee08'] },
    { id:'D', label:'D조', participants:['박수환'], ids:[] },
  ]},
  { id:'semifinal', name:'패자 준결승', series:[
    { id:'AB', label:'A·B조 패자전', participants:['대가대다님','씅민쓰'], ids:['6ac0c2fd85b4a30e76a279b5','6ac0c581dac3180d0fa0c86b','6ac0c81b02d0d9b9a646afff'] },
    { id:'CD', label:'C·D조 패자전', participants:['그냥강혜중','박수환'], ids:['6ac0c1c61f637942b489bcc6','6ac0c417a83d98db9e2cc80b'] },
  ]},
  { id:'final', name:'최종 모지리 결정전', series:[
    { id:'FINAL', label:'최종 라운드', participants:['그냥강혜중','대가대다님'], ids:['6ac0cbcc976cd3772b43b9fc','6ac0ce650df70d09255d94a0','6ac0d0fc7e3330500d43f478','6ac0d38f6cc14627842632de','6ac0d717989a861132355566'] },
  ]},
];

const ids = plan.flatMap(round => round.series.flatMap(series => series.ids));
if (new Set(ids).size !== 17) throw new Error('Expected 17 distinct matches');
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
    if (!winner) throw new Error(`No decisive winner: ${id}`);
    score[winner]++;
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
if (final[0].advancingLoser !== '그냥강혜중') throw new Error('October Mojiri does not match bracket');

const tournament = {
  id:'2026-10', year:2026, month:10, title:'10월 모지리 토너먼트', status:'completed', playedAt:'2026-10-03',
  excludedMembers:['빅수환'], participants:['씅민쓰','6년제','따이민','그냥강혜중','대가대다님','박수환','6w91oap5jy'],
  format:{description:'각 시리즈의 패자가 다음 라운드로 진출하는 역토너먼트',earlyRoundsBestOf:3,finalBestOf:5},
  inferenceNote:'서명된 10월 조 추첨 결과와 10월 3일 17:26~19:32(한국시간)의 연속 경기 17개로 대진 및 결과를 복원함.',
  rounds:roundData, mojiriEleven:{best:[],worst:[]}, footballRecords:[], negativeFootballRecords:[], mojiri:'그냥강혜중',
};

const tournamentUrl = new URL('data/mojiri-tournaments.json', root);
const archiveUrl = new URL('data/mojiri-match-details.json', root);
const archive = JSON.parse(await readFile(archiveUrl, 'utf8'));
const data = JSON.parse(await readFile(tournamentUrl, 'utf8'));
if (data.tournaments.some(item => item.id === tournament.id)) throw new Error('2026-10 is already archived');
for (const [id, match] of details) archive.matches[id] = match;
data.tournaments.unshift(tournament);
await writeFile(archiveUrl, `${JSON.stringify(archive)}\n`);
await writeFile(tournamentUrl, `${JSON.stringify(data,null,2)}\n`);
console.log(JSON.stringify({month:tournament.id,matches:ids.length,mojiri:tournament.mojiri,opening:opening.map(item=>[item.id,item.advancingLoser]),semifinal:semifinal.map(item=>[item.id,item.advancingLoser])}));
