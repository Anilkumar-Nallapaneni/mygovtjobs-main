# P0 — Publication Funnel Recovery

This phase addresses the current bottleneck: thousands of stored/discovered records but only a small gated live catalog.

## Added commands

- `npm run p0:audit` — read-only. Categorizes `job_review_queue`, reports source funnel, dry-runs publication gate, and runs deterministic QA against draft/pending/expired jobs.
- `npm run p0:apply` — controlled mutation. Applies deterministic QA patches to non-live jobs, promotes only rows that pass the existing publication gate, runs watchdog, exports, cleans, rebuilds sitemap, and strictly verifies the public snapshot.
- `npm run audit:review-queue` — read-only queue/status/error/confidence/source breakdown.

## Safety

P0 does not bulk-approve `job_review_queue`. That table is a quarantine for candidates that failed or could not satisfy publication controls. The apply flow modifies existing `jobs` rows only through the repository's existing QA/publish-gate/watchdog controls. It does not fabricate vacancy counts or deadlines.

## Run order

1. `npm run p0:audit`
2. Inspect `docs/audits/p0-review-queue-latest.json`, `docs/audits/source-funnel-latest.json`, `scripts/publish-gate-promote-report.json`, and `scripts/qa-review-report.json`.
3. If the dry-run is sensible, run `npm run p0:apply`.
4. Run `npm run growth:audit` and `npm run validate` before deployment.

## P0 exit criteria

- Review queue is categorized by status, confidence, validation reason, and source.
- Existing eligible drafts are deterministically enriched and promoted through the current gate.
- Watchdog remains authoritative for demotion of non-vacancy/noise records.
- Export/sitemap/snapshot are rebuilt from the gated catalog.
- No fake vacancy totals, forced approvals, or expired-job restoration.

The 30-minute official feed timeout is tracked separately: the current fetch discovered thousands of items before timeout. Source-specific timeout/fallback redesign should be implemented after the publication funnel is measured, so ingestion changes do not mask publication-gate losses.
