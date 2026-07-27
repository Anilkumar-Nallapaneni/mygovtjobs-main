# Code Audit and Engineering Roadmap

Audit date: 27 July 2026

## Verdict

The application is buildable and its automated test suites pass after repairing the
committed job snapshot. The main architecture is coherent: official-source ingest
feeds Supabase and static fallbacks, FastAPI owns privileged operations, and the Vite
SPA can run independently from committed data.

The highest operational risk found was not application code. A merge committed 25
conflict blocks into `live-jobs.json`, which broke every consumer parsing the file.
The repository also had two package lockfiles resolving different Supabase clients.
Both issues are corrected by this audit.

## Authoritative Structure

```text
mygovtjobs-main/
|-- frontend/                    React/Vite public application
|   |-- src/
|   |   |-- components/          Reusable UI and feature components
|   |   |-- context/             React context providers
|   |   |-- data/                Curated frontend taxonomies/content
|   |   |-- hooks/               Data, auth, time, and UI hooks
|   |   |-- i18n/                Locale initialization and translations
|   |   |-- lib/                 API clients, Supabase, analytics, caching
|   |   |-- pages/               Route-level screens
|   |   |-- styles/              Global and component styling
|   |   |-- test/, tests/        Test setup and Vitest suites
|   |   |-- theme/               Theme primitives
|   |   |-- types/               Shared TypeScript contracts
|   |   `-- utils/               Pure filtering, URL, SEO, and job helpers
|   |-- public/data/              Static job fallback and generated indexes
|   `-- e2e/                      Playwright critical-path tests
|-- backend/app/                 FastAPI service
|   |-- agents/                  Ingest, PDF reader, and detail agents
|   |-- database/                Session and database infrastructure
|   |-- middleware/              HTTP middleware
|   |-- models/, schemas/        Persistence models and API contracts
|   |-- parsers/, scrapers/      Official-source extraction
|   |-- routes/                  Public, admin, ingest, health, and meta APIs
|   |-- services/                Domain and persistence services
|   |-- utils/                   Backend shared helpers
|   `-- workers/                 Background execution
|-- database/
|   |-- supabase_setup.sql        Baseline schema
|   `-- migrations/              Ordered imperative migrations (001-024)
|-- scripts/                     Ingest, export, audit, deployment, and ops tools
|-- api/                         Vercel/API adapter surface
|-- all websites/                Portal discovery catalog
|-- android-twa/                 Android Trusted Web Activity wrapper
|-- .github/workflows/           CI, sync, enrichment, and deployment automation
|-- docs/                        Operator and engineering documentation
|-- package.json                 Canonical commands and npm workspace definition
|-- package-lock.json            Only authoritative JavaScript lockfile
`-- vercel.json                  Production deployment configuration
```

Current scale: 313 frontend TypeScript files, 84 backend Python files, 113 root
scripts, and 24 database migration files.

## Completed In This Audit

- Resolved all merge-conflict blocks in `frontend/public/data/live-jobs.json` using
  the newer side of the merge; the snapshot contains 282 valid items.
- Regenerated derived job lists, organization index, and sitemaps through the build.
- Extended `check:frontend` to reject conflict markers and malformed critical JSON.
- Removed unused `@testing-library/jest-dom` and `@types/eslint` dependencies.
- Removed `frontend/package-lock.json`; npm workspaces now have one dependency graph.
- Reconciled the root graph to a current Supabase client and applied non-breaking npm
  audit updates.

## Verification

| Gate | Result |
|---|---|
| TypeScript | Pass |
| ESLint (`--max-warnings 0`) | Pass |
| Frontend unit tests | 398 pass |
| Backend tests | 152 pass, 1 skip |
| Critical JSON/conflict check | Pass |
| Production frontend build | Pass |

Backend tests still report one Starlette/httpx deprecation warning and one unawaited
`AsyncMock` runtime warning. These do not fail CI but should be removed before making
warnings fatal.

## Remaining Risks

1. **Dependency advisories.** `npm audit` still reports advisories that require major
   dependency changes, principally React Router 6 to 7 and tooling-only minimatch /
   brace-expansion chains. Do not use `npm audit fix --force`; migrate and test them.
2. **Live infrastructure verification.** Database RLS, live row quality, Vercel state,
   and external source health require configured credentials and network access. Run
   `npm run health:website:full` and `npm run verify:production` in the production
   operator environment.
3. **Test warnings.** Locate the backend `AsyncMock` not being awaited and plan the
   Starlette test-client migration once the supported FastAPI stack is confirmed.
4. **Large generated diffs.** Job snapshots and sitemaps are merge-conflict prone.
   CI now detects corruption, but generated data should be updated by one serialized
   workflow and never manually merged.

## Roadmap

### Phase 0: Merge This Repair

- Review the 282-item snapshot and generated sitemap diff.
- Run `npm run everything` with production secrets available.
- Deploy only after `verify:production` passes.

Exit: clean CI, valid snapshot, healthy production probes.

### Phase 1: Security and Dependency Baseline

- Upgrade React Router 6 to 7 in a dedicated branch with route/navigation E2E tests.
- Upgrade Vite/esbuild and PWA tooling until remaining high advisories are cleared.
- Pin Python dependencies with a repeatable lock or constraints workflow.

Exit: zero critical/high production advisories and one lockfile per ecosystem.

### Phase 2: Data Pipeline Reliability

- Enforce the conflict/JSON check before any generated-data commit.
- Add snapshot schema validation and minimum/maximum row-change thresholds.
- Keep ingest serialization through the existing advisory lock and record all runs.

Exit: corrupt or unexpectedly empty exports cannot reach `main` or production.

### Phase 3: Backend Quality

- Fix the unawaited `AsyncMock` warning and migrate deprecated test-client usage.
- Add contract tests for every admin route and authorization failure path.
- Run Supabase advisors and document every public table's RLS policy and grants.

Exit: warning-free backend tests and reviewed API/RLS authorization coverage.

### Phase 4: User Journey and Operations

- Run Playwright on desktop and mobile for search, browse, job detail, alerts, and auth.
- Track source freshness, invalid official links, PDF coverage, and detail coverage as
  explicit service-level indicators.
- Consolidate the 113 scripts behind the canonical commands in `RUN.md`; retire a
  script only after workflow and documentation references are zero.

Exit: critical journeys pass in CI and operators have one command per routine task.

