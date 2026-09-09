# Mojiri archive workflow (2026-09-09)

## Display and scope

- `/mojiri` lists `status: completed` tournaments from `data/mojiri-tournaments.json`, newest ID (`YYYY-MM`) first. No calendar/date hardcoding or scheduled agent is needed for published snapshots.
- Unknown/missing `month` falls back to latest completed tournament. Future fixtures must not be marked completed.
- Record room `scope=month` follows the page month; `scope=total` includes all completed tournaments. Bracket stays on selected month. Timeline follows record scope.
- September 18, 2026 is tentative only. Do not activate September or invent a kickoff/reveal time.

## Adding a completed tournament

1. Verify series, accepted forfeits, participants and UTC timestamps, then add its JSON snapshot. API timezone-less matchDate is UTC; store ISO Z and display Asia/Seoul.
2. Run `node scripts/fetch-mojiri-archive.mjs` while upstream details remain available. It only requests missing saved IDs; NEXON_API_KEY stays local/server-side.
3. Run `node scripts/build-mojiri-records.mjs`. It reads archived details, fetches public player names, writes shootout winners and `data/mojiri-records.json`. This is a build-time/manual archival step, not a background scheduler.
4. Verify `node --test tests/mojiri-archive.test.mjs` (update fixture-specific counts deliberately for new months), then `npm.cmd run build`. Deploy only when requested.

## Statistical contracts

- Raw snapshots: `data/mojiri-match-details.json`. Aggregate cards by owner + spId + enhancement grade; no duplicate match IDs. No additional upstream requests on record-room visits.
- Shootout decides W/L but its goals never add to GF/GA. Accepted manual forfeit score overrides upstream score.
- Historical monthly XI membership stays unchanged. Expanded evidence provides current formula's reference adjustment; it does not rewrite historical selections. Total XI is newly selected from aggregate appearances and ratings.
- BEST: min 2 appearances and owner's advancing-loss experience; 4-3-3; lower `(ratingTotal + positionGroupMean * 3)/(appearances+3)` first. Group mean is unweighted mean of eligible card average ratings. WORST: higher raw mean first. Ties prefer more appearances.
- Reliable computed awards: 5 basic + 16 negative categories. Rates require 2 appearances; attempts: shots 10, passes 20, dribbles 10, tackles/aerials 5. Same-value award winners are all displayed. No fabricated zero-event winners for cards/fouls.
- GK concession proxy uses team goals conceded in the card's appearances, not individual responsibility or exact on-field concession timing. UI labels it estimated.
- Existing tournament JSON award snapshots remain; record-room computed awards use the consistent scope model. July's old proxy categories not reproducibly defined are not mixed into total rankings.
- Jinx patterns appear only in total scope: bye-to-Mojiri, final first-game loser-to-Mojiri, and 그냥강혜중 opening 0:2 then semifinal 2:0. Simple attendance/win rankings were removed. Derive hits/eligible tournaments from completed brackets, require two eligible events, retain cards as exceptions accumulate. First final game is chronological; unresolved ties are excluded. Explain small samples, never predict results. Test with `node --test tests/mojiri-jinxes.test.mjs` (Node with TypeScript stripping).
- Player-level selection-evidence UI was removed by request; retain shared selection criteria and archived calculations. Card dates use `.jinx-evidence`, never the globally styled `footer` element.
