# DCU Champions League agent guidance

## Start every task here

- Read `docs/PROJECT_CONTEXT.md`, `docs/DECISIONS.md`, and `docs/BACKLOG.md` before changing behavior.
- Inspect `git status` and recent commits. Preserve unrelated or user-authored changes.
- Treat this repository and its checked-in documents as the source of truth; do not rely on prior chat history being available.

## Product rules

- This is a read-only FC Online statistics service for the DCU friend league.
- Aggregate only match type `40` matches where both participants are in the configured member list.
- Keep the home ranking monthly. Expose all API-available history through the monthly page's cumulative view.
- Never present an inferred metric as an exact API fact. Label proxies and partial-month data clearly.
- Preserve the clean Champions League visual language with Apple/Toss-like spacing, readable Korean typography, and green football pitches.
- Use `유저` for managers and `선수` for actual FC Online player cards.

## Implementation and verification

- Keep API keys server-side in `NEXON_API_KEY`; never expose them through `NEXT_PUBLIC_*` or commit `.env.local`.
- Preserve the existing Next.js architecture and package lock. Avoid new dependencies unless necessary.
- Use `npm.cmd run build` on Windows after code changes. Use `npm test` when behavior covered by tests changes.
- Verify API/statistical changes against real local responses without printing credentials.
- Do not push or deploy unless the user asks. When deployment is requested, push an intentional commit to `main` and verify the Vercel production result.
- Update the relevant context, decision, or backlog document when product behavior or a durable rule changes.

## Important locations

- Core aggregation: `app/api/league/route.ts`
- Match-detail access: `app/api/matches/[matchId]/route.ts`
- Navigation: `app/components/FloatingNav.tsx`
- Home monthly view: `app/page.tsx`
- Monthly/cumulative view: `app/monthly/page.tsx`
- Record-book rankings: `app/records/page.tsx`
- Mojiri tournament source: `data/mojiri-tournaments.json`
- Mojiri bracket UI: `app/mojiri/page.tsx`
- Shared styles: `app/*.css`
