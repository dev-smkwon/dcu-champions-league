import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = async p => JSON.parse(await readFile(new URL('../data/'+p,import.meta.url),'utf8'));
const data=await read('mojiri-tournaments.json');
const records=await read('mojiri-records.json');
const raw=await read('mojiri-match-details.json');
test('29 archived games, unique IDs, correct participants and decisive series scores',()=>{
 const ids=[];
 for(const t of data.tournaments) for(const r of t.rounds) for(const s of r.series){
  const wins=Object.fromEntries(s.participants.map(p=>[p,0]));
  for(const g of s.games){
   ids.push(g.matchId); assert.ok(raw.matches[g.matchId]);
   assert.equal(raw.matches[g.matchId].matchType,40);
   assert.deepEqual(raw.matches[g.matchId].matchInfo.map(p=>p.nickname).sort(),[g.home,g.away].sort());
   assert.ok(s.participants.includes(g.winner)); wins[g.winner]++;
   if(g.shootout){assert.equal(g.homeGoals,g.awayGoals);assert.notEqual(g.shootout.home,g.shootout.away);}
  }
  if(s.games.length) assert.deepEqual(wins,s.seriesScore,`${t.id}/${s.id}`);
 }
 assert.equal(ids.length,29);assert.equal(new Set(ids).size,29);assert.equal(records.total.matchCount,29);
});
test('monthly scope counts, historic XI preserved and total XI evidence',()=>{
 for(const t of data.tournaments){const r=records.months[t.id];assert.equal(r.matchCount,t.rounds.flatMap(x=>x.series.flatMap(s=>s.games)).length);
  for(const key of ['best','worst']) assert.deepEqual(r.mojiriEleven[key].map(p=>[p.owner,p.spId,p.grade]),t.mojiriEleven[key].map(p=>[p.owner,p.spId,p.grade]));
  assert.ok(r.footballRecords.length>=5);assert.ok(r.negativeFootballRecords.length>=16);
 }
 for(const key of ['best','worst']){const ps=records.total.mojiriEleven[key];assert.equal(ps.length,11);assert.equal(ps.filter(p=>p.position===0).length,1);
  for(const p of ps){assert.ok(p.appearances>=2);assert.ok(Number.isFinite(p.adjustedRating));if(key==='best')assert.ok(p.advancingEligible);}
 }
});
test('forfeit decision remains untouched',()=>{
 const g=data.tournaments.flatMap(t=>t.rounds.flatMap(r=>r.series.flatMap(s=>s.games))).find(g=>g.matchId==='6a64da2a8e56026e4b52a619');
 assert.equal(g.homeGoals,0);assert.equal(g.awayGoals,3);assert.match(g.note,/몰수패/);
});
