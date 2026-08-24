import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const env = await readFile(new URL(".env.local", root), "utf8");
const key = env.match(/^NEXON_API_KEY=(.+)$/m)?.[1]?.replace(/^['"]|['"]$/g, "");
if (!key) throw new Error("NEXON_API_KEY is missing");

const dataUrl = new URL("data/mojiri-tournaments.json", root);
const data = JSON.parse(await readFile(dataUrl, "utf8"));
const tournament = data.tournaments.find((item) => item.id === "2026-08");
if (!tournament) throw new Error("2026-08 tournament is missing");

const ids = tournament.rounds.flatMap((round) => round.series.flatMap((series) => series.games.map((game) => game.matchId)));
const headers = { "x-nxopen-api-key": key };
const details = await Promise.all(ids.map(async (id) => {
  const response = await fetch(`https://open.api.nexon.com/fconline/v1/match-detail?matchid=${id}`, { headers });
  if (!response.ok) throw new Error(`match ${id}: ${response.status}`);
  return response.json();
}));
const metaResponse = await fetch("https://open.api.nexon.com/static/fconline/meta/spid.json");
if (!metaResponse.ok) throw new Error(`spid metadata: ${metaResponse.status}`);
const names = new Map((await metaResponse.json()).map((item) => [item.id, item.name]));

const aggregated = new Map();
for (const match of details) for (const info of match.matchInfo) for (const card of info.player || []) {
  const status = card.status || {};
  if (card.spPosition === 28 || Number(status.spRating || 0) <= 0) continue;
  const id = `${info.nickname}:${card.spId}:${card.spGrade}`;
  const current = aggregated.get(id) || { owner: info.nickname, spId: card.spId, name: names.get(card.spId) || `선수 ${card.spId}`, position: card.spPosition, grade: card.spGrade, appearances: 0, goals: 0, assists: 0, ratingTotal: 0 };
  current.appearances += 1;
  current.goals += Number(status.goal || 0);
  current.assists += Number(status.assist || 0);
  current.ratingTotal += Number(status.spRating || 0);
  aggregated.set(id, current);
}

const players = [...aggregated.values()].filter((player) => player.appearances >= 2).map((player) => ({ ...player, rating: player.ratingTotal / player.appearances }));
const group = (position) => position === 0 ? "gk" : position < 9 ? "def" : position < 20 ? "mid" : "fwd";
const quotas = { gk: 1, def: 4, mid: 3, fwd: 3 };
const advancingOwners = new Set(tournament.rounds.flatMap((round) => round.series.map((series) => series.advancingLoser)).filter(Boolean));
const groupAverages = Object.fromEntries(Object.keys(quotas).map((key) => {
  const pool = players.filter((player) => group(player.position) === key);
  return [key, pool.reduce((sum, player) => sum + player.rating, 0) / Math.max(1, pool.length)];
}));

const publicPlayer = (player) => ({ owner: player.owner, spId: player.spId, name: player.name, position: player.position, grade: player.grade, appearances: player.appearances, goals: player.goals, assists: player.assists, rating: Number(player.rating.toFixed(2)) });
const select = (pool, direction, adjusted = false) => Object.entries(quotas).flatMap(([key, count]) => pool.filter((player) => group(player.position) === key).sort((a, b) => {
  const av = adjusted ? (a.ratingTotal + groupAverages[key] * 3) / (a.appearances + 3) : a.rating;
  const bv = adjusted ? (b.ratingTotal + groupAverages[key] * 3) / (b.appearances + 3) : b.rating;
  return direction * (av - bv) || b.appearances - a.appearances;
}).slice(0, count).map(publicPlayer));

tournament.mojiriEleven = {
  bestAdjustment: { method: "position-average-shrinkage", priorMatches: 3, minimumAppearances: 2, requiresAdvancingLoss: true },
  best: select(players.filter((player) => advancingOwners.has(player.owner)), 1, true),
  worst: select(players, -1, false),
};
if (tournament.mojiriEleven.best.length !== 11 || tournament.mojiriEleven.worst.length !== 11) throw new Error(`lineup incomplete: best=${tournament.mojiriEleven.best.length}, worst=${tournament.mojiriEleven.worst.length}`);
await writeFile(dataUrl, `${JSON.stringify(data, null, 2)}\n`, "utf8");
console.log(`saved best=${tournament.mojiriEleven.best.length}, worst=${tournament.mojiriEleven.worst.length}`);
