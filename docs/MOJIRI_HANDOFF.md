# Mojiri handoff

## Implementation update (2026-09-09, local only)

Read `MOJIRI_ARCHIVE_WORKFLOW.md` first: it supersedes the source-inspection observations below. Completed months now auto-populate; monthly/total record scope is implemented; all 29 raw details are archived; August now has 5 basic / 16 reproducible negative awards; shootout scores and decisive winners are saved. Historical monthly XI membership is preserved with expandable reference evidence; total XI is recomputed. The current record room uses 16 consistently defined negative categories in both scopes (the original 22 July snapshot awards remain saved). No September schedule was activated and no deployment was requested.

Source inspection: 2026-09-09, HEAD `5982e7e`. This document records current behavior and proposals separately. No September implementation or schedule has been activated by this document.

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
| 2026-08 | 따이민 | 15 | 11 / 11 | 0 / 0 (unfinished, not zero performance) |

August final: 대가대다님 3–0 따이민. User confirmed the inferred result and authorized archival. JSON stores bracket, scores, UTC timestamps and selected lineup snapshots; it does NOT store complete match-detail responses. Detail links still call NEXON and can expire.

## September: supplied draw, tentative date

User supplied the following draw on 2026-09-09. Tentative event date: **2026-09-18 (Friday)**. Start/end/reveal time not confirmed. Do not reuse August times or activate an automatic reveal without an agreed schedule.

| Slot pair | Users |
| --- | --- |
| A1 / A2 | 따이민 / 그냥강혜중 |
| B1 / B2 | 박수환 / 씅민쓰 |
| C1 / C2 | 대가대다님 / 6w91oap5jy |
| D1 | 6년제 (automatic forfeit) |

Draw ID: `0b75a711-422b-4083-9a00-6bef4196ce64`; payload drawnAt: `2026-09-08T12:41:18.176Z`; version 1. These are user-supplied payload facts; this handoff does not assert a fresh server signature verification. September is not yet in tournament JSON or the month selector.

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

## Prioritized improvements — not implemented

1. Generate month options/default from saved tournaments; remove August date hardcoding. Optional upcoming-cup card can show tentative September date without replacing latest result.
2. Preserve shootout scores and explicit match winner in archive. Current saved Game and novelty-stat code compare normal goals only; August A game 1 is 2:2 but has a decisive series result. Backfill from evidence, never guess a tied game's winner.
3. Complete August basic/negative awards; hide or explain empty sections. Basic-record subtitle is still hardcoded to July.
4. Separate selected-month statistics from career statistics with a clear scope control. Currently bracket/lineups are monthly, user novelty leaders aggregate all saved tournaments.
5. Make lineup reasoning inspectable (raw/adjusted rating, appearances, eligibility), then consider specific defensive roles. Changing formula needs explicit decision and reproducible snapshots.
6. Preserve available full match details for durable detail pages; match IDs alone cannot provide them after expiration.
7. Before September inference, parameterize event config and add meaningful validation: UTC/KST boundary, early kickoff, shootout/forfeit result, loser progression, duplicate IDs, incomplete and ambiguous series. August originally returned zero games because UTC was compared to KST; do not repeat a build-only validation.

## Finish criteria for a monthly archive

Confirm pairings and selected match IDs; retain explicit timezone and decisive results; verify series scores and loser progression; save lineups and intended award categories; preserve previous months; validate selector/default and detail availability. Run build and behavior checks. Deploy only within authorized scope, then inspect production. Report any missing detail/award data plainly.
