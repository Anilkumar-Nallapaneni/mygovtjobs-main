# Code Audit and Engineering Roadmap

Audit date: 28 July 2026

## Verdict

The application is buildable and its automated test suites pass. Its main architecture
is coherent: official-source ingest feeds Supabase and static fallbacks, FastAPI owns
privileged operations, and the Vite SPA can run independently from committed data.

The publication boundary is now deterministic and shared across ingest, admin review,
backend export, static-snapshot verification, and Supabase RLS. One database record
currently passes the complete public gate. Accuracy is preserved, but inventory recovery
remains the primary production blocker.

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
|   `-- migrations/              Ordered imperative migrations (001-029)
|-- scripts/                     Ingest, export, audit, deployment, and ops tools
|-- api/                         Vercel Open Graph serverless function
|-- all websites/                Portal discovery catalog
|-- android-twa/                 Android Trusted Web Activity wrapper
|-- play-store-assets/           Play Store listing images
|-- .github/workflows/           CI, sync, enrichment, and deployment automation
|-- docs/                        Operator and engineering documentation
|-- package.json                 Canonical commands and npm workspace definition
|-- package-lock.json            Only authoritative JavaScript lockfile
|-- vercel.json                  Frontend production deployment configuration
|-- render.yaml                  Optional backend deployment configuration
`-- railway.toml                 Alternative backend deployment configuration
```

Current scale: 322 frontend TypeScript files, 135 backend Python files, 118 tracked
script files, and 29 database migration files.

## Completed In This Audit

- Resolved all merge-conflict blocks in `frontend/public/data/live-jobs.json`; the
  current trust-boundary export contains one approved item.
- Regenerated derived job lists, organization index, and sitemaps through the build.
- Extended `check:frontend` to reject conflict markers and malformed critical JSON.
- Removed unused `@testing-library/jest-dom` and `@types/eslint` dependencies.
- Removed `frontend/package-lock.json`; npm workspaces now have one dependency graph.
- Reconciled the root graph to a current Supabase client and applied non-breaking npm
  audit updates.
- Added shared recursive plain-text sanitization before job persistence and backfilled
  205 affected database records.
- Enforced India-calendar deadlines, recruitment classification, verification,
  completeness, and `published_to_site` in ingest, admin publishing, exports, snapshots,
  and RLS.
- Demoted unsafe live records; production now has one approved live record, zero
  live records with missing/past deadlines, and zero titles containing HTML.
- Removed caller-supplied alert ownership and address-based unsubscribe; authenticated
  ownership is derived from Supabase tokens and enforced by RLS.
- Fixed leaked frontend auth listeners and moved Redis rate limiting to the async client
  with an observable process-local fallback.
- Removed repository-local `.agents` and `.cursor` instructions, the duplicate
  `govtjobs live-data` pipeline, archived one-off scripts, stale reports, and committed
  build/test artifacts. Generated discovery reports now remain ignored.

## Verification

| Gate | Result |
|---|---|
| TypeScript | Pass |
| ESLint (`--max-warnings 0`) | Pass |
| Frontend unit tests | Pass (404) |
| Backend tests | Pass (174, 1 skipped) |
| Playwright E2E | Pass (16, including mobile critical path) |
| Critical JSON/conflict check | Pass |
| Production frontend build | Pass |
| Live publication audit | Pass (1 of 1 retained) |
| Supabase anonymous-access audit | Pass |

Backend tests report one Starlette/httpx deprecation warning. The Playwright harness
now launches installed tools directly, without Node's deprecated shell child process.

## Remaining Risks

1. **Dependency advisories.** `npm audit` still reports advisories that require major
   dependency changes, principally React Router 6 to 7 and tooling-only minimatch /
   brace-expansion chains. Do not use `npm audit fix --force`; migrate and test them.
2. **Live inventory.** Only one record passes the strict public gate. Restore source
   freshness and normalized deadlines before considering production data healthy; do
   not weaken the gate to satisfy the minimum-count check.
3. **Test warnings.** Plan the Starlette test-client migration once the supported
   FastAPI stack is confirmed.
4. **Large generated diffs.** Job snapshots and sitemaps are merge-conflict prone.
   CI now detects corruption, but generated data should be updated by one serialized
   workflow and never manually merged.
5. **Backend-dependent user actions.** The production API hostname is not deployed.
   Contact submission and one-click anonymous alert unsubscribe require a deployed API
   (with signed unsubscribe tokens) or an equivalent serverless endpoint.

## Roadmap

### Phase 0: Trust Boundary and Inventory Recovery

- Keep the one-job approved snapshot as the accuracy baseline.
- Restore official-source ingest until at least 50 deadline-bearing jobs pass the gate.
- Add signed email unsubscribe tokens before advertising one-click unsubscribe.
- Run `npm run everything` with production secrets available.
- Deploy only after `verify:production` passes.

Exit: clean CI, at least 50 verified live jobs, valid snapshot, healthy production probes.

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

- Expand the existing desktop and mobile Playwright coverage to alerts and auth once
  the deployed backend is provisioned.
- Track source freshness, invalid official links, PDF coverage, and detail coverage as
  explicit service-level indicators.
- Consolidate the 118 tracked script files behind the canonical commands in `RUN.md`;
  retire a script only after workflow and documentation references are zero.

Exit: critical journeys pass in CI and operators have one command per routine task.
