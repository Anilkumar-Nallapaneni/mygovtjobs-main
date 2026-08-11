# My Govt Jobs — full code and structure audit

Audit date: 11 August 2026. Scope: repository structure, frontend, backend, ingestion, Supabase/Postgres, security, tests, build/deployment, current production surface, and competitor feature comparison.

## Executive result

Rubric-based overall readiness: **64/100**. This is not a Lighthouse score. It is a weighted engineering/product score based on code evidence and current public pages.

The system has a strong domain foundation but is not release-safe in its current checkout. Unresolved merge markers are committed in a test and several generated production files. The public crawler surface currently advertises only 22+ vacancies and four latest notices, far below leading portals. The main priority is therefore restore release/data integrity, then simplify the runtime and CSS, then expand lifecycle coverage and personalization.

## Evidence snapshot

| Area | Files / size | Main observation |
|---|---:|---|
| Frontend | 351 files, 44,724 lines | 82 components, 21 pages, 29 hooks, 80 test files |
| Frontend CSS | 10 files, 9,957 lines | 1,629 approximate selector blocks, 74 media blocks, 49 `!important` uses |
| Backend | 94 files, 11,455 lines | Clear FastAPI/services/agents/parsers separation; several 400–600 line hotspots |
| Scripts | 136 files, 12,500 code lines | Broad operational coverage, but command and responsibility sprawl |
| Database | 30 migrations plus setup/docs | Strong publication gates and RLS hardening; migration 030 needs grant/default-privilege review |
| Tests | 80 frontend + 53 backend files | Good breadth; current frontend validation is blocked by conflict markers |

Largest maintainability hotspots:

- `styles/home.css`: 3,537 lines
- `styles/layout.css`: 3,139 lines
- `styles/jobs.css`: 1,820 lines
- `utils/jobDetailLinks.ts`: 679 lines
- `utils/jobDetailStructured.ts`: 666 lines
- `components/jobs/JobDetail.tsx`: 578 lines
- `lib/liveJobsFetch.ts`: 469 lines
- `lib/jobsApi.ts`: 450 lines
- `components/home/HomeExamUpdatesRow.tsx`: 459 lines
- `components/home/HomePage.tsx`: 454 lines
- `backend/app/routes/admin.py`: 606 lines
- `backend/app/agents/job_detail_agent.py`: 552 lines
- `backend/app/services/job_persist_service.py`: 544 lines

## Release blockers (P0)

1. Resolve conflict markers in:
   - `frontend/src/tests/utils/jobDetailStructured.test.ts` lines 262–284
   - `frontend/public/data/live-jobs-bootstrap.json`
   - `frontend/public/data/live-jobs-list.json`
   - `frontend/public/data/org-index.json`
   - `frontend/public/sitemaps/jobs-active.xml`
2. Extend `scripts/check-frontend-hygiene.mjs`; it currently checks only `live-jobs.json` and `package.json`, so it reports success while other deploy-critical assets contain conflict markers.
3. Regenerate all derived JSON and sitemap files from one clean canonical catalog; do not hand-merge generated files.
4. Run the full PR checklist and do not deploy until type-check, lint, tests, build, snapshot verification, and sitemap validation all pass.
5. Investigate why production/crawler output has 22+ vacancies while the documented static catalog previously claimed roughly 1,600. Add a minimum-catalog release gate based on a rolling baseline rather than a fixed number.

## Weighted scorecard

| Dimension | Weight | Score | Weighted result |
|---|---:|---:|---:|
| Data freshness, coverage, correctness | 20% | 45 | 9.0 |
| Search, filters, and discovery | 12% | 76 | 9.1 |
| Job detail and official-source trust | 12% | 82 | 9.8 |
| Recruitment lifecycle coverage | 8% | 55 | 4.4 |
| UX, responsive design, accessibility | 12% | 72 | 8.6 |
| Performance and delivery architecture | 10% | 61 | 6.1 |
| SEO and crawlability | 8% | 48 | 3.8 |
| Security and Supabase boundaries | 8% | 82 | 6.6 |
| Maintainability and developer experience | 7% | 50 | 3.5 |
| Testing and operations | 3% | 76 | 2.3 |
| **Total** | **100%** |  | **63.2 ≈ 64/100** |

## Frontend audit

### What is strong

- Routes and major below-fold sections are lazy-loaded.
- Error boundaries exist at application, route, and job-detail levels.
- Skip navigation, semantic `main`, loading states, and retry UI are present.
- Data adapters and official-domain/PDF resolution isolate untrusted source material.
- TanStack Query, session caching, bootstrap JSON, and progressive catalog processing provide resilience.
- PWA caching, immutable asset headers, sitemap generation, analytics deferral, Sentry deferral, and prerendering show mature production intent.
- Localization coverage is unusually broad for this category.

### What is too heavy

1. **CSS is the largest frontend maintenance problem.** `home.css`, `layout.css`, and `jobs.css` total 8,496 lines. Broad global selectors, 74 responsive blocks, and 49 `!important` declarations make visual changes risky. Split styles by feature and co-locate them with components; introduce cascade layers and remove overrides incrementally.
2. **The browser owns too much catalog orchestration.** `useLiveJobs` + `liveJobsFetch` + `jobsApi` + pipeline adapters coordinate static bootstrap, full JSON, Supabase, API, React Query, session storage, service-worker caches, hard busting, progress updates, and lab-browser exceptions. Choose one public read model: a CDN snapshot for browse pages, with API/Supabase only for focused server search and details.
3. **Audit-specific behavior affects real architecture.** User-agent/webdriver detection delays catalog work for Lighthouse. Optimize the actual user path and measure it; do not maintain a second lab behavior beyond deferring optional telemetry.
4. **Some components remain orchestration hubs.** Split `JobDetail`, `HomePage`, `HomeExamUpdatesRow`, and `LatestNotificationsTable` into controller hooks plus small presentational sections.
5. **TypeScript is not strict.** `strict: false` lowers the value of the otherwise strong TS-only convention. Enable strict flags in stages: `strictNullChecks`, `noImplicitAny`, then full `strict`.
6. **Route repetition is high.** `AppRoutes.tsx` repeats `LazyRoute` wrappers and prop plumbing. Use route configuration and page-level catalog selectors, but avoid a premature generic page framework.
7. **Large reference data ships as source modules.** State facts, exams, professions, and SEO content should be route-loaded JSON or build-time content, not part of broad application graphs.
8. **Accessibility needs automated route coverage.** Axe is installed, but enforce WCAG checks on home, search/filter, job detail, alerts, account, and mobile navigation in CI.

### Component inventory and disposition

| Group | Components | Audit decision |
|---|---|---|
| App shell | `AppRoutes`, error boundaries, fallbacks, scroll/analytics trackers, `MobileRouteTransition`, `TurnstileWidget` | Keep; convert routes to config and add route-level tests |
| Layout | Navbar/drawer/preferences, employment bars, footer, bottom nav, install banner, logo/icons | Keep; unify desktop/mobile navigation model and reduce layout CSS |
| Home discovery | `HomePage`, hero, browse strips, discovery/map blocks, latest tables, headlines, filters, glance panels, quick links, alert/social/subscribe sections | Reduce above-fold modules; lazy-mount below-fold blocks; merge overlapping notification tables |
| Jobs | Cards/grid, `JobDetail`, detail UI modules, FAQ, related jobs, report button, category/state grids | Strong domain area; finish breaking `JobDetail` into data controller + sections |
| Browse/hub | Breadcrumbs, sector browser, hub card | Keep; add consistent facets and result counts |
| Account | Alerts and premium panels | Keep only when backed by working auth/delivery/payment flows; otherwise feature-flag |
| Admin | Operations dashboard and route guard | Backend key is real enforcement; disable public admin bundle by default in production |
| Map | India map | Keep below fold; sanitize SVG explicitly and test keyboard/state selection |

## Backend, ingest, and agent audit

### Strengths

- Routes, services, parsers, scrapers, agents, middleware, and models are separated.
- Publication confidence, completeness, verification status, official domains, PDF memory, QA review, and watchdog gates are valuable differentiators.
- Backend test result: 207 passed and 4 skipped. Five setup errors were caused by denied pytest temp/cache paths in the audit environment, not demonstrated assertion failures.
- Production defaults correctly keep auto-publish off unless explicitly enabled.

### Required simplification

1. Split `routes/admin.py` by concern: health/metrics, jobs review, ingest controls, and pipeline operations.
2. Split `job_persist_service.py` into normalization, deduplication/upsert, publication decision, and export adapters.
3. Create one canonical pipeline runner used by daily, weekly, production, “complete,” and live variants. Many package scripts should become thin named presets.
4. Define typed stage contracts: discovery → fetch → parse → normalize → dedupe → validate → enrich → review → publish → export.
5. Store stage metrics and failure reasons in `pipeline_runs`; expose a read-only operational summary rather than adding more standalone audit scripts.
6. Establish idempotency tests for every write stage and contract tests per official source adapter.
7. Move deprecated/one-off scripts to `scripts/archive/` after proving they are not referenced by CI or runbooks.

## Supabase and security audit

### Good controls

- Frontend uses only URL + anon key and lazy-loads the client; service-role configuration is backend-only.
- Migration 029 applies explicit grants and publication-aware RLS to public job child tables.
- Profile policies use `(select auth.uid()) = id`.
- Vercel config sets HSTS, frame denial, MIME sniff protection, referrer policy, permissions policy, and immutable hashed assets.

### Findings

1. Migration 030 creates new public tables after migration 029's grant hardening. It enables RLS and grants read access to recruitment tables, but does not explicitly revoke all privileges first or specify `TO anon, authenticated` on the policies. Make this consistent with migration 029 and current Supabase opt-in Data API defaults.
2. Revoke default table/function/sequence privileges for Data API roles so future public objects are not exposed accidentally.
3. Migration 016 retains deprecated `auth.role()` policy text even if later migrations replace it. Fresh-schema tests must prove final effective policies, not just scan individual migration text.
4. The public client query and database publication policy must use one shared definition of “public job.” Currently frontend predicates and SQL policies can drift.
5. `AdminRouteGuard` is intentionally soft; set `VITE_ENABLE_ADMIN_UI=0` for normal production builds or publish admin as a separately protected deployment.
6. Add automated policy tests as anon, authenticated user A, authenticated user B, and service role for every exposed table.

## Competitor comparison

These percentages are a reproducible feature rubric, not claimed market share or traffic measurements.

| Capability | Live Govt Jobs | FreeJobAlert | Testbook Jobs | NCS |
|---|---:|---:|---:|---:|
| Fresh job breadth | 35% | 95% | 65% | 80% |
| Official-source transparency | 90% | 75% | 65% | 95% |
| Search/filter discovery | 78% | 85% | 75% | 90% |
| Results/admit cards/answer keys | 58% | 95% | 70% | 45% |
| Deadline urgency UX | 72% | 95% | 85% | 55% |
| Personalized alerts/account | 55% | 90% | 85% | 90% |
| Career guidance/preparation | 45% | 75% | 98% | 95% |
| Multilingual reach | 92% | 45% | 50% | 65% |
| Clean modern interface | 88% | 58% | 82% | 55% |
| Trust/safety controls visible in code | 90% | 70% | 70% | 95% |
| **Feature parity average** | **70%** | **83%** | **75%** | **77%** |

The product should not copy every competitor. Its best position is: official-source-first, multilingual, clean, and lifecycle-aware. Match FreeJobAlert on breadth/urgency, NCS on matching and career support, and Testbook only on high-value preparation links—not on course-commerce complexity.

## Step-by-step implementation plan

### Phase 0 — restore a trustworthy baseline (1–2 days)

1. Create a cleanup branch.
2. Resolve the TypeScript test conflict by preserving the meaningful ISRO regression test.
3. Delete/regenerate conflicted derived assets from the canonical source.
4. Expand hygiene checks to every generated JSON/XML file and any conflict marker anywhere outside allowed fixtures.
5. Add a catalog drop guard and sitemap XML parser to CI.
6. Run type-check, lint, frontend tests, backend tests with a writable temp directory, build, and snapshot verification.

Exit criterion: one reproducible green build and a production preview with a credible catalog count.

### Phase 1 — make the data path boring (3–5 days)

1. Declare the canonical public browse source (recommended: versioned CDN snapshot).
2. Use a small bootstrap only for initial shell; replace it deterministically with the full snapshot.
3. Use API/Supabase for server search, user data, admin, and job detail enrichment—not as competing homepage sources.
4. Remove lab-browser catalog branches.
5. Add telemetry for source selected, catalog size, fetch duration, parse duration, and fallback reason.

Exit criterion: one state diagram, one cache policy, no late source downgrade, and identical catalog rules in client/API/SQL.

### Phase 2 — reduce frontend weight (1–2 weeks)

1. Establish performance budgets: initial JS ≤ 220 KB gzip, initial CSS ≤ 45 KB gzip, bootstrap JSON ≤ 50 KB, no route chunk > 120 KB gzip.
2. Split CSS into shell, home sections, browse, job detail, account, and admin; introduce cascade layers.
3. Remove dead selectors with coverage from representative routes.
4. Refactor the four largest UI components into controller hooks and sections.
5. Route-load large SEO/reference datasets.
6. Enable strict TypeScript progressively.

Exit criterion: budgets enforced in CI; visual regression and axe checks green at mobile/tablet/desktop breakpoints.

### Phase 3 — close product parity gaps (2–4 weeks)

1. Make Closing Today / Closing This Week first-class saved views.
2. Complete recruitment lifecycle pages: notification, correction, exam date, admit card, answer key, result, final result.
3. Add saved searches and verified email/web-push/Telegram alert delivery with preference center and unsubscribe flow.
4. Add qualification + state + category matching and explain why each job matches.
5. Add freshness timestamps, correction history, official-source badges, and report-resolution status.

Exit criterion: ≥85% coverage for the chosen high-priority sources and verified end-to-end alert delivery.

### Phase 4 — simplify operations (1–2 weeks)

1. Consolidate pipeline entry points into daily/weekly/verify presets.
2. Split backend hotspots and archive unreferenced scripts.
3. Add source contract tests, idempotency tests, and live canary probes.
4. Surface pipeline/source health from the control-plane tables.
5. Document ownership and recovery steps for every stage.

Exit criterion: an operator can identify and replay one failed stage without running the full pipeline.

## Verification run from this audit

- `npm run validate`: failed at type-check because of merge markers in `jobDetailStructured.test.ts`.
- `npm run lint`: failed for the same parse error.
- `npm run check:frontend`: passed, but the check is incomplete and missed conflicted generated files.
- Backend tests: 207 passed, 4 skipped, 5 environment setup errors caused by inaccessible temp/cache paths.
- A clean production build could not be meaningfully certified while the source and generated assets contain conflict markers.

## What not to build yet

- Do not add more home-page sections before catalog integrity and hierarchy are fixed.
- Do not add another cache or data fallback.
- Do not add an AI chatbot before saved searches, lifecycle tracking, and alerts work reliably.
- Do not rewrite the frontend framework; the current React/Vite base is adequate.
- Do not remove verification/official-source gates merely to increase listing count.
