# Backlog

## High value

- [ ] Decide whether to add persistent match archival before upstream history rolls off.
- [ ] Show the actual available date range prominently in cumulative views.
- [ ] Add automated tests for league-only filtering, shootout toggles, monthly grouping, and partial-month detection.
- [ ] Reduce the cost of cold full aggregation and document cache-refresh behavior.

## Product ideas

- [ ] Monthly awards and monthly BEST 11 separate from cumulative awards.
- [ ] Compare a user's performance across months.
- [ ] Add monthly head-to-head and team-color matchup summaries.
- [ ] Provide shareable result/award cards for the group chat.
- [ ] Add a clear formula popover for every inferred novelty metric.

## Known limitations to revisit

- [ ] Exact cross attempts and cross-assisted goals are unavailable; current rankings are aerial-pass proxies.
- [ ] Exact penalty-box dribble-to-goal chains are unavailable; `벗기기 선수` is a composite proxy.
- [ ] Market-price-based value rankings require a trustworthy price source not currently integrated.
- [ ] Historical months are not durable without a database or scheduled snapshot.

## Maintenance checklist

- [ ] When adding a member, update both league and match-detail allowlists.
- [ ] When changing a formula, update `docs/DECISIONS.md` and visible explanatory copy.
- [ ] When adding a route, update navigation, responsive layout, and `docs/PROJECT_CONTEXT.md`.
- [ ] Before production deployment, run the build and verify the changed behavior on the production URL.

