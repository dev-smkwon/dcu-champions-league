import { readFile, writeFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const read = async path => JSON.parse(await readFile(new URL(path, root), 'utf8'));
const data = await read('data/mojiri-tournaments.json');
const raw = await read('data/mojiri-match-details.json');
const response = await fetch('https://open.api.nexon.com/static/fconline/meta/spid.json');
if (!response.ok) throw new Error(`Metadata: ${response.status}`);
const names = new Map((await response.json()).map(p => [p.id, p.name]));
const gamesOf = t => t.rounds.flatMap(r => r.series.flatMap(s => s.games));
for (const t of data.tournaments) for (const g of gamesOf(t)) {
  const match = raw.matches[g.matchId];
  if (!match) throw new Error(`Missing archive: ${g.matchId}`);
  const home = match.matchInfo.find(p => p.nickname === g.home);
  const away = match.matchInfo.find(p => p.nickname === g.away);
  if (!home || !away) throw new Error(`Participants mismatch: ${g.matchId}`);
  g.winner = g.homeGoals > g.awayGoals ? g.home : g.awayGoals > g.homeGoals ? g.away : home.matchDetail.matchResult === '승' ? g.home : away.matchDetail.matchResult === '승' ? g.away : null;
  if (g.homeGoals === g.awayGoals && home.shoot.shootOutScore !== away.shoot.shootOutScore) {
    g.shootout = { home: home.shoot.shootOutScore, away: away.shoot.shootOutScore };
  }
}
function build(tournaments, historical) {
  const games = [...new Map(tournaments.flatMap(gamesOf).map(g => [g.matchId, g])).values()].sort((a,b) => a.startedAt.localeCompare(b.startedAt));
  const players = new Map();
  const users = new Map();
  const advancing = new Set(tournaments.flatMap(t => t.rounds.flatMap(r => r.series.map(s => s.advancingLoser))));
  for (const g of games) for (const info of raw.matches[g.matchId].matchInfo) {
    const u = users.get(info.nickname) || { owner: info.nickname, name: info.nickname, appearances: 0, foul: 0, offside: 0, conceded: 0 };
    u.appearances++; u.foul += info.matchDetail.foul || 0; u.offside += info.matchDetail.offsideCount || 0;
    u.conceded += info.nickname === g.home ? g.awayGoals : g.homeGoals;
    users.set(u.owner, u);
    for (const card of info.player || []) {
      const s = card.status;
      if (card.spPosition === 28 || !(s.spRating > 0)) continue;
      const id = `${info.nickname}:${card.spId}:${card.spGrade}`;
      const p = players.get(id) || { owner: info.nickname, spId: card.spId, name: names.get(card.spId) || `선수 ${card.spId}`, grade: card.spGrade, position: card.spPosition, appearances: 0, goals: 0, assists: 0, ratingTotal: 0, shoot: 0, effectiveShoot: 0, passTry: 0, passSuccess: 0, dribbleTry: 0, dribbleSuccess: 0, tackleTry: 0, tackle: 0, aerialTry: 0, aerialSuccess: 0, yellowCards: 0, redCards: 0, conceded: 0 };
      p.appearances++; p.goals += s.goal || 0; p.assists += s.assist || 0; p.ratingTotal += s.spRating;
      for (const key of ['shoot','effectiveShoot','passTry','passSuccess','dribbleTry','dribbleSuccess','tackleTry','tackle','aerialTry','aerialSuccess','yellowCards','redCards']) p[key] += s[key] || 0;
      if (card.spPosition === 0) p.conceded += info.nickname === g.home ? g.awayGoals : g.homeGoals;
      players.set(id,p);
    }
  }
  const pool = [...players.values()].map(p => ({ ...p, rating: p.ratingTotal / p.appearances }));
  const eligible = pool.filter(p => p.appearances >= 2);
  const group = p => p.position === 0 ? 'GK' : p.position < 9 ? 'DEF' : p.position < 20 ? 'MID' : 'FWD';
  const quotas = { GK:1, DEF:4, MID:3, FWD:3 };
  const means = Object.fromEntries(Object.keys(quotas).map(k => { const ps = eligible.filter(p => group(p) === k); return [k, ps.reduce((s,p) => s+p.rating,0)/Math.max(1,ps.length)]; }));
  const enriched = eligible.map(p => ({ ...p, groupMean: means[group(p)], adjustedRating: (p.ratingTotal+means[group(p)]*3)/(p.appearances+3), advancingEligible: advancing.has(p.owner) }));
  const select = best => Object.entries(quotas).flatMap(([k,n]) => enriched.filter(p => group(p) === k && (!best || p.advancingEligible)).sort((a,b) => best ? a.adjustedRating-b.adjustedRating || b.appearances-a.appearances : b.rating-a.rating || b.appearances-a.appearances).slice(0,n));
  const award = (id,title,icon,candidates,value,unit,min=false,positiveOnly=false,proxy=false) => {
    const ranked = candidates.map(p => ({p,v:value(p)})).filter(x => Number.isFinite(x.v) && (!positiveOnly || x.v>0)).sort((a,b) => min ? a.v-b.v : b.v-a.v);
    const top = ranked[0];
    const tied = top ? ranked.filter(x => Math.abs(x.v-top.v)<1e-9) : [];
    return { id,title,icon,owner:top?.p.owner || '-',player:top ? tied.map(x => `${x.p.name}${x.p.spId ? ` (${x.p.owner} · +${x.p.grade})` : ''}`).join(' · ') : '기록 없음',spId:top?.p.spId,value:top ? +top.v.toFixed(2) : 0,unit,proxy };
  };
  const footballRecords = [
    award('goals','득점왕','⚽',pool,p=>p.goals,'골',false,true),
    award('assists','도움왕','🎁',pool,p=>p.assists,'도움',false,true),
    award('conceded','실점왕','🥅',[...users.values()],p=>p.conceded,'실점',false,true),
    award('rating','평점왕','⭐',eligible,p=>p.rating,'평점'),
    award('tackles','태클왕','🛡️',pool,p=>p.tackle,'회',false,true),
  ];
  const negativeFootballRecords = [
    award('spray','난사왕','🔫',eligible.filter(p=>p.shoot>=10),p=>p.goals/p.shoot*100,'% 골 전환율',true),
    award('weak-shot','소녀슛 장인','🫧',eligible.filter(p=>p.shoot>=10),p=>p.effectiveShoot/p.shoot*100,'% 유효슛',true),
    award('pass-donor','패스 기부천사','🎁',eligible.filter(p=>p.passTry>=20),p=>(p.passTry-p.passSuccess)/p.appearances,'실패/경기'),
    award('turnover','볼 소유권 반납왕','🫴',eligible.filter(p=>p.dribbleTry>=10),p=>p.dribbleSuccess/p.dribbleTry*100,'% 드리블 성공',true),
    award('miss-tackle','태클 헛발왕','🦶',eligible.filter(p=>p.tackleTry>=5),p=>p.tackle/p.tackleTry*100,'% 태클 성공',true),
    award('air','허공의 지배자','🛫',eligible.filter(p=>p.aerialTry>=5),p=>p.aerialSuccess/p.aerialTry*100,'% 공중볼 성공',true),
    award('low-rating','평점 바닥공사','🕳️',eligible,p=>p.rating,'평점',true),
    award('striker','공격수 맞아요?','❓',eligible.filter(p=>p.position>=20),p=>p.goals/p.appearances,'골/경기',true),
    award('island','도움 없는 섬','🏝️',eligible.filter(p=>p.position>=20),p=>(p.goals+p.assists)/p.appearances,'G+A/경기',true),
    award('yellow','옐로카펫','🟨',pool,p=>p.yellowCards,'장',false,true),
    award('red','퇴근 본능','🟥',pool,p=>p.redCards,'장',false,true),
    award('foul','반칙 머신','🚨',[...users.values()],p=>p.foul/p.appearances,'회/경기',false,true),
    award('offside','옵사이드 산책','🚶',[...users.values()],p=>p.offside/p.appearances,'회/경기',false,true),
    award('gk-ga','버스 놓친 골키퍼','🚌',eligible.filter(p=>p.position===0),p=>p.conceded/p.appearances,'팀 실점/출전',false,true,true),
    award('butter','손에 버터','🧈',eligible.filter(p=>p.position===0),p=>p.rating,'평점',true),
    award('spectator','수비 구경꾼','👀',eligible.filter(p=>p.position>0 && p.position<9),p=>p.tackle/p.appearances,'태클/경기',true),
  ];
  const historicalPlayers = key => historical[key].map(p => {
    const evidence = enriched.find(q => q.owner===p.owner && q.spId===p.spId && q.grade===p.grade);
    return { ...evidence, ...p, historicalSelection: true };
  });
  const hasHistoricalSelection = historical?.best?.length === 11 && historical?.worst?.length === 11;
  return { matchCount:games.length, mojiriEleven: hasHistoricalSelection ? {best:historicalPlayers('best'),worst:historicalPlayers('worst')} : {best:select(true),worst:select(false)},footballRecords,negativeFootballRecords };
}
const records = { version:1, months:Object.fromEntries(data.tournaments.filter(t=>t.status==='completed').map(t=>[t.id,build([t],t.mojiriEleven)])), total:build(data.tournaments.filter(t=>t.status==='completed')) };
for (const t of data.tournaments) {
  // Keep historical selections; only enrich their evidence. August's missing awards are filled.
  const r=records.months[t.id];
  if (!t.mojiriEleven.best.length || !t.mojiriEleven.worst.length) t.mojiriEleven = r.mojiriEleven;
  if (!t.footballRecords.length) t.footballRecords=r.footballRecords;
  if (!t.negativeFootballRecords.length) t.negativeFootballRecords=r.negativeFootballRecords;
}
await writeFile(new URL('data/mojiri-tournaments.json',root),JSON.stringify(data,null,2)+'\n');
await writeFile(new URL('data/mojiri-records.json',root),JSON.stringify(records,null,2)+'\n');
console.log(JSON.stringify({matches:records.total.matchCount,months:Object.keys(records.months)}));
