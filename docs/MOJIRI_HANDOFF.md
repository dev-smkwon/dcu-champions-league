# Mojiri handoff

## Implementation update (2026-10-12, local only)

October is archived from signed draw `63a9e4cd-8e4b-4abf-930d-1a26d0df0436` and 17 consecutive matches played on October 3 from 17:26 to 19:32 KST. 그냥강혜중 is the October Mojiri after losing the five-game final 2–3 to 대가대다님. Complete raw match details, monthly/total records, BEST/WORST XI, awards, and jinx denominators have been regenerated. The archive now contains 60 matches across July–October.

Read `MOJIRI_ARCHIVE_WORKFLOW.md` first. Completed months auto-populate; monthly/total record scope is implemented; all 60 raw details are archived; each monthly record scope has 5 basic / 16 reproducible negative awards. Shootout scores and decisive winners are saved. Historical monthly XI membership is preserved, while total XI is recomputed.

Source inspection refreshed: 2026-10-12. July through October are completed archives.

## Confirmed rules

- Seven participants, reverse tournament. A/B/C each have two users; D has one automatic forfeit.
- Loser A vs loser B; loser C vs D; semifinal losers meet in final.
- Opening and semifinal: first to 2 wins. Final: first to 3 wins.
- Previous Mojiri gets A1 benefit. Remaining draw order: B1, C1, A2, B2, C2, D1.
- Main `/mojiri` should default to latest published result; month selector accesses archives. Draw button sits above selector.
- BEST 11 means poor performers close to Mojiri; WORST 11 means strong performers. See D-009 for policy.

## Stored state

| Month | Mojiri | Games | BEST/WORST | Basic / negative player awards |
| --- | --- | --- | --- | --- |
| 2026-07 | 대가대다님 | 14 | 11 / 11 | 5 / 22 |
| 2026-08 | 따이민 | 15 | 11 / 11 | 5 / 16 |
| 2026-09 | 대가대다님 | 14 | 11 / 11 | 5 / 16 |
| 2026-10 | 그냥강혜중 | 17 | 11 / 11 | 5 / 16 |

August final: 대가대다님 3–0 따이민. User confirmed the inferred result and authorized archival. JSON stores bracket, scores, UTC timestamps and selected lineup snapshots; it does NOT store complete match-detail responses. Detail links still call NEXON and can expire.

## October archive

Signed draw slots: A 대가대다님 / 6년제, B 따이민 / 씅민쓰, C 그냥강혜중 / 6w91oap5jy, D 박수환. 대가대다님 and 그냥강혜중 advanced through the reverse bracket; 대가대다님 won the final 3–2, making 그냥강혜중 the October Mojiri. The first C game was decided after a 4–4 normal-time score; its explicit API winner and shootout score are retained.

## Source map

- `data/mojiri-tournaments.json`: authoritative saved tournaments.
- `app/mojiri/page.tsx`: archive UI, bracket, lineups, novelty stats, timeline.
- `app/mojiri/month-select.tsx`: currently hardcoded July/August options.
- `app/mojiri.css`, `app/mojiri-month.css`: archive styles.
- `app/api/mojiri/live/route.ts`: legacy August inference, fixed dates/pairs, latest 50 matches per user, leftover preview branch. Main archive no longer calls it.
- `app/mojiri/live/page.tsx`: redirects to August archive; `live-client.tsx`: old inferred view.
- `scripts/archive-mojiri-eleven.mjs`: writes August only; fetches details + spid metadata. Parameterize and validate before another month's use.
- `app/api/matches/[matchId]/route.ts`: upstream-dependent detail access; no archive fallback.
- `app/mojiri/draw/*`, `lib/mojiri-draw.ts`, `app/api/mojiri/draw/sign/route.ts`: ceremony and HMAC-signed result URL. No server result database; keep secret stable.

## Current lineup algorithm (implementation, not a new recommendation)

Aggregate by owner + spId + grade. Exclude position 28 and rating <= 0; require >=2 appearances. Use first observed position. Groups GK=0, DEF=1–8, MID=9–19, FWD=20–27; select 1/4/3/3, not specific full-back/centre-back roles.

BEST candidates: owners appearing in advancingLoser (includes D bye). Rank ascending `(ratingTotal + groupMeanRating * 3) / (appearances + 3)`, where group mean is the unweighted mean of eligible cards' average ratings. WORST: all eligible owners, descending raw mean rating. Tie: more appearances. Snapshot displays raw rating, not adjusted score. No goal/assist weighting in this script.

## Remaining improvements

1. Parameterize the per-month archive scripts into one validated command.
2. Make lineup reasoning inspectable (raw/adjusted rating, appearances, eligibility), then consider specific defensive roles. Changing formula needs explicit decision and reproducible snapshots.
3. Add archive fallback to the match-detail route so saved matches remain viewable after upstream expiration.

## Finish criteria for a monthly archive

Confirm pairings and selected match IDs; retain explicit timezone and decisive results; verify series scores and loser progression; save lineups and intended award categories; preserve previous months; validate selector/default and detail availability. Run build and behavior checks. Deploy only within authorized scope, then inspect production. Report any missing detail/award data plainly.
