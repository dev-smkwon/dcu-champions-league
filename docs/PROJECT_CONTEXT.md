# Project context

## What this is

DCU Champions League is a public, read-only web service that turns FC Online match data into a private-friend-group league. It uses the NEXON Open API and is currently deployed at <https://dcu-champions-league.vercel.app/>.

- Repository: <https://github.com/dev-smkwon/dcu-champions-league>
- Stack: Next.js 16, React 19, TypeScript, CSS, NEXON Open API
- Deployment: GitHub `main` → Vercel automatic production deployment
- Persistence: none. Every statistic is reconstructed from the matches currently returned by the API and its cache.

## League members

The configured FC Online nicknames are:

1. 씅민쓰
2. 6년제
3. 따이민
4. 그냥강혜중
5. 대가대다님
6. 박수환
7. 빅수환
8. 6w91oap5jy

New members must be added to the member constants used by both league aggregation and match-detail authorization.

## Data scope and scoring

- Match type: `40`
- A match counts only when both participants are configured league members.
- Matches against outsiders are excluded.
- Win/draw/loss points: 3/1/0.
- Shootout scores are excluded by default and can be included with a toggle.
- User match lists are paged up to the API-supported 10,000 offset range.
- There is no fixed start-date filter. The cumulative view means all history currently available from the API, not permanent lifetime history.
- The API appears to expose a moving recent-history window. Old records can disappear because no database is currently used.

## Current product surfaces

- `/`: current-month standings, current-month headline metrics and analysis, recent matches.
- `/monthly`: month selector plus monthly/cumulative standings and partial-month warnings.
- `/matches`: paginated league-only match list.
- `/matches/[matchId]`: match summary, statistics, goals/assists, shot maps and shot tooltips.
- `/players`: user cards and league records.
- `/players/[nickname]`: user detail, activity, matches, squad and player-card records.
- `/analysis`: deeper user analysis, head-to-head comparison, team-color combinations and goal-type analysis.
- `/best-eleven`: weekly and cumulative 4-3-3 selections plus sortable player statistics.
- `/records`: specialty shot awards and one unified novelty-ranking grid containing inferred killer-pass/cutback records, defensive lowlights and other positive/negative metrics.
- `/mojiri`: JSON-backed monthly reverse tournament where each series loser advances and the final loser becomes that month's 모지리. Its record room starts with inverted BEST/WORST 4-3-3 lineups, includes cumulative novelty awards, and ends with a chronological list of every saved tournament match.

## Record-book behavior

- Specialty shot cards open a collapsible top-10 player ranking.
- The specialty grid covers all 12 official shot-detail types; the location-based long-range award remains an additional card.
- Volley is grouped from the extended shot types used by current API responses rather than obsolete type `5` alone.
- `벗기기 선수` is a proxy index using dribble frequency, success rate and scoring impact.
- `돌파 대장` is pure cumulative dribble successes.
- Cross rankings are explicitly proxy metrics based on long/lofted pass data; the API does not identify an exact cross-to-goal chain.
- Positive rankings use blue accents; negative rankings use red accents.
- Ranking boards show up to ten entries.
- Killer-pass and cutback cards use scorer/assister coordinates from assisted goals. They are labeled as estimates, exclude missed chances, and live inside the same `별별 랭킹` grid as the other novelty metrics.

## Local setup

```bash
git clone https://github.com/dev-smkwon/dcu-champions-league.git
cd dcu-champions-league
npm install
```

Create `.env.local` without committing it:

```env
NEXON_API_KEY=your_service_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Run:

```bash
npm run dev
```

Open <http://localhost:3000/>.

## Known technical constraints

- Vercel filesystem writes are not persistent, so JSON written at runtime is not archival storage.
- A cold full refresh can make many match-detail calls; caching is important.
- `shootDetail.type` includes undocumented/extended values. Validate real response distributions before changing labels.
- The API provides aggregate pass categories and assisted-goal endpoints, but no complete pass-event stream. It cannot measure exact crosses or chances that do not end in a goal.
- It does not provide a reliable per-event dribble location or “dribble directly caused goal” link.
- Older months can be partial. Do not label them complete unless data starts at the beginning of that month.
- Mojiri tournament history is stored in `data/mojiri-tournaments.json` so it survives upstream match-history expiration. Match IDs link the saved bracket back to available detail pages.
