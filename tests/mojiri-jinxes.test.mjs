import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildJinxes, buildMojiriCareers } from '../app/mojiri/jinx-data.ts';
const {tournaments}=JSON.parse(await readFile(new URL('../data/mojiri-tournaments.json',import.meta.url),'utf8'));
test('seven archive patterns include streaks, safety and revenge',()=>{
 const cards=buildJinxes(tournaments);
 assert.deepEqual(cards.map(c=>c.title),['강혜중의 첫 관문 자동문','대가대다님의 결승 정기권','박수환의 모지리 안전지대','전월 모지리의 반등','결승 첫판의 저주','부전패 복불복','결승 리벤지 매치']);
 assert.deepEqual(cards.map(c=>[c.hits,c.count]),[[4,4],[4,4],[4,4],[3,3],[3,4],[2,4],[1,1]]);
});
test('unfinished events are excluded',()=>{
 const next=structuredClone(tournaments[0]);next.id='2026-11';next.status='scheduled';
 assert.deepEqual(buildJinxes([...tournaments,next]),buildJinxes(tournaments));
});
test('first final game uses chronological order and unresolved ties are excluded',()=>{
 const altered=structuredClone(tournaments);
 for(const t of altered)t.rounds.at(-1).series[0].games.reverse();
 assert.deepEqual(buildJinxes(altered),buildJinxes(tournaments));
 for(const t of altered){const g=t.rounds.at(-1).series[0].games.toSorted((a,b)=>a.startedAt.localeCompare(b.startedAt))[0];g.homeGoals=2;g.awayGoals=2;g.winner=null;}
 assert.ok(!buildJinxes(altered).some(c=>c.title==='첫판 지면 모지리'));
});
test('career table derives finals, sweeps, nemesis and streaks',()=>{
 const rows=buildMojiriCareers(tournaments);
 const danim=rows.find(r=>r.name==='대가대다님');
 assert.deepEqual([danim.cups,danim.finals,danim.mojiri,danim.maxFinalStreak],[4,4,2,4]);
 assert.deepEqual([danim.nemesis,danim.nemesisLosses],['6w91oap5jy',3]);
 const hyejung=rows.find(r=>r.name==='그냥강혜중');assert.equal(hyejung.sweepLosses,6);
 const suwhan=rows.find(r=>r.name==='박수환');assert.deepEqual([suwhan.seriesEscapes,suwhan.seriesPlayed],[4,4]);
});
