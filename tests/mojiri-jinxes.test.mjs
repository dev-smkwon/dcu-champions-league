import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildJinxes } from '../app/mojiri/jinx-data.ts';
const {tournaments}=JSON.parse(await readFile(new URL('../data/mojiri-tournaments.json',import.meta.url),'utf8'));
test('only three approved patterns, all currently 2/2',()=>{
 const cards=buildJinxes(tournaments);
 assert.deepEqual(cards.map(c=>c.title),['부전패의 저주','첫판 지면 모지리','강혜중의 반반 공식']);
 for(const c of cards)assert.deepEqual([c.hits,c.count],[2,2]);
});
test('future exceptions increase denominator, unfinished events excluded',()=>{
 const next=structuredClone(tournaments[0]);next.id='2026-09';next.mojiri='대가대다님';
 const b=next.rounds[0].series.find(s=>s.participants.includes('그냥강혜중'));b.seriesScore['그냥강혜중']=1;
 const cards=buildJinxes([...tournaments,next]);
 for(const c of cards)assert.deepEqual([c.hits,c.count],[2,3]);
 next.status='scheduled';assert.deepEqual(buildJinxes([...tournaments,next]),buildJinxes(tournaments));
});
test('first final game uses chronological order and unresolved ties are excluded',()=>{
 const altered=structuredClone(tournaments);
 for(const t of altered)t.rounds.at(-1).series[0].games.reverse();
 assert.deepEqual(buildJinxes(altered),buildJinxes(tournaments));
 for(const t of altered){const g=t.rounds.at(-1).series[0].games.toSorted((a,b)=>a.startedAt.localeCompare(b.startedAt))[0];g.homeGoals=2;g.awayGoals=2;g.winner=null;}
 assert.ok(!buildJinxes(altered).some(c=>c.title==='첫판 지면 모지리'));
});
