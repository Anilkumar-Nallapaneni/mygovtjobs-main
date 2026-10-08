# Structure audit implementation — 8 October 2026

The user clarified that the attached `mygovtjobs_full_structure_audit_2026-10-08.pdf` should be implemented in the project. This report maps its roadmap to actual work and outstanding launch requirements. The PDF is a historical ZIP review, not evidence of today's deployed configuration. **The multi-week roadmap and unrestricted launch are not complete.** No deployment, account creation, external publication, production database mutation, LGD reimport or migration application was performed.

## Implemented project fixes

1. **State API wiring and diagnostics.** Verified the repository's same-origin Python entrypoint, backend packaging, root routing and existing PostgreSQL data. Added HTTP/non-JSON/contract diagnostics, real all-state audits and direct-refresh browser checks. All 36 canonical states return 200 and total 784 verified LGD districts locally. No substitute names/counts or API host were invented. [Full trace and results](STATE_EXPLORER_API_WIRING_FIX_2026-10-07.md).
2. **Honest live job totals.** State profiles/directories now count records through the job publication/date SQL filters. Employment news no longer labels the number of mixed feed headlines as a live-job count; it uses the verified live total supplied by the catalog hook. Regression tests cover the distinction.
3. **Payment capture and ownership.** Checkout verification now fetches the payment from Razorpay and requires capture for the exact order. Stored-order owner, amount and currency must match before upgrading. The order row is locked; an identical already-paid replay is idempotent and a different payment cannot reuse it. Signed webhook JSON/payload errors remain explicit. Tests use synthetic sandbox keys and mocked sessions/provider responses; no real charge or upgrade was made. Provider guidance requires capture before fulfilling the order: [Razorpay integration](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/).
4. **Parser fee/salary defect.** An unlabelled currency amount such as an application fee/deposit is no longer treated as salary. Contextual remuneration or monthly pay remains supported. Official job records were not rewritten or re-enriched in production.
5. **Analytics consent.** GA loading/pageviews/custom events require explicit opt-in; pre-consent views are not queued. Footer controls accept, decline and reopen preferences with 44px buttons. Vercel Analytics/Speed Insights are gated by the same saved choice and suppress events after revocation through `beforeSend`. Existing query-string redaction and conversion event names remain. This does not establish real dashboard conversion/retention results.
6. **Stale local snapshot.** Removed the SSC CHSL notice whose deadline was 7 October using the existing strict cleanup. Rebuilt compact/bootstrap catalogs, hero totals, organization index and active-job/organization sitemaps. The source/catalog now contains 9 current notices; the last actual sync timestamp and its recorded job count are retained as history. No fake new scrape timestamp, district import or gate relaxation was used.
7. **Read-only security/data evidence.** Added output paths to the existing audits, included new untracked source files in the repository scan, inspected account policies/grants, and prepared migration 044 to remove unnecessary bookmark privileges. The migration was generated with `supabase migration new` and moved into the repository's numbered migration directory. It is **review-only and unapplied**.

## PDF roadmap coverage and limits

| PDF recommendation | Evidence / status |
|---|---|
| P0 backup and project identification | Git bundle backup created and `git bundle verify` passed at `%TEMP%/mygovtjobs-backup-2026-10-08.bundle` (64,380,919 bytes). It protects repository history, not production DB or uncommitted files. Authenticated read-only Vercel API confirms project `mygovtjobs-main`, root directory unset (repository root), Vite, build `npm run build`, output `frontend/dist`, production alias `www.livegovtjobs.com`, deployed SHA `61117d0482255e4fdde6018e7ef419c83cc1bbfa`. No configuration was changed. |
| Node 24 clean checks | Node 24.18.0 confirmed. Type/lint/test checks ran. Node dependencies were already installed; `npm ci` was not rerun. Fresh minimal Python installation/import was verified independently. |
| P0 build and preview deployment | Release build is blocked by 9 valid jobs below the unchanged minimum of 10. Standalone compilation works only for local UI verification. Preview/production deployments are prohibited by the user's stop instruction. |
| P0 API health/direct routes | Real local health 200, database connected. 36/36 API mappings, 784 districts; six state direct routes and refreshes verified. Live `/india/ap` is 200; its API now returns 500, changed from the earlier 404. Vercel production env metadata contains frontend settings only and no server `DATABASE_URL`: the India function cannot connect to the persisted database. Local config/connection failures now return explicit sanitized 503. Read-only request logs confirm 500 but contain no nested exception. Updating server env and certifying live API success remain prohibited/outstanding. |
| P0 source/deadline/PDF/verified timestamp funnel | Read-only repeatable-read DB audit: 4,041 stored jobs; 3,497 draft, 532 expired, 12 raw live; 9 pass public SQL and strict export gates. Local catalog now matches all 9. Draft blocker groups overlap; 3,496 lack required verification, 3,261 lack a valid deadline, 1,273 lack a suitable official PDF, 3,485 are below confidence 90, 3,299 below completeness 70. No rejected draft was promoted. Individual repair/official verification requires further source work and authorized DB writes. |
| P1 India map/interactions/responsiveness | Existing UI repair retained and retested at all five requested viewports with real counts. Shared desktop height, larger map, stacked mobile, 44px state targets, no giant empty panel. Earlier hover/focus/selection/reduced-motion checks and CSS/dimension evidence are in the UI report. No map replacement or redesign. |
| P1 auth/admin/alerts/contact/bookmarks | Existing protected endpoint/rate/CORS tests pass; read-only account RLS evidence captured. Anonymous requests and invalid payment signatures are rejected in tests. Real OAuth sessions, admin flows, mail delivery and cross-user bookmark mutations were not performed against production. India function intentionally does not expose the full admin/billing/contact backend; that runtime/feature configuration needs independent operator confirmation. |
| P1 sandbox payment E2E | Capture/order/owner/amount/currency/replay/security regressions pass with synthetic keys and mocked provider/DB. Real sandbox dashboard checkout/webhook delivery is not verified; must not be represented as completed E2E. |
| P1 RLS/secrets/rate limiting/webhooks | Checked current RLS/policies/grants with read-only SQL. Pattern scan reports only three synthetic database-URI test fixtures; no unresolved merge markers. India now uses existing rate middleware; Redis remains optional and process-local limiting is not a distributed guarantee. Webhook signature/invalid-body/capture guards strengthened. Migration 044 remains pending. Secret scanning is not an exhaustive Git-history/security certification. |
| P1 SEO/canonical/robots/structured data/Search Console | Existing scoped route/canonical/noindex safeguards retained; sitemap generation exposes 9 active jobs and excludes 784 content-empty districts. Existing SEO tests pass. No Search Console access/submission or real Google fetch/indexing certification. |
| P1 performance/accessibility | JS/CSS/catalog budgets pass on the local compilation. Existing E2E includes axe checks and mobile flows; live Core Web Vitals and a complete accessibility certification remain unverified. |
| P2 approved official sources/daily verified jobs | Existing approved-host pipeline and publication gates retained; parser defect fixed. No new source approvals, ingest writes or invented records. Increasing daily verified supply remains incomplete and is the current release-floor blocker. |
| P2 meaningful unique locality/content/source citations/correction workflow | LGD provenance retained; no fabricated capital/city/locality content. Existing official-link/report flows retained. All 784 districts currently lack verified city/place content and remain excluded from district sitemaps. Publishing unique verified content and exercising live correction delivery remain outstanding. |
| P2 consent/conversion/retention before ads | Local consent controls and existing bounded conversion events verified in tests. Real analytics dashboard, conversion/retention evidence and advertising decisions remain outstanding. No advertising launch. |

## Bookmark grant finding and pending migration

The read-only audit shows `authenticated` has `SELECT`, `INSERT`, `DELETE`, `UPDATE`, `REFERENCES`, `TRIGGER` and `TRUNCATE` on bookmarks. Owner RLS policies exist, but PostgreSQL does not subject `TRUNCATE`/`REFERENCES` to row security. This is excessive privilege, not proof that ordinary PostgREST exposes a truncate endpoint or that an exploit occurred. [PostgreSQL row security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html).

`database/migrations/044_harden_bookmark_grants.sql` preserves owner policies and backend service-role access, revokes PUBLIC/anon access and unnecessary authenticated privileges, and retains SELECT/INSERT/DELETE. It changes grants only; no schema or data change. **Do not run it as part of this audit.** Production application and controlled authenticated isolation tests require a separately approved action.

## Tests and artifacts

| Check | Result |
|---|---|
| `npm run type-check` | PASS |
| `npm run lint` | PASS, zero warnings |
| `npm run test` and final backend rerun | 475 frontend tests (96 files), 332 backend tests with 4 skips, 11 script tests passed |
| `npm run build` | BLOCKED: catalog 9, release floor 10; gate unchanged |
| Standalone Vite code compilation | PASS with same-origin `VITE_API_URL=''`; diagnostic only, not a release build |
| `npm run audit:india` | PASS, 16 checks |
| `npm run audit:india:data` | PASS, source/provenance readiness; not a production import |
| `npm run check:frontend` | PASS, TS-only frontend and valid conflict-free deployable JSON/XML |
| `npm run check:performance-budgets` | PASS on diagnostic compilation |
| `npm run test:e2e` | 16 passed, 7 opt-in real-production-audit tests skipped; fixture suite, not production certification |
| Supplemental TLS-enabled route integration | 6 passed; real existing DB read requests |
| Isolated minimal Python runtime | Fresh requirements installation and ASGI import PASS |
| All-state API audit | 36/36 HTTP 200; zero unknown mappings; 784 verified districts |
| Real-API browser audit | Six direct+refresh state routes, five responsive viewports, explicit simulated API error PASS |
| `git diff --check` | PASS |

Standard backend run has 4 skips where live DB/strict-CA or live sync-run requirements are absent; the separately TLS-configured route integration run passes all 6 tests. Existing happy-dom fetch-abort teardown output and Starlette TestClient deprecation warnings are recorded; tests have no failures.

Evidence: [data funnel](audits/implementation-database-2026-10-08.json), [security/RLS/grants](audits/implementation-security-2026-10-08.json), [repository scan](audits/implementation-repository-2026-10-08.json), [all-state API](audits/state-api-verification-2026-10-08.json), [browser dimensions/screenshots](audits/state-explorer-wiring-2026-10-08/results.json), [earlier UI CSS and before/after report](INDIA_EXPLORER_UI_FIX_2026-10-07.md).

## Remaining release acceptance criteria

The PDF's zero blocking build failures, live healthy API, Search Console fetch, approved full-runtime feature wiring, controlled account/admin/payment E2E, verified source growth and conversion/retention evidence are **not met**. Local code fixes and evidence are ready for review. No commit, push or deployment was performed by this agent. Production database contents and LGD records remain unchanged.

## Files changed in this continuation

The core map/root wiring changes already committed in `61117d0` are retained. Current working-tree source/config/report changes:

- `.gitignore`
- `api/india.py`
- `backend/app/parsers/pdf_parser.py`
- `backend/app/routes/billing.py`
- `backend/app/routes/india.py`
- `backend/app/services/razorpay_service.py`
- `backend/tests/test_billing_security.py`
- `backend/tests/test_pdf_parser_fields.py`
- `backend/tests/test_vercel_india.py`
- `database/migrations/044_harden_bookmark_grants.sql`
- `docs/API_DECISION.md`
- `docs/STATE_EXPLORER_API_WIRING_FIX_2026-10-07.md`
- `docs/STRUCTURE_AUDIT_IMPLEMENTATION_2026-10-08.md`
- `frontend/index.html`
- `frontend/public/data/live-jobs-bootstrap.json`
- `frontend/public/data/live-jobs-list.json`
- `frontend/public/data/live-jobs.json`
- `frontend/public/data/org-index.json`
- `frontend/public/sitemaps/jobs-active.xml`
- `frontend/public/sitemaps/organizations.xml`
- `frontend/src/components/layout/AnalyticsPreferences.tsx`
- `frontend/src/components/layout/EmploymentNewsBar.tsx`
- `frontend/src/components/layout/Footer.tsx`
- `frontend/src/data/homeShellStats.ts`
- `frontend/src/data/org-index.json`
- `frontend/src/hooks/useIndiaExplorer.ts`
- `frontend/src/lib/analytics.ts`
- `frontend/src/lib/indiaApi.ts`
- `frontend/src/main.tsx`
- `frontend/src/styles/layout.css`
- `frontend/src/tests/components/EmploymentNewsBar.test.tsx`
- `frontend/src/tests/data/homeShellStats.test.ts`
- `frontend/src/tests/lib/analytics.test.ts`
- `frontend/src/tests/lib/indiaApi.test.ts`
- `frontend/src/tests/pages/IndiaExplorer.lgd.test.tsx`
- `package.json`
- `requirements.txt`
- `scripts/audit-india-platform.mjs`
- `scripts/audit-production-readonly.py`
- `scripts/audit-release-readonly.py`
- `scripts/audit-release-repository.py`
- `scripts/audit-state-api.mjs`
- `scripts/audit-state-explorer-wiring.mjs`
- `scripts/lib/release-routing.test.mjs`
- `scripts/serve-release-output.mjs`

Generated evidence and all requested viewport/route screenshots are under `docs/audits/`, linked above. Environment files and production settings are unchanged.
