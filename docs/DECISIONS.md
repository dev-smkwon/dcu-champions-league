# Product and engineering decisions

## D-001 — League-only matches

Only official matches where both players are configured league members are included. Matches against outsiders never affect standings or statistics.

## D-002 — Monthly home, cumulative archive

The home screen represents the current month's competition. `/monthly` provides month selection and a separate cumulative view over every match currently obtainable from the API.

Why: the group wants a recurring monthly competition, while still being able to inspect the broadest available history.

## D-003 — Partial months are explicit

If the earliest API match for a month starts after day 1, that month is labeled `부분 집계`. Current-month data is labeled `진행 중`.

Why: without persistent storage, API availability must not be mistaken for a complete calendar-month archive.

## D-004 — No database for now

The product currently recomputes from NEXON API responses and framework caches. A database/JSON archival pipeline was considered but intentionally deferred because the service API allowance is sufficient for current usage.

Consequence: historical records may disappear when the upstream API stops returning them.

## D-005 — Honest proxy metrics

When the API lacks exact event relationships, the UI uses clearly labeled proxies instead of claiming precision.

- Cross: long pass, bouncing lob pass, and lobbed through-pass attempts/successes.
- Take-on impact (`벗기기 선수`): dribble frequency, dribble success rate, and scoring impact.
- Goalkeeper “기름손”: team goals conceded while that goalkeeper played, not individual mistakes.
- Value rankings: enhancement grade versus computed performance, not transfer-market price.

## D-006 — Shot-type grouping

Shot type `5` was not present in sampled current API data. Volley awards group the extended volley-like types observed in responses. Header grouping also includes the extended diving-header type. Any future remapping must be validated against real raw responses before deployment.

## D-007 — Visual language

The product combines a European Champions League atmosphere with Apple/Toss-like clarity:

- navy/royal-blue brand surfaces;
- generous spacing and rounded white cards;
- readable Korean type sizes;
- green football pitches, even on dark-themed pages;
- floating Dynamic-Island-style navigation;
- red treatment for negative/funny-lowlight rankings and blue for positive records.

## D-008 — Deployment policy

Local implementation and verification do not automatically authorize deployment. Push to `main` only when the user explicitly asks to deploy. Vercel then deploys automatically; verify the production behavior rather than assuming the push completed the rollout.

## D-009 — Mojiri tournament persistence

Monthly reverse-tournament brackets are stored in `data/mojiri-tournaments.json`, including participants, series scores, raw UTC start times and FC Online match IDs. The loser advances; early rounds are best-of-three and the final is best-of-five. JSON is the durable source because upstream match details may expire.

Network-disconnection forfeits count as official tournament games. Preserve the awarded score and label the forfeit reason in the saved game entry.
