# Release candidate verification — 7 October 2026

## Decision

**DEPLOYMENT APPROVAL REQUIRED. No deployment or production mutation was performed.** Phase 1 is committed in `5efa86c` (62 changed paths including reports/screenshots). Phase 2 started with a clean working tree. The review compares that commit against its parent, inspects the current corrections and separates generated evidence from product changes. No commit, push, DNS/environment change, production migration/import, publication or Google submission was executed.

| Area | Status | Meaning |
|---|---|---|
| CODE | READY | Local compilation, lint, unit/contract tests and built-output route contracts validated; production hosting configuration is separate |
| DATABASE | READY | Read-only connection and existing public-read schema/gates work; empty local-content tables are disclosed |
| LGD | READY | 784 persisted verified districts, 36 states/UTs; source identity and migration 043 confirmed in Phase 1; Phase 2 reconfirms 784 via API/SQL |
| JOB CONTENT | LIMITED | 10 public jobs; broad state/source coverage is insufficient |
| SEO | LIMITED | Jobs and static artifacts validated; India release routing/API still unavailable live; thin districts excluded |
| UI/UX | LIMITED | Responsive correction pass tested; comprehensive screen-reader/contrast and real-user usability are not certified |
| DEPLOYMENT | NOT READY | Approved release, confirmed Vercel project/root and verified FastAPI upstream/configuration still needed |
| TRAFFIC/GROWTH | NOT VERIFIED | No authenticated GA/Search Console dashboard or field conversion evidence |

The Phase 1 percentage is historical. This release report does not infer a new readiness percentage from test counts.

## /india 404: repository cause and production limits

React has `/india`, state and persisted UUID district routes. BrowserRouter resolves them only after the SPA shell loads. Vite development serves that shell automatically. `frontend/dist` contains the shell and static job/browse/legal pages, but **no India route HTML**. The pre-Phase-1 root `vercel.json` had **no India SPA rewrite**, so a direct request had neither a file nor an applicable fallback. This is the confirmed repository-side routing gap.

Phase 1 added scoped rewrites to `/index.html` while `cleanUrls=true`. This was not a reliable correction: Vercel documents extensionless rewrite destinations with clean URLs. Phase 2 changes those targets to `/`, adds an explicit education root and query-preserving `/search` alias, and retains scoped families rather than a global catch-all. API, OG, sitemap, robots, data, assets and real job HTML remain outside SPA capture. See [Vercel clean URL/rewrite configuration](https://vercel.com/docs/project-configuration/vercel-json) and [SPA 404 guidance](https://vercel.com/kb/guide/why-is-my-deployed-project-giving-404).

Read-only live probes still return 404 for both apex and www India URLs; home returns 200 from Vercel. Apex redirect to www is represented in root configuration. There is no `frontend/vercel.json` and no `.vercel/project.json` link file. `.vercel/repo.json` records repo project metadata, but does not establish live Dashboard root/output overrides, deployed commit or route manifest. Ignore-build script skips only specific data-only/skip-vercel commit messages; current commit `New` does not match. **The exact live deployment provenance/Dashboard override is NOT VERIFIED.** We do not claim the locally corrected configuration has been deployed or that a particular remote setting was changed.

Repository-side routing regression tests cover clean URL targets, scoped India/education/search matching and exclusion of API/robots/sitemap/assets/job detail URLs. Built-output browser direct GET/reload covers `/`, `/jobs`, `/search?q=engineer`, `/india`, `/india/ka`, a real persisted district, a real job slug, `/education`, `/exams`, `/results`, `/scholarships`, `/yojana`. A local routing harness uses actual built files and scoped configuration; it is **not Vercel runtime certification**. Final browser evidence is listed below.

## API architecture: observed rather than assumed

Frontend API helpers read `VITE_API_URL` and default to `''`. India then calls same-origin `/api/india/...`. Search/contact/admin/reporting and some alerts helpers additionally disable API functionality when the variable is empty; an eventual same-origin proxy would require harmonizing those feature gates, not just changing DNS.

The deployed India API dependency `india-explorer-D1Mb1IVx.js` contains India endpoint paths and an empty base literal, no API subdomain and no localhost target. Live `/api/india/states` returns 404. `api.livegovtjobs.com` also does not resolve, but **the current deployed India bundle does not depend on that hostname**. The missing subdomain is not the direct explanation of today's same-origin API 404.

`api/og.js` is the only Vercel serverless API function. Root `/api/(.*)` rewrite preserves that namespace; it does not instantiate FastAPI. Existing `backend/Dockerfile`, `render.yaml` and `railway.toml` represent a separate long-running FastAPI service. Docs contain historical/planned subdomain references; `API_DECISION.md` calls FastAPI optional for static/Supabase browsing. India now requires that API for its live directory even though the homepage does not.

**Recommendation:** retain the existing static/Supabase public job catalog and separately hosted FastAPI architecture. Use a confirmed healthy provider URL as `VITE_API_URL` for India/full API features. A custom `api.livegovtjobs.com` domain is optional, not intrinsically required. Prefer a same-origin proxy only once a real upstream is confirmed and the existing explicit-origin feature gates are reviewed; do not invent an upstream or assume Vercel has a Python API already. No DNS change is necessary merely to serve the homepage. Full India/API release is blocked until an approved actual upstream is healthy and wired.

Evidence: [live probes and bundle observations](audits/release-live-probes-2026-10-07.json). Production Vercel environment values were not fetched; the compiled empty-base observation is specific to the deployed India bundle.

## Backend startup and TLS

From repository root on Windows:

```powershell
$env:APP_ENV = 'development'
$env:ALLOW_INSECURE_ADMIN = '0'
# Only when the provider requires an additional trusted CA; use your real local path:
$env:DATABASE_SSL_CA_FILE = 'C:/certificates/prod-ca-2021.crt'
npm run dev:backend
```

The alias runs the existing launcher and `backend/.venv/Scripts/python.exe -m uvicorn app.main:app --reload --port 8000`. No new FastAPI entry or alternate backend was introduced. Public reads do not require an admin key or insecure mode. With an explicitly empty admin key and insecure mode disabled, actual probes returned health 200/status ok, states 200/36 items, districts 200/total784/default120 items, Karnataka districts 200/total31/items31. The count is observed, not hard-coded in application logic. `/api/admin/jobs` returned 503 (admin unavailable), demonstrating fail-closed behavior.

The earlier insecure-admin instruction came from the supplied AGENTS guide and development template, not a public-read requirement. Removed from recommended startup; template now defaults to 0. Admin/ingest testing needs a separate configured `ADMIN_API_KEY`; weakening it is unnecessary.

TLS retains `CERT_REQUIRED` and hostname verification across local/CI/Render. No environment bypass remains. `DATABASE_SSL_CA_FILE` loads an additional trusted CA; missing or malformed PEM now raises an actionable RuntimeError without weakening verification. Two real-context regression cases cover missing/invalid CA, alongside default/CI/Render/legacy-flag tests. Provider CA used for verification is in TEMP only, not committed. Government HTTP legacy protocol handling still validates the certificate and hostname. No `verify=False` was introduced. Broken certificates can fail ingest, which is safer than falsely verified data.

## Catalog integrity and the two excluded live jobs

The original parent commit contained two conflict blocks in `live-jobs.json`, one in the list and one in bootstrap. Current JSON is valid, has ten rows per file, zero duplicate slugs and **zero records missing from the union of either original conflict-resolution branch**. Source `live-jobs.json` is unchanged in Phase 2. Derived list/bootstrap regeneration is byte-identical; generators inherit source `generatedAt` rather than creating a new clock value. Repository-wide anchored marker scan reports zero unresolved conflicts. E2E fixtures were restored; current public catalog contains zero e2e-test slugs.

Read-only production audit reconfirms 4,044 jobs: 3,499 drafts, 533 expired, 12 raw live. Actual SQL public API returns10, strict exportable10, committed catalog10, with **no missing or extra exportable slugs**. No rows were published or modified.

| Organization / title | Source | Stored state | Exact exclusion |
|---|---|---|---|
| BOBCAPS — Business Development Manager Recruitment 2026 - Apply Online | [Official BOBCAPS notification](https://www.bobcaps.in/media/brnj1qpq/opening-for-business-development-manager-role-at-bob-capital-as-off-roll-employee.pdf) | live, VERIFIED, published_to_site=true; completeness73; stored confidence82 | SQL public confidence below90; deterministic gate scores85, also below90. Not a stale export. Source column is null, but gate resolves the official PDF from other stored fields. |
| ESIC — `3 ESIC MEDICAL COLLEGE AND HOSPITAL RAJAJI NAGAR BANGALORE RECRUITMENT OF TEACHING FACULTY ON CONTRACTUAL BASIS FOR THE` | [ESIC recruitment source](https://www.esic.gov.in/recruitments) | live, VERIFIED, published_to_site=true; completeness80; confidence95 | Deadline2026-10-06 is past on audit date2026-10-07. SQL and deterministic gate exclude it despite stale raw status. |

Full IDs, slugs and exact fields: [release database evidence](audits/release-database-2026-10-07.json). Targeted recommendation: verify additional BOBCAPS eligibility/location/qualification evidence before any confidence correction; review ESIC for authorized expiry demotion. Neither was automatically changed.

Draft blocker counts use actual deterministic gate evaluation of all3,499 drafts, not the pending-review queue or a coarse two-field PDF check. Groups overlap and must not be summed.

| Draft blocker | Records |
|---|---:|
| Not verified | 3,498 |
| Calculated confidence below90 | 3,487 |
| Completeness below70 | 3,301 |
| Missing/malformed deadline | 3,264 |
| Missing official notification PDF (full gate resolver) | 1,275 |
| Non-recruitment classification | 594 |
| Past deadline | 212 |
| Missing/invalid/unapproved official URL | 137 (116 missing/invalid source +21 unapproved source) |
| Other major date/location blockers | 72 |

Other errors include deadline before publication36, future publication20, implausibly old publication9, missing state_codes for scoped jobs5, implausibly distant deadline4. Fix deadline/PDF extraction and recruitment classification from official notifications first; then recompute completeness and review verification. Do not lower thresholds. ESIC/SSC/UPPSC/IBPS/UPSC source-specific recovery recommendations from Phase 1 remain relevant.

## LGD, SEO and district indexability

LGD spreadsheet hash remains `387ce8805f54b68baaeda1dbc40751927e8eb981f2b48548ffeaf833a6881d68`. Source validator passes784 unique districts/36 units, no rejected rows or unknown mappings; every CSV row reconciles to immutable XLSX. Phase1 actual database history confirms migration043 and existing import (784 unchanged, zero-write dry run). Phase2 SQL/API confirms all784 persisted verified districts. No migration or `--apply` was run.

**Zero district URLs currently meet the stricter content eligibility criterion.** Verified identity and UUID alone produce a thin district page. Sitemap now requires a verified persisted district, valid canonical state/UUID, uniqueness and at least one verified city or place relationship. Production SQL found784 verified identities but0 with such content. Build eligibility reads verified city/place relationships from Supabase; API counts use the same verified-only condition. Empty base district pages and empty category pages are noindex,follow. Categories are not included in the district sitemap. Directory navigation and source provenance remain available.

This content check is a necessary minimum, not a promise every future populated district should rank/index: useful source-attributed content, reachable approved API and live direct-route/canonical validation are still required before expanding indexing. Removing the784 identity-only URLs reverses the over-broad Phase1 sitemap artifact. It does not delete database districts.

Robots, sitemap index, active job sitemap, empty valid districts XML, canonical/title and JSON-LD blocks were inspected from built artifacts. There are10 active job sitemap URLs and10 job detail prerenders; additional jobs/*.html are browse shells, not fabricated postings. Static404 is noindex. India breadcrumbs/canonical/Place schema remain; client-rendered metadata does not prove Google ingestion. JobPosting structured data acceptance, actual indexed coverage and Search Console status are NOT VERIFIED. [Built artifact evidence](audits/release-output-2026-10-07.json).

## UI/CSS and public claims review

Reviewed Phase1 screenshots at360x800,390x844,768x1024,1024x768,1440x900. Remaining visible issues included duplicate hero copy, oversized four-card marketing section, stacked footer columns and blank offscreen discovery captures. Corrections preserve the existing design system: latest jobs before state/sector browse, compact exams/results/preparation navigation, directory/map after useful job navigation, duplicate marketing/stat controls in an optional Catalog breakdown, two-column mobile resource cards and footer, existing token-based spacing, and mounted discovery content no longer hidden by content-visibility. Existing map/state-job behavior remains.

State glance no longer renders unsourced population, literacy, district-seat or leadership assertions from curated fact tables; it shows actual API district/city/place counts with LGD attribution and an honest unavailable state. Source tables were not destructively deleted. Education starting salary is displayed only with both a source explanation and source URL, and those citations are visible. This is attribution, not independent certification of every salary band. Removed the unsupported daily `100+ sources` success claim from About in favor of the actual scheduled, gated process. No user/traffic/success metrics were added.

Homepage job/vacancy/org counts come from source catalog/generated shell totals (10/213/7), not invented metrics. Configured-source inventory count is not a claim every source is healthy or currently yielding jobs. Static state/UT master identities are covered by LGD validation; all locality-content zeroes are distinguished from API failure. Numerical eligibility/duration and salaries in actual official job notifications remain source-derived. Career editorial content still needs ongoing verification; no job/result feed is presented as comprehensive.

## Analytics and security

GA config disables implicit page views; explicit page_view emits once per intended caller. Mounted SPA test verifies one initial view plus one per jobs/state navigation; search event contains only bounded length. Library now strips query/fragment even if a future caller passes them. No raw search text is sent by the route tracker. GA enhanced-measurement history settings, consent, production receipt and Search Console ownership are **NOT VERIFIED**. Source tests are not a production analytics PASS.

Tracked-file scan includes credential-shaped keys, database URIs, JWT role checks, private-key headers and tracked .env filenames. No confirmed real secret/private certificate or tracked runtime .env was found; nothing is staged. The only retained findings are synthetic parser-test URI fixtures in `backend/tests/test_database_url.py`, informational/no rotation. Template/interpolated/masked values are classified separately from actual credentials. Values were never printed. Pattern scans are not an exhaustive history or binary secret audit. Evidence reports only file/type/severity/action: [repository scan](audits/release-repository-2026-10-07.json).

## Tests and exact results

| Executed check | Result |
|---|---|
| npm run india:validate:lgd | PASS784/784,36 units,0 rejected/duplicates/unknown mappings |
| npm run test:backend with trusted CA | PASS320,1 skipped,1 Starlette/httpx deprecation warning |
| npm run type-check | PASS |
| npm run lint | PASS,max-warnings0 |
| npm run test (final, trusted CA) | PASS464 frontend/93 files;320 backend+1 skipped;10 script tests |
| npm run test without CA | PASS frontend464;backend317+4 skipped (DB-backed cases unavailable);10 scripts; not counted as equivalent DB verification |
| npm run build | PASS705 modules;10 job detail prerenders;real catalog retained |
| npm run audit:india | PASS16 structural checks |
| npm run audit:india:data | PASS7 source readiness checks; not a production import assertion |
| npm run check:frontend | PASS zero conflicts,TS-only frontend,92 valid deployment JSON/XML assets |
| npm run test:e2e | PASS16 existing browser tests;7 opt-in real-data release tests skipped in fixture suite |
| Built-output release browser suite | PASS7/7 in56.7s; direct navigation/refresh,51 public routes,five viewports |
| npm run check:performance-budgets | PASS JS/CSS/catalog budgets |
| Read-only release database audit | PASS4,044 jobs,10 strict exports,784 districts,0 eligible content districts,zero writes |
| Catalog branch reconciliation/regeneration | PASS zero discarded branch-union slugs,zero duplicates,byte-identical derived regeneration |
| git diff --check | PASS |

Failures encountered and resolved/disclosed: release scan initially failed on Windows default decoding, corrected to UTF-8; one database evidence retry timed out and later passed with a session-only longer command timeout; initial built browser run exposed absent same-origin API wiring (real deployment blocker) and a test using nonexistent jobs.xml instead of jobs-active.xml; repeated API requests and teardown races caused intermediate browser failures, corrected with a cached read-only bridge and awaited teardown. One full test attempt overlapped the fixture build and read its temporary one-job catalog, causing3 data assertions to fail; serialized final run passed and fixtures were restored. HappyDOM AbortError cleanup warnings and npm configuration warnings remain visible, not hidden.

Final main JS188.94kB/~60.65gzip versus Phase1 188.79/~60.61; Home30.26/~9.59 versus30.44/~9.69. Service worker130 entries/~3,207KiB versus129/~3,244KiB. Budgets pass; this is not measured Lighthouse or field Core Web Vitals certification.

## Remaining production blockers and approval commands

Confirm the intended Vercel project and repository-root settings, approved healthy FastAPI provider URL, frontend API origin/CORS and trusted database CA configuration. Validate every live direct route and API after approved deployment; verify indexability and analytics in actual dashboards. Keep rejected/stale raw-live rows gated. Broad job content/locality coverage is limited. No production mutation is needed merely to verify LGD again.

**Recommended frontend commands only after explicit deployment approval and confirmation of project/upstream configuration** (not executed):

```powershell
Set-Location -LiteralPath 'D:\My Projects\mygovtjobs-main'
npx vercel pull --yes --environment=production
npx vercel build --prod
npx vercel deploy --prebuilt --prod
```

Run from repo root with the confirmed project link. Pull reads production config locally; build may contain sensitive build inputs, so never commit .vercel output/environment files. The deployment command changes the live deployment/domain alias and therefore requires explicit approval. See [Vercel build](https://vercel.com/docs/cli/build) and [deploy](https://vercel.com/docs/cli/deploy). Do not issue guessed Railway/Render/DNS commands: the provider/project is not established by repository examples. Backend deployment and configuration must be approved separately once a specific service is selected. No commands above were executed during this task.

## Per-file review, retained/reverted changes and exact current files

The generated appendix classifies every Phase1 path and current Phase2 path. Classification is the primary purpose; mixed concerns are described in the decision. Generated reports/screenshots are evidence, not product implementation. No Phase1 changes are retained solely because they were previously made.

Reversed/corrected: HTML-extension SPA rewrite targets; recommending insecure admin startup; indexing784 content-empty district URLs; prominent duplicate marketing copy; unsourced state glance facts; unsourced career salary display. Retained: real catalog recovery, gate-preserving district scope, strict TLS, search fallback, official links, scoped routing, provenance, loading/error/empty states, metadata ownership, date-based urgency, narrow dead-code cleanup and tested readability changes. No unrelated working tree changes were reverted; Phase2 started clean.

### Original Phase1 commit: all62 reviewed paths

Baseline `5efa86cb07bfd3117de74a52c17341235486d216` was committed externally; this task made no commit. The parent diff supplies the exact prior-change scope.

| File | Classification | Decision |
|---|---|---|
| `RUN.md` | REQUIRED FIX | Retain reviewed wiring, contract, recovery or diagnostic correction; no production writes. Rechecked/corrected in Phase2 as detailed above. |
| `backend/.env.example` | SECURITY FIX | Retain strict certificate/hostname verification and safe public startup; CA errors covered. Rechecked/corrected in Phase2 as detailed above. |
| `backend/app/database/connect_args.py` | SECURITY FIX | Retain strict certificate/hostname verification and safe public startup; CA errors covered. Rechecked/corrected in Phase2 as detailed above. |
| `backend/app/routes/india.py` | REQUIRED FIX | Retain reviewed wiring, contract, recovery or diagnostic correction; no production writes. |
| `backend/app/scrapers/http_client.py` | SECURITY FIX | Retain strict certificate/hostname verification and safe public startup; CA errors covered. |
| `backend/app/utils/url_safety.py` | SECURITY FIX | Retain strict certificate/hostname verification and safe public startup; CA errors covered. |
| `backend/tests/test_connect_args.py` | TEST ONLY | Retain regression/browser verification; local bridge is explicitly test-only. Rechecked/corrected in Phase2 as detailed above. |
| `backend/tests/test_india_explorer_api_contract.py` | TEST ONLY | Retain regression/browser verification; local bridge is explicitly test-only. |
| `docs/FULL_PRODUCTION_AUDIT_2026-10-07.md` | GENERATED ARTIFACT | Retain evidence or reconciled real-data catalog; historical evidence remains dated. |
| `docs/audits/p0-review-queue-latest.json` | GENERATED ARTIFACT | Retain evidence or reconciled real-data catalog; historical evidence remains dated. |
| `docs/audits/production-readonly-2026-10-07.json` | GENERATED ARTIFACT | Retain evidence or reconciled real-data catalog; historical evidence remains dated. |
| `docs/audits/repository-inventory-2026-10-07.json` | GENERATED ARTIFACT | Retain evidence or reconciled real-data catalog; historical evidence remains dated. |
| `docs/audits/screenshots-2026-10-07/production-audit-productio-08724-a-state-district-and-detail/home-1024.png` | GENERATED ARTIFACT | Retain evidence or reconciled real-data catalog; historical evidence remains dated. |
| `docs/audits/screenshots-2026-10-07/production-audit-productio-08724-a-state-district-and-detail/state-1024.png` | GENERATED ARTIFACT | Retain evidence or reconciled real-data catalog; historical evidence remains dated. |
| `docs/audits/screenshots-2026-10-07/production-audit-productio-21c23-a-state-district-and-detail/home-768.png` | GENERATED ARTIFACT | Retain evidence or reconciled real-data catalog; historical evidence remains dated. |
| `docs/audits/screenshots-2026-10-07/production-audit-productio-21c23-a-state-district-and-detail/state-768.png` | GENERATED ARTIFACT | Retain evidence or reconciled real-data catalog; historical evidence remains dated. |
| `docs/audits/screenshots-2026-10-07/production-audit-productio-809ed-a-state-district-and-detail/home-1440.png` | GENERATED ARTIFACT | Retain evidence or reconciled real-data catalog; historical evidence remains dated. |
| `docs/audits/screenshots-2026-10-07/production-audit-productio-809ed-a-state-district-and-detail/state-1440.png` | GENERATED ARTIFACT | Retain evidence or reconciled real-data catalog; historical evidence remains dated. |
| `docs/audits/screenshots-2026-10-07/production-audit-productio-81ea6-a-state-district-and-detail/home-360.png` | GENERATED ARTIFACT | Retain evidence or reconciled real-data catalog; historical evidence remains dated. |
| `docs/audits/screenshots-2026-10-07/production-audit-productio-81ea6-a-state-district-and-detail/state-360.png` | GENERATED ARTIFACT | Retain evidence or reconciled real-data catalog; historical evidence remains dated. |
| `docs/audits/screenshots-2026-10-07/production-audit-productio-e311e-a-state-district-and-detail/home-390.png` | GENERATED ARTIFACT | Retain evidence or reconciled real-data catalog; historical evidence remains dated. |
| `docs/audits/screenshots-2026-10-07/production-audit-productio-e311e-a-state-district-and-detail/state-390.png` | GENERATED ARTIFACT | Retain evidence or reconciled real-data catalog; historical evidence remains dated. |
| `docs/audits/source-funnel-latest.json` | GENERATED ARTIFACT | Retain evidence or reconciled real-data catalog; historical evidence remains dated. |
| `frontend/e2e/production-audit.spec.ts` | TEST ONLY | Retain regression/browser verification; local bridge is explicitly test-only. Rechecked/corrected in Phase2 as detailed above. |
| `frontend/playwright.audit.config.ts` | TEST ONLY | Retain regression/browser verification; local bridge is explicitly test-only. Rechecked/corrected in Phase2 as detailed above. |
| `frontend/public/data/live-jobs-bootstrap.json` | GENERATED ARTIFACT | Retain evidence or reconciled real-data catalog; historical evidence remains dated. |
| `frontend/public/data/live-jobs-list.json` | GENERATED ARTIFACT | Retain evidence or reconciled real-data catalog; historical evidence remains dated. |
| `frontend/public/data/live-jobs.json` | GENERATED ARTIFACT | Retain evidence or reconciled real-data catalog; historical evidence remains dated. |
| `frontend/public/sitemaps/districts.xml` | SEO FIX | Reverse Phase1 inclusion of784 thin district URLs; current eligible URL count0. Rechecked/corrected in Phase2 as detailed above. |
| `frontend/src/App.tsx` | REQUIRED FIX | Retain reviewed wiring, contract, recovery or diagnostic correction; no production writes. |
| `frontend/src/components/AnalyticsPageTracker.tsx` | REQUIRED FIX | Retain reviewed wiring, contract, recovery or diagnostic correction; no production writes. |
| `frontend/src/components/AppRoutes.tsx` | REQUIRED FIX | Retain reviewed wiring, contract, recovery or diagnostic correction; no production writes. Rechecked/corrected in Phase2 as detailed above. |
| `frontend/src/components/home/HomeCareerMarketplace.tsx` | UX IMPROVEMENT | Retain scoped readability/navigation changes; Phase2 removes duplicate emphasis and unsupported facts. Rechecked/corrected in Phase2 as detailed above. |
| `frontend/src/components/home/HomeHeroMarketing.tsx` | UX IMPROVEMENT | Retain scoped readability/navigation changes; Phase2 removes duplicate emphasis and unsupported facts. |
| `frontend/src/components/home/HomePage.tsx` | UX IMPROVEMENT | Retain scoped readability/navigation changes; Phase2 removes duplicate emphasis and unsupported facts. Rechecked/corrected in Phase2 as detailed above. |
| `frontend/src/components/home/IndiaGlancePanel.tsx` | UX IMPROVEMENT | Retain scoped readability/navigation changes; Phase2 removes duplicate emphasis and unsupported facts. |
| `frontend/src/components/home/TrustStrip.tsx` | UX IMPROVEMENT | Retain deletion of unused, unsupported fact/claim UI; references checked. |
| `frontend/src/components/india/ExplorerRecords.tsx` | REQUIRED FIX | Retain reviewed wiring, contract, recovery or diagnostic correction; no production writes. |
| `frontend/src/components/jobs/JobCard.tsx` | REQUIRED FIX | Retain reviewed wiring, contract, recovery or diagnostic correction; no production writes. |
| `frontend/src/data/indiaFacts.ts` | REQUIRED FIX | Retain deletion of unused, unsupported fact/claim UI; references checked. |
| `frontend/src/hooks/useIndiaExplorer.ts` | REQUIRED FIX | Retain reviewed wiring, contract, recovery or diagnostic correction; no production writes. |
| `frontend/src/hooks/useServerJobSearch.ts` | REQUIRED FIX | Retain reviewed wiring, contract, recovery or diagnostic correction; no production writes. |
| `frontend/src/lib/analytics.ts` | REQUIRED FIX | Retain reviewed wiring, contract, recovery or diagnostic correction; no production writes. Rechecked/corrected in Phase2 as detailed above. |
| `frontend/src/lib/indiaApi.ts` | REQUIRED FIX | Retain reviewed wiring, contract, recovery or diagnostic correction; no production writes. |
| `frontend/src/pages/DistrictExplorerPage.tsx` | SEO FIX | Retain metadata/eligibility correction; content-empty district URLs are excluded. Rechecked/corrected in Phase2 as detailed above. |
| `frontend/src/pages/IndiaExplorerPage.tsx` | REQUIRED FIX | Retain reviewed wiring, contract, recovery or diagnostic correction; no production writes. |
| `frontend/src/pages/StateExplorerPage.tsx` | REQUIRED FIX | Retain reviewed wiring, contract, recovery or diagnostic correction; no production writes. Rechecked/corrected in Phase2 as detailed above. |
| `frontend/src/styles/extensions.css` | UX IMPROVEMENT | Retain scoped readability/navigation changes; Phase2 removes duplicate emphasis and unsupported facts. |
| `frontend/src/styles/india-explorer.css` | UX IMPROVEMENT | Retain scoped readability/navigation changes; Phase2 removes duplicate emphasis and unsupported facts. |
| `frontend/src/styles/polish.css` | UX IMPROVEMENT | Retain scoped readability/navigation changes; Phase2 removes duplicate emphasis and unsupported facts. Rechecked/corrected in Phase2 as detailed above. |
| `frontend/src/styles/tokens.css` | UX IMPROVEMENT | Retain scoped readability/navigation changes; Phase2 removes duplicate emphasis and unsupported facts. |
| `frontend/src/tests/hooks/useServerJobSearch.test.tsx` | TEST ONLY | Retain regression/browser verification; local bridge is explicitly test-only. |
| `frontend/src/tests/lib/analytics.test.ts` | TEST ONLY | Retain regression/browser verification; local bridge is explicitly test-only. Rechecked/corrected in Phase2 as detailed above. |
| `frontend/src/tests/pages/IndiaExplorer.lgd.test.tsx` | TEST ONLY | Retain regression/browser verification; local bridge is explicitly test-only. Rechecked/corrected in Phase2 as detailed above. |
| `frontend/src/tests/utils/liveJobStatus.test.ts` | TEST ONLY | Retain regression/browser verification; local bridge is explicitly test-only. |
| `frontend/src/utils/liveJobAdapter.ts` | REQUIRED FIX | Retain reviewed wiring, contract, recovery or diagnostic correction; no production writes. |
| `frontend/vite.config.ts` | REQUIRED FIX | Retain reviewed wiring, contract, recovery or diagnostic correction; no production writes. |
| `package.json` | REQUIRED FIX | Retain reviewed wiring, contract, recovery or diagnostic correction; no production writes. Rechecked/corrected in Phase2 as detailed above. |
| `scripts/audit-india-data-readiness.mjs` | REQUIRED FIX | Retain reviewed wiring, contract, recovery or diagnostic correction; no production writes. |
| `scripts/audit-production-readonly.py` | REQUIRED FIX | Retain reviewed wiring, contract, recovery or diagnostic correction; no production writes. |
| `scripts/prerender-home-shell.mjs` | SEO FIX | Retain metadata/eligibility correction; content-empty district URLs are excluded. |
| `vercel.json` | REQUIRED FIX | Correct Phase1 destinations to extensionless scoped SPA routes; preserve API/data/OG namespaces. Rechecked/corrected in Phase2 as detailed above. |

### Exact current Phase2 working tree

These are the pending tracked modifications/new files at handoff; no commit, push or deployment was performed.

| File | Classification | Decision |
|---|---|---|
| `RUN.md` | REQUIRED FIX | Retain reviewed wiring, contract, recovery or diagnostic correction; no production writes. |
| `backend/.env.example` | SECURITY FIX | Retain strict certificate/hostname verification and safe public startup; CA errors covered. |
| `backend/app/database/connect_args.py` | SECURITY FIX | Retain strict certificate/hostname verification and safe public startup; CA errors covered. |
| `backend/tests/test_connect_args.py` | TEST ONLY | Retain regression/browser verification; local bridge is explicitly test-only. |
| `docs/RELEASE_CANDIDATE_AUDIT_2026-10-07.md` | GENERATED ARTIFACT | Retain evidence or reconciled real-data catalog; historical evidence remains dated. |
| `docs/audits/release-database-2026-10-07.json` | GENERATED ARTIFACT | Retain evidence or reconciled real-data catalog; historical evidence remains dated. |
| `docs/audits/release-live-probes-2026-10-07.json` | GENERATED ARTIFACT | Retain evidence or reconciled real-data catalog; historical evidence remains dated. |
| `docs/audits/release-output-2026-10-07.json` | GENERATED ARTIFACT | Retain evidence or reconciled real-data catalog; historical evidence remains dated. |
| `docs/audits/release-repository-2026-10-07.json` | GENERATED ARTIFACT | Retain evidence or reconciled real-data catalog; historical evidence remains dated. |
| `docs/audits/release-screenshots-2026-10-07/production-audit-productio-08724-a-state-district-and-detail/home-1024.png` | GENERATED ARTIFACT | Retain evidence or reconciled real-data catalog; historical evidence remains dated. |
| `docs/audits/release-screenshots-2026-10-07/production-audit-productio-08724-a-state-district-and-detail/state-1024.png` | GENERATED ARTIFACT | Retain evidence or reconciled real-data catalog; historical evidence remains dated. |
| `docs/audits/release-screenshots-2026-10-07/production-audit-productio-21c23-a-state-district-and-detail/home-768.png` | GENERATED ARTIFACT | Retain evidence or reconciled real-data catalog; historical evidence remains dated. |
| `docs/audits/release-screenshots-2026-10-07/production-audit-productio-21c23-a-state-district-and-detail/state-768.png` | GENERATED ARTIFACT | Retain evidence or reconciled real-data catalog; historical evidence remains dated. |
| `docs/audits/release-screenshots-2026-10-07/production-audit-productio-809ed-a-state-district-and-detail/home-1440.png` | GENERATED ARTIFACT | Retain evidence or reconciled real-data catalog; historical evidence remains dated. |
| `docs/audits/release-screenshots-2026-10-07/production-audit-productio-809ed-a-state-district-and-detail/state-1440.png` | GENERATED ARTIFACT | Retain evidence or reconciled real-data catalog; historical evidence remains dated. |
| `docs/audits/release-screenshots-2026-10-07/production-audit-productio-81ea6-a-state-district-and-detail/home-360.png` | GENERATED ARTIFACT | Retain evidence or reconciled real-data catalog; historical evidence remains dated. |
| `docs/audits/release-screenshots-2026-10-07/production-audit-productio-81ea6-a-state-district-and-detail/state-360.png` | GENERATED ARTIFACT | Retain evidence or reconciled real-data catalog; historical evidence remains dated. |
| `docs/audits/release-screenshots-2026-10-07/production-audit-productio-e311e-a-state-district-and-detail/home-390.png` | GENERATED ARTIFACT | Retain evidence or reconciled real-data catalog; historical evidence remains dated. |
| `docs/audits/release-screenshots-2026-10-07/production-audit-productio-e311e-a-state-district-and-detail/state-390.png` | GENERATED ARTIFACT | Retain evidence or reconciled real-data catalog; historical evidence remains dated. |
| `frontend/e2e/production-audit.spec.ts` | TEST ONLY | Retain regression/browser verification; local bridge is explicitly test-only. |
| `frontend/playwright.audit.config.ts` | TEST ONLY | Retain regression/browser verification; local bridge is explicitly test-only. |
| `frontend/public/sitemaps/districts.xml` | SEO FIX | Retain metadata/eligibility correction; content-empty district URLs are excluded. |
| `frontend/src/components/AppRoutes.tsx` | REQUIRED FIX | Retain reviewed wiring, contract, recovery or diagnostic correction; no production writes. |
| `frontend/src/components/home/HomeCareerMarketplace.tsx` | UX IMPROVEMENT | Retain scoped readability/navigation changes; Phase2 removes duplicate emphasis and unsupported facts. |
| `frontend/src/components/home/HomePage.tsx` | UX IMPROVEMENT | Retain scoped readability/navigation changes; Phase2 removes duplicate emphasis and unsupported facts. |
| `frontend/src/components/home/StateGlancePanel.tsx` | UX IMPROVEMENT | Retain scoped readability/navigation changes; Phase2 removes duplicate emphasis and unsupported facts. |
| `frontend/src/lib/analytics.ts` | REQUIRED FIX | Retain reviewed wiring, contract, recovery or diagnostic correction; no production writes. |
| `frontend/src/pages/DistrictExplorerPage.tsx` | SEO FIX | Retain metadata/eligibility correction; content-empty district URLs are excluded. |
| `frontend/src/pages/EducationHubPage.tsx` | REQUIRED FIX | Retain reviewed wiring, contract, recovery or diagnostic correction; no production writes. |
| `frontend/src/pages/StateExplorerPage.tsx` | REQUIRED FIX | Retain reviewed wiring, contract, recovery or diagnostic correction; no production writes. |
| `frontend/src/pages/legalContent.ts` | REQUIRED FIX | Retain reviewed wiring, contract, recovery or diagnostic correction; no production writes. |
| `frontend/src/styles/home-mobile.css` | UX IMPROVEMENT | Retain scoped readability/navigation changes; Phase2 removes duplicate emphasis and unsupported facts. |
| `frontend/src/styles/layout.css` | UX IMPROVEMENT | Retain scoped readability/navigation changes; Phase2 removes duplicate emphasis and unsupported facts. |
| `frontend/src/styles/polish.css` | UX IMPROVEMENT | Retain scoped readability/navigation changes; Phase2 removes duplicate emphasis and unsupported facts. |
| `frontend/src/styles/topmate-inspired.css` | UX IMPROVEMENT | Retain scoped readability/navigation changes; Phase2 removes duplicate emphasis and unsupported facts. |
| `frontend/src/tests/components/AnalyticsPageTracker.test.tsx` | TEST ONLY | Retain regression/browser verification; local bridge is explicitly test-only. |
| `frontend/src/tests/lib/analytics.test.ts` | TEST ONLY | Retain regression/browser verification; local bridge is explicitly test-only. |
| `frontend/src/tests/pages/IndiaExplorer.lgd.test.tsx` | TEST ONLY | Retain regression/browser verification; local bridge is explicitly test-only. |
| `package.json` | REQUIRED FIX | Retain reviewed wiring, contract, recovery or diagnostic correction; no production writes. |
| `scripts/audit-release-readonly.py` | REQUIRED FIX | Retain reviewed wiring, contract, recovery or diagnostic correction; no production writes. |
| `scripts/audit-release-repository.py` | REQUIRED FIX | Retain reviewed wiring, contract, recovery or diagnostic correction; no production writes. |
| `scripts/build-sitemap.mjs` | SEO FIX | Retain metadata/eligibility correction; content-empty district URLs are excluded. |
| `scripts/lib/india-district-sitemap.mjs` | SEO FIX | Retain metadata/eligibility correction; content-empty district URLs are excluded. |
| `scripts/lib/india-district-sitemap.test.mjs` | TEST ONLY | Retain regression/browser verification; local bridge is explicitly test-only. |
| `scripts/lib/release-routing.test.mjs` | TEST ONLY | Retain regression/browser verification; local bridge is explicitly test-only. |
| `scripts/serve-release-output.mjs` | TEST ONLY | Retain regression/browser verification; local bridge is explicitly test-only. |
| `vercel.json` | REQUIRED FIX | Retain reviewed wiring, contract, recovery or diagnostic correction; no production writes. |

## Complete referenced environment matrix

All160 discovered configuration names follow. “Required” describes the feature that needs the override, not a requirement to set every variable. Backend settings/script defaults remain authoritative; actual deployment secret values were not read or printed. Local-only test variables are listed separately below. References are exact source/template paths from the scan; documentation mentions alone are not execution references.

| Variable | Used by / currently referenced | Local expectation | Production expectation | Secret | Required |
|---|---|---|---|---|---|
| `ADMIN_API_KEY` | `backend/.env.example`<br>`backend/app/config.py`<br>`scripts/run-ingest-all.mjs`<br>`scripts/setup-supabase-env.mjs` | Empty permitted for public API; key for admin | Strong backend-only key for admin | Yes | Admin writes only |
| `AI_REVIEW_API_KEY` | `backend/app/services/llm_qa_assist.py` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | Yes | Conditional on consuming feature |
| `AI_REVIEW_MODEL` | `backend/app/services/llm_qa_assist.py` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `ALERT_DELIVERY_AFTER_SYNC` | `backend/app/config.py` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `ALERT_DELIVERY_LOOKBACK_HOURS` | `backend/app/config.py` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `ALERT_FROM_EMAIL` | `.github/workflows/canonical-daily-pipeline.yml`<br>`.github/workflows/notify-on-failure.yml`<br>`backend/app/config.py`<br>`scripts/notify-workflow-failure.mjs` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `ALERT_SITE_URL` | `.env.example`<br>`.github/workflows/canonical-daily-pipeline.yml`<br>`api/og.js`<br>`backend/app/config.py`<br>`scripts/build-rss.mjs`<br>`scripts/build-sitemap.mjs`<br>`scripts/prerender-job-pages.mjs` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `ALERT_SUBSCRIBE_RATE_LIMIT_PER_MINUTE` | `backend/app/config.py` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `ALLOW_DRASTIC_JSON_EXPORT` | `backend/app/services/job_persist_service.py`<br>`scripts/run-sync-production.py` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `ALLOW_EMPTY_JSON_EXPORT` | `backend/app/services/job_persist_helpers.py` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `ALLOW_FALLBACK_JSON_EXPORT` | `backend/.env.example`<br>`backend/app/config.py` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `ALLOW_INSECURE_ADMIN` | `backend/.env.example`<br>`backend/app/config.py` | 0 | 0 | No | No; secure default |
| `ANTHROPIC_API_KEY` | `backend/app/services/llm_qa_assist.py` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | Yes | Conditional on consuming feature |
| `API_BASE_URL` | `scripts/go-live-check.mjs` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `API_HEALTH_URL` | `.github/workflows/uptime-check.yml`<br>`scripts/go-live-check.mjs`<br>`scripts/website-health-agent.mjs` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `APP_ENV` | `backend/.env.example`<br>`backend/app/config.py` | development | production | No | Runtime mode |
| `AUTO_PUBLISH_VERIFIED` | `backend/.env.example`<br>`backend/app/config.py` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `BUDGET_MAX_BOOTSTRAP_RAW` | `scripts/check-performance-budgets.mjs` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `BUDGET_MAX_CSS_CHUNK_GZIP` | `scripts/check-performance-budgets.mjs` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `BUDGET_MAX_JS_CHUNK_GZIP` | `scripts/check-performance-budgets.mjs` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `BUDGET_MAX_LIST_RAW` | `scripts/check-performance-budgets.mjs` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `CI` | `frontend/playwright.config.ts`<br>`scripts/check-env-alignment.mjs` | Tool/platform supplied | Tool/platform supplied | No | Automatic where applicable |
| `CONTACT_TO_EMAIL` | `backend/app/config.py` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `CORS_ORIGINS` | `backend/app/config.py` | Explicit localhost frontend origins | Approved canonical frontend origin(s) | No | Cross-origin API |
| `DAILY_SYNC_ENFORCE_ONCE` | `backend/app/config.py` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `DAILY_SYNC_HOUR_IST` | `backend/app/config.py` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `DAILY_SYNC_MINUTE_IST` | `backend/app/config.py` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `DAILY_SYNC_STATE_PATH` | `backend/app/config.py` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `DATABASE_COMMAND_TIMEOUT` | `backend/app/config.py` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `DATABASE_SSL_CA_FILE` | `backend/app/database/connect_args.py` | Trusted additional CA file if provider chain requires | Trusted readable provider CA path if needed | No | Conditional TLS trust |
| `DATABASE_URL` | `.github/workflows/canonical-daily-pipeline.yml`<br>`.github/workflows/catalog-recovery-export.yml`<br>`.github/workflows/fetch-official-feeds.yml`<br>`.github/workflows/weekly-enrich.yml`<br>`.github/workflows/weekly-portal-audit.yml`<br>`backend/.env.example`<br>`backend/app/config.py`<br>`scripts/diagnose-database-url.mjs`<br>`scripts/find-pooler-database-url.py`<br>`scripts/push-github-actions-secrets.mjs`<br>`scripts/setup-supabase-env.mjs` | Trusted transaction pooler connection | Secret asyncpg transaction pooler URL,port6543 | Yes | DB-backed API/ingest |
| `DEPLOY_URL` | `scripts/verify-deploy.mjs` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `DEV` | `frontend/src/components/ErrorBoundary.tsx`<br>`frontend/src/components/home/OfficialHeadlinesSection.tsx`<br>`frontend/src/lib/analytics.ts` | Tool/platform supplied | Tool/platform supplied | No | Automatic where applicable |
| `E2E_PORT` | `frontend/playwright.config.ts`<br>`frontend/scripts/e2e-webserver.mjs` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `E2E_REUSE_SERVER` | `frontend/playwright.config.ts` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `FEED_FETCH_CONCURRENCY` | `scripts/lib/fetch-official-rss-sources.mjs` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `GITHUB_ACTIONS` | `scripts/audit-official-sites.mjs`<br>`scripts/lib/fetch-official-rss-sources.mjs` | Tool/platform supplied | Tool/platform supplied | No | Automatic where applicable |
| `GITHUB_ACTOR` | `scripts/notify-workflow-failure.mjs` | Tool/platform supplied | Tool/platform supplied | No | Automatic where applicable |
| `GITHUB_ENV` | `scripts/build-database-url-for-actions.mjs` | Tool/platform supplied | Tool/platform supplied | No | Automatic where applicable |
| `GITHUB_HEAD_REF` | `scripts/notify-workflow-failure.mjs` | Tool/platform supplied | Tool/platform supplied | No | Automatic where applicable |
| `GITHUB_REF_NAME` | `scripts/notify-workflow-failure.mjs` | Tool/platform supplied | Tool/platform supplied | No | Automatic where applicable |
| `GITHUB_REPO` | `scripts/push-github-actions-secrets.mjs` | Tool/platform supplied | Tool/platform supplied | No | Automatic where applicable |
| `GITHUB_REPOSITORY` | `scripts/notify-workflow-failure.mjs` | Tool/platform supplied | Tool/platform supplied | No | Automatic where applicable |
| `GITHUB_RUN_ID` | `scripts/notify-workflow-failure.mjs` | Tool/platform supplied | Tool/platform supplied | No | Automatic where applicable |
| `GITHUB_SERVER_URL` | `scripts/notify-workflow-failure.mjs` | Tool/platform supplied | Tool/platform supplied | No | Automatic where applicable |
| `GITHUB_SHA` | `backend/app/services/sync_run_service.py` | Tool/platform supplied | Tool/platform supplied | No | Automatic where applicable |
| `GITHUB_TOKEN` | `.github/workflows/notify-on-failure.yml`<br>`scripts/notify-workflow-failure.mjs` | Tool/platform supplied | Tool/platform supplied | Yes | Automatic where applicable |
| `GITHUB_WORKFLOW` | `scripts/notify-workflow-failure.mjs` | Tool/platform supplied | Tool/platform supplied | No | Automatic where applicable |
| `GO_LIVE` | `scripts/push-vercel-env.mjs` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `HEALTH_CODE` | `scripts/website-health-agent.mjs` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `HEALTH_FULL` | `scripts/website-health-agent.mjs` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `HOME_SHELL_CARD_COUNT` | `scripts/prerender-home-shell.mjs` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `INGEST_CONCURRENCY` | `backend/app/config.py` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `INGEST_LOOKBACK_DAYS` | `backend/app/config.py` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `INGEST_MAX_ITEMS_PER_SOURCE` | `backend/app/config.py` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `INGEST_SKIP_PER_SOURCE_EXPORT` | `backend/app/config.py`<br>`scripts/run-daily-8am-sync.py` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `INGEST_SOCKET_TIMEOUT_SECONDS` | `scripts/run-daily-8am-sync.py`<br>`scripts/run-sync-production.py` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `JOBS_AUDIT_MAX_BLOCKED_HOST` | `scripts/audit-job-quality.mjs` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `JOBS_AUDIT_MAX_NO_LINK_PCT_LIVE` | `scripts/audit-job-quality.mjs` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `JOBS_AUDIT_MAX_SHORT_TITLE_PCT` | `scripts/audit-job-quality.mjs` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `JOBS_AUDIT_MIN_LIVE` | `scripts/audit-job-quality.mjs` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `JOBS_AUDIT_MIN_RECRUIT_PCT` | `scripts/audit-job-quality.mjs` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `JOBS_AUDIT_STRICT` | `scripts/audit-job-quality.mjs` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `JOB_DETAILS_STORAGE_BUCKET` | `backend/app/config.py`<br>`scripts/upload-job-details-storage.mjs` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `JOB_DETAIL_AUDIT_MAX_ISSUE_PCT` | `scripts/audit-job-detail-actions.ts` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `LIVE_JOBS_BOOTSTRAP_ROWS` | `scripts/build-live-jobs-bootstrap.mjs` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `LIVE_JOBS_JSON_PATH` | `backend/app/config.py` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `MAX_CATALOG_DROP_RATE` | `scripts/verify-live-jobs-snapshot.mjs` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `MIN_PUBLIC_CATALOG_ROWS` | `backend/app/services/job_persist_helpers.py`<br>`scripts/verify-live-jobs-snapshot.mjs` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `MODE` | `frontend/src/lib/sentry.ts` | Tool/platform supplied | Tool/platform supplied | No | Automatic where applicable |
| `MYGOVTJOBS_API_URL` | `scripts/run-ingest-all.mjs` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `NOTIFY_DEDUPE_HOURS` | `scripts/notify-workflow-failure.mjs` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `NOTIFY_EMAIL` | `.github/workflows/notify-on-failure.yml`<br>`scripts/notify-workflow-failure.mjs` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `NPM_STEP_TIMEOUT_SECONDS` | `scripts/run-daily-8am-sync.py`<br>`scripts/run-sync-production.py` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `OPENAI_API_KEY` | `backend/app/services/llm_qa_assist.py` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | Yes | Conditional on consuming feature |
| `OPENAI_BASE_URL` | `backend/app/services/llm_qa_assist.py` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `OPENAI_MODEL` | `backend/app/services/llm_qa_assist.py` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `PDF_OCR_ENABLED` | `backend/.env.example`<br>`backend/app/config.py` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `PLAY_STORE_SITE_URL` | `scripts/play-store-check.mjs` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `PORT` | `backend/Dockerfile` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `PORTAL_AUDIT_CONCURRENCY` | `scripts/audit-official-sites.mjs` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `PORTAL_AUDIT_MAX_FAIL_PCT` | `scripts/audit-official-sites.mjs` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `PORTAL_AUDIT_RETRIES` | `scripts/audit-official-sites.mjs` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `PORTAL_AUDIT_STRICT` | `scripts/audit-official-sites.mjs` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `PORTAL_AUDIT_TIMEOUT_MS` | `scripts/audit-official-sites.mjs` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `PRERENDER_JOB_LIMIT` | `.env.example`<br>`scripts/prerender-job-pages.mjs` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `PROD` | `frontend/src/components/layout/BuildStamp.tsx`<br>`frontend/src/main.tsx` | Tool/platform supplied | Tool/platform supplied | No | Automatic where applicable |
| `PUSH_WEBHOOK_URL` | `backend/app/config.py` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `PYTHONPATH` | `scripts/run-python.mjs` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `RATE_LIMIT_PER_MINUTE` | `backend/app/config.py` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `RAZORPAY_CHECKOUT_NAME` | `backend/app/config.py` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `RAZORPAY_KEY_ID` | `backend/app/config.py` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `RAZORPAY_KEY_SECRET` | `backend/app/config.py` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | Yes | Conditional on consuming feature |
| `RAZORPAY_PREMIUM_AMOUNT_PAISE` | `backend/app/config.py` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `RAZORPAY_PREMIUM_DESCRIPTION` | `backend/app/config.py` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `RAZORPAY_WEBHOOK_SECRET` | `backend/app/config.py` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | Yes | Conditional on consuming feature |
| `REDIS_URL` | `backend/.env.example`<br>`backend/app/config.py` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `RESEND_API_KEY` | `.github/workflows/canonical-daily-pipeline.yml`<br>`.github/workflows/notify-on-failure.yml`<br>`backend/.env.example`<br>`backend/app/config.py`<br>`scripts/notify-workflow-failure.mjs` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | Yes | Conditional on consuming feature |
| `SENTRY_DSN` | `backend/app/config.py` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `SENTRY_TRACES_SAMPLE_RATE` | `backend/app/config.py` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `SITEMAP_URL` | `scripts/go-live-check.mjs` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `SITE_URL` | `scripts/go-live-check.mjs`<br>`scripts/website-health-agent.mjs` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `SLACK_WEBHOOK_URL` | `.github/workflows/notify-on-failure.yml`<br>`scripts/notify-workflow-failure.mjs` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `SQL_ECHO` | `backend/app/config.py` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `SUPABASE_ANON_KEY` | `scripts/audit-job-quality.mjs`<br>`scripts/audit-supabase-tables.mjs`<br>`scripts/build-sitemap.mjs`<br>`scripts/test-supabase-connection.mjs` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No: public anon key | Supabase client fallback |
| `SUPABASE_DB_PASSWORD` | `.github/workflows/canonical-daily-pipeline.yml`<br>`.github/workflows/catalog-recovery-export.yml`<br>`.github/workflows/fetch-official-feeds.yml`<br>`.github/workflows/weekly-enrich.yml`<br>`.github/workflows/weekly-portal-audit.yml`<br>`scripts/build-database-url-for-actions.mjs` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | Yes | Conditional on consuming feature |
| `SUPABASE_DB_REGION` | `.github/workflows/canonical-daily-pipeline.yml`<br>`.github/workflows/catalog-recovery-export.yml`<br>`.github/workflows/fetch-official-feeds.yml`<br>`.github/workflows/weekly-enrich.yml`<br>`.github/workflows/weekly-portal-audit.yml`<br>`scripts/build-database-url-for-actions.mjs` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `SUPABASE_POOLER_HOST` | `.github/workflows/canonical-daily-pipeline.yml`<br>`.github/workflows/catalog-recovery-export.yml`<br>`.github/workflows/fetch-official-feeds.yml`<br>`.github/workflows/weekly-enrich.yml`<br>`.github/workflows/weekly-portal-audit.yml`<br>`scripts/build-database-url-for-actions.mjs` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `SUPABASE_POOLER_PORT` | `scripts/build-database-url-for-actions.mjs` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `SUPABASE_PROJECT_REF` | `.github/workflows/canonical-daily-pipeline.yml`<br>`.github/workflows/catalog-recovery-export.yml`<br>`.github/workflows/fetch-official-feeds.yml`<br>`.github/workflows/weekly-enrich.yml`<br>`.github/workflows/weekly-portal-audit.yml`<br>`scripts/build-database-url-for-actions.mjs` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `SUPABASE_SERVICE_ROLE_KEY` | `.github/workflows/canonical-daily-pipeline.yml`<br>`.github/workflows/catalog-recovery-export.yml`<br>`.github/workflows/weekly-enrich.yml`<br>`backend/.env.example`<br>`backend/app/config.py`<br>`scripts/build-sitemap.mjs`<br>`scripts/check-github-actions-secrets.mjs`<br>`scripts/push-github-actions-secrets.mjs`<br>`scripts/seed-education.ts`<br>`scripts/setup-supabase-env.mjs` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | Yes | Conditional on consuming feature |
| `SUPABASE_URL` | `backend/.env.example`<br>`backend/app/config.py`<br>`scripts/audit-job-quality.mjs`<br>`scripts/audit-supabase-tables.mjs`<br>`scripts/build-sitemap.mjs`<br>`scripts/seed-education.ts`<br>`scripts/setup-supabase-env.mjs`<br>`scripts/test-supabase-connection.mjs` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `SYNC_CONCURRENCY` | `scripts/run-sync-production.py` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `SYNC_FAIL_REASON` | `scripts/mark-daily-sync-failed.py` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `SYNC_FORCE` | `backend/app/services/sync_run_service.py`<br>`scripts/run-sync-production.py` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `SYNC_HARD_WALLCLOCK_SECONDS` | `scripts/run-daily-8am-sync.py`<br>`scripts/run-sync-production.py` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `SYNC_INGEST_BUDGET_SECONDS` | `scripts/run-daily-8am-sync.py`<br>`scripts/run-sync-production.py` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `SYNC_TRIGGER_TYPE` | `scripts/run-sync-production.py`<br>`scripts/run_pipeline.py` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `TELEGRAM_BOT_TOKEN` | `.github/workflows/canonical-daily-pipeline.yml`<br>`backend/.env.example`<br>`backend/app/config.py` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | Yes | Conditional on consuming feature |
| `TELEGRAM_CHAT_ID` | `backend/.env.example` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Template only; no runtime reference found |
| `TRUSTED_PROXY_IPS` | `backend/app/config.py` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `TURNSTILE_SECRET_KEY` | `backend/.env.example`<br>`backend/app/config.py` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | Yes | Conditional on consuming feature |
| `TWILIO_ACCOUNT_SID` | `backend/app/config.py` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `TWILIO_AUTH_TOKEN` | `backend/app/config.py` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | Yes | Conditional on consuming feature |
| `TWILIO_WHATSAPP_FROM` | `backend/app/config.py` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `VERCEL_API_URL` | `scripts/push-vercel-env.mjs` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `VERCEL_DAILY_SYNC_ONLY` | `scripts/push-vercel-env.mjs` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `VERCEL_ENV_TARGETS` | `scripts/push-vercel-env.mjs` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `VERCEL_GA_MEASUREMENT_ID` | `scripts/push-vercel-env.mjs` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `VERCEL_GIT_COMMIT_MESSAGE` | `scripts/vercel-ignore-build.mjs` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `VERCEL_GIT_COMMIT_SHA` | `backend/app/services/sync_run_service.py` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `VERCEL_GOOGLE_SITE_VERIFICATION` | `scripts/push-vercel-env.mjs` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `VERCEL_JOBS_SOURCE` | `scripts/push-vercel-env.mjs` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `VERCEL_SITE_URL` | `scripts/push-vercel-env-live.mjs`<br>`scripts/push-vercel-env.mjs` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | No | Conditional on consuming feature |
| `VERIFY_ALERT_SECRETS` | `scripts/check-github-actions-secrets.mjs` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | Yes | Conditional on consuming feature |
| `VERIFY_SERVICE_ROLE_KEY` | `scripts/check-github-actions-secrets.mjs` | Reviewed code/script default; task override only | Reviewed default; configure only for enabled feature | Yes | Conditional on consuming feature |
| `VITEST` | `frontend/src/components/home/HomeDiscoveryBlock.tsx`<br>`frontend/src/components/home/HomeMapBlock.tsx`<br>`frontend/src/lib/analytics.ts`<br>`frontend/src/main.tsx` | Tool/platform supplied | Tool/platform supplied | No | Automatic where applicable |
| `VITE_ADSENSE_CLIENT` | `frontend/.env.example`<br>`frontend/src/components/ads/AdSlot.tsx` | Frontend public build-time setting/default | Public build-time setting; rebuild after approved change | No | Conditional on consuming feature |
| `VITE_API_PROXY` | `frontend/vite.config.ts` | Frontend public build-time setting/default | Public build-time setting; rebuild after approved change | No | Conditional on consuming feature |
| `VITE_API_URL` | `frontend/.env.example`<br>`frontend/src/components/AdminRouteGuard.tsx`<br>`frontend/src/components/jobs/ReportJobButton.tsx`<br>`frontend/src/hooks/useServerJobSearch.ts`<br>`frontend/src/lib/adminApi.ts`<br>`frontend/src/lib/alertsApi.ts`<br>`frontend/src/lib/billingApi.ts`<br>`frontend/src/lib/contactApi.ts`<br>`frontend/src/lib/dailySync.ts`<br>`frontend/src/lib/indiaApi.ts`<br>`frontend/src/lib/jobsApi.ts`<br>`frontend/src/pages/AdminDashboardPage.tsx`<br>`scripts/website-health-agent.mjs` | Optional dev proxy or local API origin | Confirmed healthy FastAPI HTTPS origin | No | India and API-only features |
| `VITE_BUILD_STAMP` | `frontend/src/lib/buildStamp.ts`<br>`frontend/vite.config.ts` | Frontend public build-time setting/default | Public build-time setting; rebuild after approved change | No | Conditional on consuming feature |
| `VITE_DAILY_SYNC_ONLY` | `frontend/.env.example`<br>`frontend/src/hooks/useLiveJobs.ts`<br>`frontend/src/lib/liveJobsFetch.ts` | Frontend public build-time setting/default | Public build-time setting; rebuild after approved change | No | Conditional on consuming feature |
| `VITE_ENABLE_ADMIN_UI` | `frontend/.env.example`<br>`frontend/src/components/AdminRouteGuard.tsx` | Frontend public build-time setting/default | Public build-time setting; rebuild after approved change | No | Conditional on consuming feature |
| `VITE_ENABLE_BILLING` | `frontend/.env.example`<br>`frontend/src/lib/billingApi.ts` | Frontend public build-time setting/default | Public build-time setting; rebuild after approved change | No | Conditional on consuming feature |
| `VITE_GA_MEASUREMENT_ID` | `frontend/.env.example`<br>`frontend/src/lib/analytics.ts`<br>`scripts/play-store-check.mjs` | Frontend public build-time setting/default | Public build-time setting; rebuild after approved change | No | Optional analytics/verification |
| `VITE_GOOGLE_SITE_VERIFICATION` | `frontend/.env.example` | Frontend public build-time setting/default | Public build-time setting; rebuild after approved change | No | Template only; no runtime reference found |
| `VITE_JOBS_SOURCE` | `frontend/.env.example`<br>`frontend/src/lib/jobsApi.ts` | Frontend public build-time setting/default | Public build-time setting; rebuild after approved change | No | Conditional on consuming feature |
| `VITE_JOB_DETAILS_BUCKET` | `frontend/src/utils/jobDetailsStorage.ts` | Frontend public build-time setting/default | Public build-time setting; rebuild after approved change | No | Conditional on consuming feature |
| `VITE_SENTRY_DSN` | `frontend/src/lib/sentry.ts` | Frontend public build-time setting/default | Public build-time setting; rebuild after approved change | No | Conditional on consuming feature |
| `VITE_SITE_URL` | `.env.example`<br>`api/og.js`<br>`frontend/.env.example`<br>`frontend/src/data/siteLinks.ts`<br>`scripts/build-rss.mjs`<br>`scripts/build-sitemap.mjs`<br>`scripts/prerender-job-pages.mjs` | Frontend public build-time setting/default | Public build-time setting; rebuild after approved change | No | Conditional on consuming feature |
| `VITE_SOCIAL_INSTAGRAM_URL` | `frontend/.env.example`<br>`frontend/src/data/siteLinks.ts` | Frontend public build-time setting/default | Public build-time setting; rebuild after approved change | No | Conditional on consuming feature |
| `VITE_SOCIAL_TELEGRAM_URL` | `frontend/.env.example`<br>`frontend/src/components/home/SocialAlertBar.tsx`<br>`frontend/src/data/siteLinks.ts` | Frontend public build-time setting/default | Public build-time setting; rebuild after approved change | No | Conditional on consuming feature |
| `VITE_SOCIAL_X_URL` | `frontend/.env.example`<br>`frontend/src/data/siteLinks.ts` | Frontend public build-time setting/default | Public build-time setting; rebuild after approved change | No | Conditional on consuming feature |
| `VITE_SOCIAL_YOUTUBE_URL` | `frontend/.env.example`<br>`frontend/src/data/siteLinks.ts` | Frontend public build-time setting/default | Public build-time setting; rebuild after approved change | No | Conditional on consuming feature |
| `VITE_SUPABASE_ANON_KEY` | `.github/workflows/canonical-daily-pipeline.yml`<br>`.github/workflows/ci.yml`<br>`.github/workflows/weekly-enrich.yml`<br>`frontend/.env.example`<br>`frontend/src/lib/supabase.ts`<br>`scripts/audit-job-quality.mjs`<br>`scripts/audit-supabase-tables.mjs`<br>`scripts/build-sitemap.mjs`<br>`scripts/setup-supabase-env.mjs`<br>`scripts/test-supabase-connection.mjs` | Frontend public build-time setting/default | Public build-time setting; rebuild after approved change | No: public anon key | Supabase client fallback |
| `VITE_SUPABASE_URL` | `.github/workflows/canonical-daily-pipeline.yml`<br>`.github/workflows/catalog-recovery-export.yml`<br>`.github/workflows/ci.yml`<br>`.github/workflows/weekly-enrich.yml`<br>`frontend/.env.example`<br>`frontend/src/lib/supabase.ts`<br>`frontend/src/utils/jobDetailsStorage.ts`<br>`scripts/audit-job-quality.mjs`<br>`scripts/audit-supabase-tables.mjs`<br>`scripts/build-sitemap.mjs`<br>`scripts/seed-education.ts`<br>`scripts/setup-supabase-env.mjs`<br>`scripts/test-supabase-connection.mjs` | Frontend public build-time setting/default | Public build-time setting; rebuild after approved change | No | Conditional on consuming feature |
| `VITE_TELEGRAM_CHANNEL_URL` | `frontend/src/components/home/SocialAlertBar.tsx` | Frontend public build-time setting/default | Public build-time setting; rebuild after approved change | No | Conditional on consuming feature |
| `VITE_TURNSTILE_SITE_KEY` | `frontend/.env.example`<br>`frontend/src/lib/turnstile.ts` | Frontend public build-time setting/default | Public build-time setting; rebuild after approved change | No | Conditional on consuming feature |
| `VITE_VAPID_PUBLIC_KEY` | `frontend/.env.example`<br>`frontend/src/hooks/useWebPushToken.ts` | Frontend public build-time setting/default | Public build-time setting; rebuild after approved change | No | Conditional on consuming feature |
| `VITE_WHATSAPP_GROUP_URL` | `frontend/src/components/home/SocialAlertBar.tsx` | Frontend public build-time setting/default | Public build-time setting; rebuild after approved change | No | Conditional on consuming feature |

Test-only controls: `PRODUCTION_AUDIT_URL` selects the local built-output harness; `RELEASE_API_BRIDGE=1` enables the read-only browser bridge to the real local API; neither belongs in production configuration. The bridge is necessary because static output does not host FastAPI. Production route/API behavior remains unverified until approved hosting/configuration/deployment.

**DEPLOYMENT APPROVAL REQUIRED.** Stop before any production configuration, DNS, migration, data mutation or deployment.
