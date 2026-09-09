import { readFile, writeFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const env = await readFile(new URL('.env.local', root), 'utf8');
const key = env.match(/^NEXON_API_KEY=(.+)$/m)?.[1]?.trim().replace(/^['"]|['"]$/g, '');
if (!key) throw new Error('NEXON_API_KEY missing');
const tournaments = JSON.parse(await readFile(new URL('data/mojiri-tournaments.json', root))).tournaments;
const file = new URL('data/mojiri-match-details.json', root);
let archive = { version: 1, matches: {} };
try { archive = JSON.parse(await readFile(file)); } catch (e) { if (e.code !== 'ENOENT') throw e; }
const missing = [];
for (const t of tournaments) {
  const games = t.rounds.flatMap(r => r.series.flatMap(s => s.games));
  for (const game of games) {
    if (archive.matches[game.matchId]) continue;
    const res = await fetch(`https://open.api.nexon.com/fconline/v1/match-detail?matchid=${game.matchId}`, { headers: { 'x-nxopen-api-key': key } });
    if (!res.ok) { missing.push({ month: t.id, matchId: game.matchId, status: res.status }); continue; }
    const match = await res.json();
    if (match.matchType !== 40 || match.matchInfo?.length !== 2 || !match.matchInfo.every(i => [game.home, game.away].includes(i.nickname))) throw new Error(`Unexpected participants: ${game.matchId}`);
    archive.matches[game.matchId] = match;
  }
}
await writeFile(file, JSON.stringify(archive) + '\n');
console.log(JSON.stringify({ saved: Object.keys(archive.matches).length, missing }));
