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

Use the current official FC Online match-detail schema: `1` normal, `2` finesse, `3` header, `4` lob, `5` flare, `6` low, `7` volley, `8` free kick, `9` penalty, `10` knuckle, `11` bicycle, and `12` power shot. Values not documented by the current schema must remain unknown rather than being guessed into an award category. Shot result `1` is on-target, `2` is off-target, and `3` is a goal.

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

Positive Mojiri records must not reward staying in the reverse tournament longer. `탈출왕` uses the fewest games played, while scoring and defensive awards use per-game rates rather than raw totals.

Tournament player awards are snapshotted into the monthly JSON while NEXON match details are available. This preserves the player name, owner and value after upstream match history expires.

Detailed negative tournament awards require at least two appearances and category-specific minimum attempts for rate metrics. Event-chain metrics that NEXON does not directly expose are marked as estimates, and categories with no occurrence remain visible as `기록 없음` rather than assigning a false winner.

The Mojiri bracket prioritizes an at-a-glance tree: four opening series, two semifinals and one final are vertically centered by round. Individual match rows remain collapsed and repeated advancement footers are omitted.

Desktop bracket connectors merge each pair of series with orthogonal horizontal/vertical paths (`4→2→1`). Mobile keeps the simpler stacked layout without connector graphics.

Advancing losers are emphasized with the reverse-tournament red accent. Gold is reserved exclusively for the final advancing loser—the monthly Mojiri—matching the gold navigation treatment.

Mojiri lineups invert conventional naming: `BEST 11` selects the lowest-performing eligible players (closest to Mojiri), while `WORST 11` selects the highest-performing players (farthest from Mojiri). Both use a 4-3-3 and require at least two appearances; the monthly snapshot is persisted in tournament JSON.

Only Mojiri BEST 11 applies sample-size shrinkage: raw performance is blended with the tournament's position-group average using a three-match prior. This prevents a small personal appearance sample from dominating selection. WORST 11 remains unadjusted.

Mojiri BEST 11 additionally requires the player's owner to have advanced as a series loser at least once. First-round winners who escaped after two games are excluded from BEST 11, while substitutes on eligible squads can qualify with two personal appearances. WORST 11 continues to use the full participant pool.

## D-010 — Shot-detail type validation

Do not assign meanings to `shootDetail.type` values from memory alone. Use the current official match-detail YAML schema and, when possible, cross-check it against aggregate fields over a representative real-match sample. In a 120-match validation, type `8` exactly matched `shootFreekick`/`goalFreekick` totals (50 attempts, 6 goals). Type `6` is a low shot; power shot is type `12`.
