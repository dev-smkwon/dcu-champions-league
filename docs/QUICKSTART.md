# Agent quick start

Verified against local source on 2026-09-09. This is a navigation index, not a substitute for current code.

## First checks

- `git rev-parse --show-toplevel`, `git status --short`, `git log -3 --oneline`.
- Working repository observed here: `D:/Codex/dcu-champions-league`. The app task directory can be a different, empty repository; verify before cloning or editing.
- Preserve existing changes. Do not print `.env.local` or credentials.
- Remote: `dev-smkwon/dcu-champions-league`; production: https://dcu-champions-league.vercel.app/ ; main pushes trigger Vercel.
- User request governs scope. Documentation work does not imply app changes or deployment.

## Read only the relevant branch

| Task | Start with | Expand when needed |
| --- | --- | --- |
| Mojiri / next cup | `docs/MOJIRI_ARCHIVE_WORKFLOW.md`, `docs/MOJIRI_HANDOFF.md` | `docs/DECISIONS.md` D-009, D-012; listed source files |
| League aggregation | `app/api/league/route.ts` | `docs/PROJECT_CONTEXT.md`; decisions D-001–005 |
| Shot / pass records | `app/records/page.tsx` | decisions D-005, D-006, D-010, D-011 |
| General UI | relevant page + CSS | decision D-007 |
| Planning | `docs/BACKLOG.md` | relevant source before claiming a bug is fixed |

## Durable rules

- League statistics: match type 40, both users in the member list. User = manager; player = card.
- Main league points 3/1/0; shootouts excluded by default. Mojiri series use decisive results, including shootouts and accepted forfeits.
- Mojiri archive is committed JSON. Other league history is API-dependent. A saved match ID alone does not preserve match details.
- UTC pitfall: observed NEXON `2026-08-21T13:05:50` means 22:05:50 KST. Parse the source as UTC, store an explicit offset, display Asia/Seoul. Validate boundaries with actual matches.
- A successful build proves compilation, not match inference, complete archives, or deployment. Check the changed behavior separately.
- Windows build: `npm.cmd run build`. After authorized deployment, verify the production result.

## Efficient handoff

Inspect JSON counts/selected fields with a short script instead of dumping all match/player data. Use targeted `rg` searches. Update the relevant handoff when facts change, label proposals as proposals, and do not copy conversation transcripts or secrets into documents.
