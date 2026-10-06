# Full code and structure audit — 6 October 2026

## Follow-up: importer guidance implemented

The attached ChatGPT guidance was checked against the checkout. Both backend-path
protections already existed: the importer inserts the backend directory into
`sys.path`, and the Python runner supplies `PYTHONPATH` while supporting root and
backend virtual environments. The backend package initializer files also exist.
These mechanisms were preserved, with one repository-root definition in the
importer and Node's platform-native path delimiter in the runner.

The actual local district CSV is zero bytes. The importer now rejects empty and
header-only files and missing required columns before opening a database session;
relative CSV paths resolve from the repository root. Four regression cases cover
empty/header-only inputs, relative path behavior and missing columns. Importer
help and backend/SQLAlchemy imports were verified from `scripts/india` as well as
the root. `data/india/README.md` explains the commands and dataset requirement.

No live import, education sync, migration or database configuration change was
performed. The hierarchy, provenance, scoring and other findings below remain
outstanding. The original audit results below describe the earlier read-only
review; this follow-up includes the focused importer code changes.

## Assessment

The government-jobs core has a substantial foundation: official-host validation, publication gates, static catalog loading, PDF enrichment, administrator authentication, RLS migrations, unit tests, browser tests and deployment checks already exist. Do not rebuild this core. The main work is to make the newer education and India Explorer modules reliable, repair the failing coverage gate, and verify production infrastructure and data coverage.

This is a repository audit, not a certification of the deployed service. Findings below distinguish confirmed source defects, operational risks and suggested improvements. Application code was not changed. Build/test commands generated local artifacts; the E2E build temporarily replaces catalog files and normally restores them.

## Scope and verification

Reviewed repository guidance, package scripts, CI, deployment configuration, frontend route/data architecture, India Explorer pages/hooks/API/importer, education CMS/API/schema/scoring, backend configuration/authentication/rate limiting/billing, database migrations, publication safeguards and test coverage. Checks ran against this Windows checkout with installed dependencies, not a fresh installation.

| Check | Observed result |
|---|---|
| Frontend hygiene and merge markers | Pass; TS-only source; 92 deployable JSON/XML files validated |
| Frontend type check | Pass |
| Frontend lint | Pass, zero-warning requirement |
| Frontend unit tests | 90 files, 448 tests passed |
| Backend unit tests | 276 passed, 1 skipped; one dependency deprecation warning |
| Script unit tests | 4 passed |
| Browser E2E tests | 16 Chromium tests passed, including existing mobile and accessibility checks |
| Strict TypeScript check | Pass, but only 9/381 source files covered: 2.4% |
| Production build | Pass; 11 job pages prerendered |
| Performance artifact budgets | Pass |
| Public catalog invariants | Pass; 11 rows, 10 with vacancy counts, approximately 230 vacancies |
| India structural audit | Pass, 16 checks; checks mostly inspect file existence and source strings |
| Frontend coverage gate | **Fail**: hooks functions 63.28% vs 65%; hooks statements 65.58% vs 68% |
| Overall measured coverage | Statements 59.43%; branches 52.32%; functions 56.67%; lines 63.95% |
| Production npm dependency audit | Zero reported vulnerabilities with `npm audit --omit=dev --json` |

Coverage excludes `src/pages/` and `src/data/` from its configured include list, so the overall percentage is not whole-application coverage. Unit tests produced happy-dom fetch-abort messages even though they passed. Backend tests used the root `.venv` in this checkout; the guide describes `backend/.venv`. Make the environment choice explicit before comparing machines.

Final workspace verification: all tracked application and catalog files are unchanged; the only new repository file is this report. The E2E catalog backups restored successfully.

Not verified: deployed database policies/grants, applied migration history, live source fetches, actual GitHub variables/secrets, DNS, hosted API, real email delivery, payment capture/refunds, backups/restores, production browser performance. No ingest, migration, publication or payment action was run.

## Current structure

| Area | Responsibility | Assessment |
|---|---|---|
| `frontend/src/components`, `pages`, `hooks`, `lib`, `utils`, `types` | React UI and data adapters | Reasonable separation; newer modules bypass established query/error patterns |
| `frontend/public/data` | Public catalog, feed and detail snapshots | Good standalone jobs experience; separate directory coverage still depends on API/imports |
| `frontend/src/data/education` | Bundled careers and mock tests | Useful fallback, but database/static identities and verification status need explicit treatment |
| `backend/app/routes` | Public and administrator HTTP APIs | Authentication present; India routes contain substantial raw SQL; new APIs need stronger validation |
| `backend/app/services`, `agents`, `scrapers`, `parsers` | Persistence, ingestion, PDF and review pipeline | Extensive implementation and tests; preserve publication gate boundaries |
| `database/migrations` | Schema/security evolution | 42 numbered migrations exist; AGENTS.md still says 001–036 |
| `scripts` | Operations, exports, audits, recovery | Root package exposes 195 scripts; useful but difficult to operate consistently |
| `shared/official-hosts.json` | Cross-layer official-host policy | Good shared trust boundary |
| `.github/workflows` | CI and scheduled publication | Strong basic checks; coverage currently breaks the main-push frontend job |
| Root deployment configs | Vercel frontend and external API hosting | Environment-dependent API routing needs an explicit production contract |
| `api/og.js` | Vercel Open Graph function | Only observed root API function; FastAPI endpoints are not hosted here |
| Root ZIP bundles and audit documents | Previous packaged versions | Seven ZIP bundles are tracked; documentation has overlapping release claims |

## Confirmed defects and implementation requirements

### F01 — High: coverage gate fails on main pushes

Evidence: `frontend/vite.config.ts` defines hook thresholds; `.github/workflows/ci.yml` runs coverage on pushes. The local coverage run misses two hook thresholds.

Implement meaningful tests for uncovered hook failure, cancellation, stale-response and route-change behavior. Include new education/India pages in a deliberate coverage policy. Do not simply lower thresholds to turn CI green.

Acceptance: `npm run test:coverage --prefix frontend` exits successfully and the main-push frontend job passes.

### F02 — High: India imports discard the district/city hierarchy

Evidence: `scripts/india/import_directory.py` inserts cities with `district_id=NULL`, and places with both `district_id=NULL` and `city_id=NULL`. District pages query these relationships.

Implement resolution by stable source district/city identifiers, enforce state-parent consistency, reject ambiguous names and persist the foreign keys. City uniqueness is currently `(state_id,name)` in migration 041; assess repeated city/locality names across districts before choosing identity constraints.

Acceptance: import two districts with same-name localities and distinct places; each district returns only its own linked records, with no cross-district overwrite.

### F03 — High: importer can label unsupported data verified and duplicate records

Evidence: the CSV importer requires basic fields but writes `verification_status='verified'` and `NOW()` without requiring source URLs or a review result. Places and education-college sync use ordinary inserts without conflict handling. Some other datasets also lack idempotent upserts.

Implement staging → validation → review → verified publication. Require provenance and stable source record IDs; preserve source observation/review timestamps. Add unique keys and upserts by source identity. Avoid `LIKE '%%'` state resolution for college rows with missing state: it can select an unrelated state.

Acceptance: importing the same dataset twice changes no counts; missing/ambiguous state and missing provenance stay unpublished; verified records have auditable evidence.

### F04 — High: rejected SQL rows can abort the whole India import

Evidence: `scripts/india/import_directory.py` catches per-row exceptions and continues in a shared database transaction without per-row savepoints. PostgreSQL errors leave that transaction aborted. Run history is also in the transaction rolled back on an import failure.

Implement prevalidation plus `session.begin_nested()` or equivalent savepoints for recoverable row errors. Store failure/run outcomes separately after rollback, with structured reasons and a non-success operational status when appropriate.

Acceptance: an invalid FK or numeric value between two valid rows does not discard both valid rows; the run reports the exact rejected row and survives in run history.

### F05 — High: district category filters are ignored for jobs and industries

Evidence: `backend/app/routes/india.py` receives `district_id` and `city_id`. The jobs branch only calls `list_jobs(state=...)`; the industries branch filters state and text, not district. The UI labels these results as belonging to a district.

Implement district filtering where reliable structured location exists. If job geography does not support it, visibly label results as state-wide and avoid implying district precision. Apply industry district filtering and document category-specific city support.

Acceptance: a district view cannot silently display another district's industries or label statewide jobs as district-specific.

### F06 — High: education CMS login disappears after one character

Evidence: `frontend/src/pages/EducationAdminPage.tsx` uses the same `key` state for password input and unlocked state. `onChange` sets it; `if (!key)` controls the entire login screen. A single character triggers the CMS and API calls.

Implement separate draft input, submitted credential, verification/loading state and failed-login state. Activate the CMS only after a successful authenticated check. Preserve the existing in-memory credential policy.

Acceptance: an administrator can type/paste a full key, an invalid key retains the form, and a valid submission opens the CMS exactly once.

### F07 — High for trusted assessments: scores and answers are client-controlled

Evidence: `frontend/src/lib/educationApi.ts` fetches public `correct_index` values and inserts browser-supplied score, accuracy and correctness. Migration 039 allows owner inserts without server-computed scoring.

For practice-only quizzes, explicitly classify results as self-reported. For trustworthy progress, rankings or paid assessments, implement authenticated start/submit endpoints, immutable question versions, server-side answer keys/scoring and server-owned attempt fields. Ownership RLS alone does not establish score integrity.

Acceptance: a client cannot award itself an arbitrary score; answer keys are withheld until permitted; resubmissions are idempotent.

### F08 — Medium: mock-test scoring drops configured marks and penalties

Evidence: `EducationHubPage.tsx` awards 4 marks per correct answer and zero otherwise. `loadPublishedMockTests()` does not map database `marks` or `negative_marks` into questions even though the CMS exposes both fields.

Implement per-question marks, penalties and a total computed from the exact published question version. Use the same rules for displayed and persisted results.

Acceptance: a test containing a 2-mark question and a negative-mark question produces the configured score and maximum.

### F09 — Medium: saved answers can map to the wrong question and fail silently

Evidence: `educationApi.ts` replaces DB UUIDs with positional IDs, later resolves answers through a fresh query that does not filter `is_published`, and ignores answer-insert errors. Attempt and answers are written separately.

Keep stable question UUIDs and snapshot/version identity throughout the UI. Save attempt and answers atomically on the backend. Handle static-only test IDs separately from DB-backed tests.

Acceptance: adding an unpublished question or changing sort order cannot redirect answers; failed answer writes do not return a successful complete attempt.

### F10 — Medium: India errors look like empty coverage; stale state can remain visible

Evidence: `frontend/src/hooks/useIndiaExplorer.ts` swallows fetch errors and does not consistently clear old data when route keys change. Pages substitute zero counts or 'not found'.

Implement the existing TanStack Query patterns with route-specific keys, abort signals, caching and explicit error/empty/loading states. Debounce district search. Render a service-unavailable state distinctly from a verified zero or 404.

Acceptance: failed navigation from one state/district to another cannot show the previous area's records; API outage has retry messaging and no false verified counts.

### F11 — Medium: Redis limiter is not a fixed or sliding window as described

Evidence: `backend/app/middleware/rate_limit.py` performs `INCR` and `EXPIRE` on every request. TTL is extended on every request, including blocked requests, so sustained traffic can keep a key blocked indefinitely.

Implement an atomic fixed-window counter with expiry only on creation, time-bucketed keys, or an actual sliding-window script. Add Retry-After and test expiry under continuous rejected traffic. Verify trusted proxies for the hosting platform so all users do not share one proxy-IP limit.

Acceptance: requests become eligible at the documented window boundary even if denied requests continue.

### F12 — Medium: education CMS validation and publication are too loose

Evidence: `admin_education.py` accepts a generic dictionary and filters only field names; question models permit empty options, invalid answer indexes and negative durations/marks through collection payloads. SQL errors are surfaced as response text. Public education policies check `is_published` but not `verified`; defaults publish new content.

Implement per-collection typed create/patch schemas, enum/range/URL validation, consistent UUID errors, safe error responses and draft defaults. Define what verified means for careers/resources/colleges/scholarships and enforce the chosen publish gate. Validate JSONB binding explicitly. Recount question totals transactionally after create/update/delete.

Acceptance: invalid answer indexes, unsupported stages, malformed URLs and invalid durations return clean 422/400 responses; unreviewed records cannot acquire verified presentation accidentally.

### F13 — Medium: India public search view bypasses the table-policy boundary

Evidence: migration 042 creates `india_directory_search` without `security_invoker=true` and grants public SELECT. It explicitly filters child verification status, but joined parent states are not required to be verified.

Implement an invoker view where supported, explicit parent publication predicates and least-privilege grants. Test anon/authenticated access in a database environment. This is a source-level exposure risk; live grants/policies were not inspected. [Supabase RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security) explains that views ordinarily bypass underlying RLS.

Acceptance: rejecting a parent state prevents its directory descendants from leaking through public search according to the chosen policy; anon writes remain denied.

### F14 — Medium: operational APIs convert database failures into healthy empty data

Evidence: `admin_operations.py` returns zero counts on any exception; `admin_moderation.py` returns an empty summary on exceptions.

Implement structured degraded status, logged/request-correlated errors and unavailable counts. Avoid presenting a database outage as an empty moderation queue or no jobs.

Acceptance: simulated DB failure is visible in administrator UI and monitoring, with a retry action.

## Incomplete product capabilities

1. **Schemes and local knowledge:** the India API explicitly returns empty items for `schemes` and `gk`; category cards exist. Connect to the existing schemes module and implement verified `india_facts` retrieval, or display an honest unavailable state and a useful onward link.
2. **City browsing:** district pages render city names as noninteractive cards despite APIs accepting city filters. Add city detail/category routing after hierarchy imports are correct.
3. **Directory pagination:** API totals/offsets exist for categories, but clients do not expose offset and state pages show at most 12 fetched records, district pages 30. Add pagination/load-more, filters and accessible result counts.
4. **Verified directory coverage:** state seeds are not district/city/place coverage. Build source-specific import runbooks, evidence review and per-state/category coverage dashboards. Do not infer that production is populated from a structural audit.
5. **Education content workflow:** generic JSON editing is functional infrastructure but needs field forms, validation feedback, preview, reviewer workflow and publish history for routine editing.
6. **Localization:** new India/CMS UI strings are predominantly hardcoded English. Put them into the existing i18n resources and test selected locales and text expansion.
7. **New module tests:** the India API contract test covers category membership and state normalization, not SQL execution, outage behavior, filtering or publication. Existing browser tests focus on job flows. Add India and education user journeys and real PostgreSQL/PostGIS integration tests.

## Production risks to verify before release

| Risk | Evidence / uncertainty | Required implementation or verification |
|---|---|---|
| API routing | India uses relative `/api/india` when VITE_API_URL is empty; root Vercel API contains only OG; rewrite is same-path | Set and verify hosted API URL or provide a deliberate backend proxy; test a fresh deployed reload and API request |
| Migration drift | Source has migrations through 042; guide stops at 036 | Update setup docs; verify `schema_migrations` through 042 and actual columns/policies, including PostGIS |
| Freshness and geographic coverage | Local snapshot has 11 jobs, state_codes covering as/ch/mp/tn, one missing vacancy count | Inspect source funnel and draft queue; report nationwide eligibility separately; publish reviewed jobs, never weaken gates just to increase counts |
| Scheduled writer | Canonical daily workflow only runs when ALLOW_CANONICAL_PIPELINE=true | Verify variable, secrets, latest successful run, deployment trigger and export timestamps |
| CSP telemetry | Report-only CSP exists but no report-uri/report-to collector is configured in inspected code | Add actual reporting/collection; observe a clean week before enforcing, per AGENTS.md |
| Billing entitlement lifecycle | Service marks profiles premium; inspected schema/service does not model expiry/refunds | Define one-time vs time-limited plan; verify captured payment/amount/currency and implement reconciliation, refunds and entitlement dates where required |
| Readiness | `/health` reports degraded DB in JSON with ordinary 200 response | Add distinct readiness semantics for DB-dependent hosting while retaining liveness for process health |
| Recovery | Backup/PITR configuration and restore exercises were not checked | Document retention, access owner, restore runbook and perform a staging restore drill |
| Observability | Sentry and audit/run history foundations exist | Verify configured DSNs, delivery failures, stale catalog alerts, sync failures and notification recipients in production |
| SEO delivery | Job prerendering works; newer routes use client-side head updates | Verify fresh deployed route HTTP response, canonical domain, social preview and indexing for India/education before scaling sitemaps |

## Structure improvements

Keep the existing frontend/backend/static split. Avoid a wholesale framework migration.

- Gradually group new frontend domains under `features/jobs`, `features/india`, `features/education`, `features/admin`, with API adapters, hooks, components and tests colocated by feature if conventions are deliberately updated. Retain shared layout, generic utilities, i18n and central route definitions.
- Move India SQL to a service/repository layer; declare response schemas and generate/check frontend API types against OpenAPI. This reduces current handwritten field and category drift.
- Replace compressed one-line CMS logic with named form/state operations and bounded components. Add loading/error states before visual refinement.
- Expand strict TypeScript in batches, starting with new API/hooks/pages; track progress rather than treating a 2.4% subset as complete strictness.
- Pin reproducible Python dependencies with a lock/constraints workflow and CI Python matrix as appropriate. Current requirements use unbounded minimum versions. Keep the npm lockfile and add explicit frontend/backend/script security checks to CI.
- Consolidate 195 root scripts into a small operator surface (`dev`, `validate`, `build`, `sync:jobs`, `deploy:check`) and documented recovery groups. Some reduction already exists in RUN.md; complete it without removing required recovery tools blindly.
- Consolidate root audits into `docs/audits` with one current readiness index. Move seven tracked release ZIPs to release artifacts after checking history/references; inspect bundles for embedded environment files before public redistribution.
- Keep generated snapshots under a clearly owned publication pipeline; builds currently also regenerate committed files. Enforce byte-preserving E2E isolation. `build-e2e.mjs` calls `process.exit()` inside its helper, which bypasses normal finally cleanup on child failure; use thrown errors and guaranteed restoration, or isolated fixtures.
- Preserve the CSS layer system and review `premium-v4.css` overrides against route styles with browser screenshots at desktop/mobile widths. Passing byte budgets is not proof of visual quality or Core Web Vitals.

## Implementation order and completion criteria

### Phase 1 — Release blockers

Fix F01, F06 and education scoring integrity according to the product's intended trust level. Verify hosted API routing and migration state. Make India outage states explicit. Completion: coverage/CI green, full CMS login works, data cannot be mistaken for another location, deployed API requests succeed.

### Phase 2 — Directory data correctness

Fix F02–F05 and F13; add real DB integration tests. Implement source identity, parent linking, provenance validation, savepoints, idempotency and import run outcomes. Completion: rerunning an import is safe, invalid rows are isolated, district/category data is accurate, public policy tests pass.

### Phase 3 — Complete education and directory journeys

Fix F08–F10 and F12; implement city routes, pagination, schemes/GK connections, typed CMS forms and localization. Completion: browser tests cover create/edit/publish, timed test submit/save/reload, India state/district/city navigation and failure recovery.

### Phase 4 — Operations and maintainability

Fix F11/F14, add CSP collection/readiness, validate payment lifecycle and restore capability, expand strictness, lock Python installs and simplify documentation/scripts. Completion: production incident and recovery paths are tested, alerts reach an owner, source freshness is observable and documented.

Do not prioritize more visual versions, new category cards or a framework rewrite before data correctness and release gates. The most valuable next work is reliable existing behavior and verified content coverage.

## Suggested validation after implementation

Run frontend hygiene, normal and strict type checks, lint, unit tests, coverage, production build, performance budgets, snapshot invariants and browser tests. Add staging PostgreSQL/PostGIS tests for new migrations/RLS/imports and use payment sandbox and delivery test recipients for external flows. Then verify deployed route reloads, CORS/API connectivity, schedule freshness and rollback/restore procedures. Do not run ingest/apply commands as part of a read-only audit.
