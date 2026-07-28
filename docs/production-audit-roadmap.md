# Production audit verdict and roadmap

## Current verdict

The publication trust boundary is now deterministic and enforced at every
public output. The live database was audited on 2026-07-28: 22 rows had a live
or public flag, 21 were demoted without deletion, and 1 verified current job
remains public. The full CSV is `docs/audits/live-jobs-audit.csv`.

Do not trade this accuracy baseline for catalog volume. New sources should be
enabled only when their records pass the same gate and quarantine metrics remain
stable.

## Completed

- Recovery branch and remote upstream created before audit changes.
- Node 24, npm, Python 3.12, Git, root lockfile, and backend venv verified.
- Complete publication-path and workflow maps documented.
- Shared backend sanitizer removes tags, scripts, styles, entities, control
  characters, and excess whitespace while preserving URL fields.
- India-aware active/expired/needs-review status is centralized.
- Publication validation returns errors, warnings, and a 0-100 confidence score.
- Auto-publication requires confidence 90 or higher.
- Failed and uncertain rows are deduplicated into a private review queue.
- Public RLS, API lists, detail reads, static export, frontend Supabase queries,
  sitemaps, and `JobPosting` enforce explicit approval.
- Active and archive job sitemaps are separated.
- State, qualification, organization, result, admit-card, and static routes are
  separated into named child sitemaps under both sitemap index entry points.
- Scheduled writers use one repository-wide concurrency group.
- Pull-request CI runs type-check, lint, unit tests, backend tests, build, E2E,
  and strict public-snapshot invariants.
- Frontend secret scan passed; admin keys are no longer persisted in web storage.
- Privileged admin and ingest requests emit structured audit events with request
  IDs, outcome, status, duration, and client address without logging credentials.

## Pasted checklist coverage

| Phase | Status | Evidence |
| --- | --- | --- |
| Environment and branch | Complete | Node 24.18, Python 3.12.9, root lockfile, backend venv, dedicated audit branch |
| Publication path map | Complete | `docs/job-publication-map.md`; one normalized creation writer |
| Sanitization | Complete | shared recursive backend sanitizer, critical-title rejection, focused tests |
| India dates and expiration | Complete | centralized India date/status functions and boundary tests |
| Publication gate and quarantine | Complete | deterministic validation, confidence 90 threshold, private review queue |
| Existing data cleanup | Complete but data-limited | 1 current public row passes; 21 prior rows were demoted without deletion |
| Agent responsibilities | Complete | extraction/enrichment cannot approve; deterministic code owns publication |
| Workflow control | Complete | workflow inventory documented; all active writers share one concurrency group |
| Mandatory quality tests | Complete | static snapshot, publication gate, sitemap, SEO, unit, backend, and E2E checks |
| Job details | Complete | empty sections hidden; official source, last checked, status, report, related jobs, and distinct outbound actions |
| Homepage | Existing implementation retained | no redesign or new pages added while inventory is below target |
| SEO | Complete | active-only `JobPosting`; archive behavior; eight child sitemaps plus index alias |
| Security | Complete in code | frontend secret scan, RLS/grants, admin key, rate limit, and privileged audit log |
| Deployment | Preview-ready | production release remains blocked on merge, catalog recovery, and backend provisioning |

## Release blockers

1. Production catalog size is intentionally 1 after the accuracy cleanup. Keep
   automated ingest frozen until reviewed quarantined records or newly scraped
   sources produce enough records that independently pass confidence 90.
2. The production dependency audit reports two moderate React Router advisories.
   Router 7.18 currently replaces them with a high-severity RSC advisory, so no
   clean upstream version is available for this SPA. The remaining full-audit
   findings are development/build-tool dependency chains in ESLint/Workbox.
   Do not use `npm audit fix --force`; monitor and upgrade when compatible fixes
   are published.
3. The production API hostname must be configured and health-checked before
   enabling backend-only forms or admin operations on the deployed frontend.

## Next 14 days

| Priority | Work | Exit condition |
| --- | --- | --- |
| P0 | Review quarantine from official source evidence | Every approval passes the current gate; no manual SQL publication |
| P0 | Re-enable daily ingest in observation mode | Three consecutive runs complete with zero invalid public rows |
| P0 | Raise strict minimum-live threshold gradually | Minimum reflects verified supply, never an arbitrary volume target |
| P1 | Add independent second-source/date verification for low-confidence parsers | Date conflicts are quarantined automatically |
| P1 | Expand link monitoring and retry policy | Broken official links demote only after repeated checks, with evidence retained |
| P1 | Configure and verify the production API hostname | Homepage, API health, admin auth, reports, and alert endpoints pass probes |
| P1 | Build-tool dependency upgrades | ESLint/Workbox major migrations pass lint, build, and E2E without forced audit rewrites |
| P1 | React Router security release | Upgrade when a version fixes both SPA redirect and RSC advisories; rerun all route E2E |
| P2 | Review job-detail field coverage | Empty sections remain hidden; official notification, website, and apply actions stay distinct |
| P2 | Accessibility and Lighthouse regression pass | No critical accessibility issue and agreed performance budgets pass |

## Release checklist

1. `npm ci`
2. `npm run check:frontend`
3. `npm run type-check`
4. `npm run lint`
5. `npm run test`
6. `npm run build`
7. `npm run test:e2e`
8. `npm run verify:live-jobs`
9. `npm run audit:live-jobs`
10. `npm run verify:production`
11. Preview deploy and run `npm run deploy:verify -- <preview-url>`
12. Merge only after CI and preview checks pass; monitor the first three ingest runs

Production deployment is not automatic from this audit branch. The minimum-live
quality threshold and preview deployment must pass before release.
