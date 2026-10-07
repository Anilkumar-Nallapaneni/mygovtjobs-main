# Production audit — 7 October 2026

## Executive summary

The existing project was inspected and repaired in place. Local builds, unit tests, public route smoke tests, real-catalog browser journeys and read-only database checks passed. This is **not fully production ready**: the deployed `/india` URL returns 404, `api.livegovtjobs.com` does not resolve, local directory categories lack verified content, and the published job catalog is small. No deployment, production environment/DNS changes, migrations, imports, Google submissions or database writes were performed.

Evidence files: [repository inventory](audits/repository-inventory-2026-10-07.json), [read-only production database audit](audits/production-readonly-2026-10-07.json), [review queue](audits/p0-review-queue-latest.json), [source funnel](audits/source-funnel-latest.json). Inventory includes 1,146 tracked paths, 760 source files, the frontend import graph, 62 frontend route declarations and 54 backend route declarations. Inventory is an audit snapshot; the changed-file appendix identifies subsequent additions/deletions. Static reachability is evidence for investigation, not proof that arbitrary files can be deleted.

## Readiness calculation

Each category has five explicit checks below. A demonstrated check earns one point; a failed, absent or unverified check earns zero. Equal weights, no partial credit. **40 / 55 = 72.7% overall evidence-backed checklist readiness.** This is checklist coverage, not a predicted success rate or production certification. Deployment blockers override the numerical score. Route smoke coverage is separately **51 tested public paths**, not a claim that every parameter value or authenticated workflow works.

| Category | Passed checks | Failed or unverified checks | Score |
|---|---|---|---|
| Frontend wiring | Entry/import/route graph; critical job journey; search error fallback; 51 public-path smoke | All authenticated/admin/payment workflows end to end | 4/5 = 80% |
| Backend/API wiring | Correct existing entry and alias; healthy local real-DB read endpoints; auth/contract unit tests | Production API DNS; mutation integration against production | 3/5 = 60% |
| Database/data | LGD source hash; migration and persisted identity; RLS/grants; idempotent import dry run | Sufficient current verified jobs and locality content | 4/5 = 80% |
| India Explorer | 36 state/UT units; 784 verified district identities; hierarchy/search/error/empty states; five viewport journeys | Verified city/place/category coverage | 4/5 = 80% |
| UI/UX | Listings and purpose first; district search/breadcrumbs; five responsive widths; readable metadata/control targets | Measured real-user task completion | 4/5 = 80% |
| SEO | Robots/sitemap artifacts; 10 job prerenders; verified district sitemap; empty category canonical/noindex | Live India accessibility and useful server-rendered district content | 4/5 = 80% |
| Performance | Artifact budgets; route lazy loading; compact static catalog | Broad 3.2 MiB service-worker precache; field Core Web Vitals | 3/5 = 60% |
| Accessibility | Keyboard-capable map/link implementation; labels/single-main fixes; critical axe checks; focus/reduced motion styles | Full contrast, screen-reader and all-route accessibility review | 4/5 = 80% |
| Security | Secret boundary inspection; actual RLS/admin gates; strict verified TLS; npm dependency audit | Python dependency audit and external security assessment | 4/5 = 80% |
| Analytics | Live GA/GSC HTML markers; single explicit page-view tests; bounded events/query privacy/dev suppression | Dashboard ingestion attribution; consent/enhanced-measurement settings | 3/5 = 60% |
| Monetization | Independent-site disclosure; legal/contact routes; existing ad/paid configuration disclosure paths | Production payment/ad validation; demonstrated retention/conversion | 3/5 = 60% |

**Code ready:** tested local changes are reviewable; private/payment flows remain unverified. **Data ready:** LGD yes, broad fresh jobs and local directories no. **Production database ready:** LGD identity and migration 043 verified, not every feature populated. **Deployment ready:** blocked pending approved release/API hosting and certificate configuration. **Traffic/growth ready:** unproven without GA/Search Console dashboard evidence and sufficient useful fresh content.

## Wiring matrix

| User surface | Component / loader | API / persistence | Observed result |
|---|---|---|---|
| Home, jobs, filters, browse indexes | App, HomePage, BrowseProvider, useLiveJobs | Static live-jobs bootstrap/list/full catalog; job detail/search fallbacks configurable | 10 approved real catalog jobs; working search/detail/official apply journeys |
| Server search | useServerJobSearch | FastAPI search routes / jobs SQL | Errors now return to real static catalog with a visible notice rather than fabricated zero results |
| Job detail | JobDetailPage, detail adapters | Static detail, configured API/Supabase; notification/PDF enrichment | 10/10 audited detail actions pass; official source/PDF rules retained |
| India overview | IndiaExplorerPage, useIndiaExplorer | /api/india/overview and /states; india_states | 36 units; local real API succeeds; deployed India route 404 |
| State and district directory | StateExplorerPage, DistrictExplorerPage | /api/india/states, districts; india_districts | 784 total; Karnataka 31; stable persisted UUIDs and LGD codes |
| State/district categories | ExplorerRecords, category hooks | India category endpoints; education/place/jobs tables | Verified empty states; jobs have no verified district FK; no state records disguised as district records |
| Education/career | Lazy education pages, careerPaths | Curated static content and education API/admin paths | Public route renders; individual salary/institute assertions are not certified by this audit |
| Results/exams/admission/scholarships/yojana | Dedicated lazy hub pages | Existing content feeds / static links | Public route smoke passes; completeness and freshness are not established for every feed |
| Alerts/account/bookmarks | AlertsPage, AccountPage, BookmarksPage | Auth/Supabase/local storage and alerts API | Public shells render; signed-in persistence/delivery not exercised |
| Contact/reporting | ContactPage / job report action | Contact and job-report API routes with existing abuse controls | Code wired; no external messages sent or production records created |
| Admin/education operations/billing | AdminRouteGuard and backend gated routes | X-Admin-Key / existing auth, billing services | Guards retained; production mutation/payment flows not exercised |
| Analytics | AnalyticsPageTracker, analytics.ts | Existing GA config, delegated actions | Page-view duplication reduced; query text removed; dashboard receipt unknown |
| Deployment | Root vercel.json; Vite build; separate FastAPI app | Vercel static SPA + separately hosted API | api/og.js is an image function, not FastAPI hosting; explicit India rewrites added locally |

## Findings fixed

| Priority | Broken behavior | Implemented correction |
|---|---|---|
| P0 | Committed merge markers and duplicate keys in real catalog prevented build | Resolved existing branches without inventing jobs; regenerated derived catalog |
| P0 | Database could bypass certificate verification on CI/Render or insecure flags | Mandatory certificate and hostname checks; explicit trusted CA file option; regression tests |
| P0 | Allowlisted government HTTP fallback disabled certificate verification | Retains legacy protocol negotiation while requiring verified certificates |
| P0 | District category jobs/industries could return statewide information | Honest empty district response until verified district relationships exist |
| P0 | Failed server search resembled an empty result set | Visible error and fallback to known real catalog; stale query results cleared |
| P1 | Missing production India rewrites, misleading backend expectations | Root rewrites added; documented actual FastAPI entry and dev:backend alias |
| P1 | Broken graduation/latest-notification shortcut destinations | Corrected links and added canonical legacy redirect |
| P1 | Listings buried below marketing/map content | Purpose and real listings first; map/marketing secondary and compact |
| P1 | Unsourced geographic facts/conflicting district estimate | Replaced oversized facts with sourced directory navigation; removed private unused fake-count trust strip |
| P1 | Category failures/stale results and href="#" records | Shared loading/error/empty renderer, safe URLs, internal job detail links and stale-data resets |
| P1 | Empty India category pages could be indexed; competing head updates | Page-owned canonical/noindex; App skips generic India SEO updates |
| P1 | Homepage prerender titles were not crawlable job links | Real job slug anchors in four prerender shell cards |
| P2 | Ungrounded NEW/hot flags and vacancy-derived urgency | Clock-derived publication/deadline labels; future publication cannot be NEW |
| P2 | Oversized cards/maps, hover motion, weak hierarchy | 1,440px maximum layout; calmer cards, typography/spacing, compact maps, focus/reduced motion, readable metadata |
| P2 | Implicit plus explicit GA page views and query-text collection | Explicit page-view configuration, bounded route/action events, no raw query text, dev suppression |
| P2 | Windows Vite watched E2E backup files and hit EBUSY | Ignore transient test/build directories |

Unused deletion decisions were narrow: TrustStrip had no imports; indiaFacts was used only by the replaced panel. No uncertain route/component trees were removed. No publish gates or official PDF-host restrictions were weakened. Report-Only CSP remains unchanged.

## Actual production database, LGD and pipeline evidence

Original LGD spreadsheet SHA-256: `387ce8805f54b68baaeda1dbc40751927e8eb981f2b48548ffeaf833a6881d68`. Normalized CSV validation: 784 rows, 784 unique codes, 36 states/UTs, no duplicate codes, unknown state mappings or rejected rows. Source file was not modified.

Production read-only queries found **784 districts, 784 unique LGD codes, 784 verified rows and 784 matching source-provenance hashes**. Snapshot records 784 rows and the same hash; its existing import timestamp is `2026-10-07 13:13:17.531290+00:00`. Migration history records `migrations/043_india_lgd_district_identity.sql` as applied. This predates our checks; we did not apply/import it. Guarded importer with `--dry-run` found **784 unchanged, zero inserts, updates, conflicts or writes**, migration_043_required=false. Final checks used strict TLS with the provider CA. Read-only audit starts a READ ONLY transaction and rolls back.

Actual job totals: **4,044 stored = 3,499 draft + 533 expired + 12 live**; 1,579 review records, all pending. Stored-job deficiencies: 3,264 missing deadlines; 3,998 missing verified_at; 3,512 completeness below 70; 1,674 lacking both source and apply URL. The 1,178 missing-PDF number checks two primary candidate fields only and is not a full official-PDF resolver audit. Categories overlap; do not sum them. The raw live share is 12/4,044 = **0.30%**. Static catalog contains 10 approved jobs, 9 known vacancy counts totaling 213, 7 organizations. Raw live status and exported publishable catalog are different populations; this audit did not force an export to include the other two.

Live state codes cover MP, MH, CH, AS and TN plus four nationwide listings (empty state_codes). Nine organizations appear in raw live groups, including four MPPSC listings. This is not useful all-India coverage yet. Review errors prominently include missing deadline 1,414, verification 1,141, low completeness 1,088, non-recruitment 692 and missing PDF 572. Source audit shows ESIC 84 stored/1 published, SSC 37/1, UPPSC 108/0, IBPS 55/0 and UPSC 74/0. Prioritize official deadline/PDF evidence and recruitment classification per source; do not lower thresholds to inflate counts.

India overview has **zero cities, places, schools, colleges, universities, hospitals or companies**. Geography identity is ready; local informational content is not. District jobs need verified locality relationships before publication. State category counts are not district counts.

RLS is enabled on inspected jobs, sources, India state/district/city/place, LGD snapshots and review tables. Public job policy requires published_to_site, recruitment, completeness >=70, verified/high-confidence or manually approved status, live status and a valid deadline. Snapshot tables have no anon/authenticated grants. Review authenticated SELECT is further restricted by an admin app_metadata policy; grants alone are not proof of public exposure.

## Competitor feature matrix and growth

Public sources were inspected where accessible. No competitor data, branding or unsupported traffic figures were copied.

| Portal | Observable useful pattern | Application here / limitation |
|---|---|---|
| [FreeJobAlert](https://www.freejobalert.com/) | Jobs, admit cards/results, state/qualification navigation, dated updates and deadline discovery | Clear browse entry points and closing-date labels; prioritize verified freshness |
| [SarkariResult](https://www.sarkariresult.com/) | Direct fetch blocked (403); current interface not verified | Do not infer current performance, layout or popularity from unavailable access |
| [NCS](https://www.ncs.gov.in/) | Official employment portal with job-seeker/employer services and search | Clear service scope and independent-portal disclosure; never imply NCS affiliation |
| [SSC](https://ssc.gov.in/) | Official examination-based navigation in indexed primary content; JS shell limited direct inspection | Organization/examination grouping with official outbound source |
| [UPSC](https://www.upsc.gov.in/examinations/active-exams) | Official exam notifications, recruitment, application and result stages | Keep notification/apply/PDF/result stages distinct; direct homepage fetch limited |
| [IBPS](https://www.ibps.in/index.php/crp-updates/) | CRP categorization and dated updates in primary indexed pages | Recruitment-cycle structure and timestamps; homepage fetch limited |
| [Employment News](https://employmentnews.gov.in/newemp/SearchPage.aspx) | Official employment publication/search | Source provenance, searchable recruitment rather than decorative promises |

Traffic decline cannot be attributed without GA/Search Console data. Production HTML contains GA measurement and Google verification markers, but these do not prove collection, ownership, consent or indexing. Useful likely improvements are crawlable job links, reliable India/API routes, fresh official jobs, clear eligibility/deadlines and saved-search/bookmark return journeys. Validate with organic landing impressions, indexing reasons, job_detail_view -> official apply conversion, repeat visitors and empty-search rate. No invented traffic/revenue goals or conversions.

## Mobile, accessibility, SEO and performance

Browser audit covered 360x800, 390x844, 768x1024, 1024x768 and 1440x900. Each covers real home, search, India overview, Karnataka, a persisted district UUID and a real job detail. Assertions check no runtime page errors and <=1px horizontal overflow. Real API asserts Karnataka total 31. Critical axe checks cover home/state in this audit and home/FAQ/job detail in existing tests. This does not establish zero serious/moderate violations, full keyboard task completion or screen-reader conformance. Screenshots are retained under `docs/audits/screenshots-2026-10-07/`.

Live probes: home 200; robots.txt 200; sitemap-index.xml 200; /india 404; API health and India routes fail hostname resolution. Local strict-CA API probes: /health 200 status ok; /api/india/states 200 with 36; /api/india/districts 200 total 784 (120-item default page); Karnataka districts 200 total 31; overview and state detail 200.

Build emits 10 real job detail prerenders (9 with addressLocality), nine child sitemaps, 784 verified persisted district sitemap URLs and four linked homepage shell job cards. No invented location pages were created. District pages remain client-rendered and mostly directory identity; sitemap inclusion alone is not evidence of indexable useful content. Empty category variants use canonical/noindex. Indexing/structured-data acceptance and GSC submissions remain unverified. Existing result/education aliases and curated career assertions need further editorial/canonical review.

Initial build failed because the catalog contained merge markers, so there is no comparable successful untouched baseline. First recovered build: main JS 187.81 kB / 60.23 kB gzip; Home 33.85 / 10.93; job detail 65.34 / 20.51. Final build: main 188.79 / 60.61; Home **30.44 / 9.69**; job detail unchanged. Final main CSS 79.33 /14.67, polish CSS85.17/13.74, India CSS18.34/3.92 kB. Budget checks pass, but duplicate style layers remain. Sentry chunk364.36/123.45 and Supabase208.06/54.61 remain lazy costs. Service worker precaches129 entries/3,243.82 KiB: prioritize reducing unnecessary locale/admin/monitoring precache. No measured Lighthouse or field Core Web Vitals score is claimed.

## Security and operating constraints

Service-role key boundary retained in backend; no secrets printed or committed. Frontend uses anon access; env alignment check passed. Admin gates remain. Database and government HTTP clients now fail closed on certificate errors. Local verified DB connectivity required the publicly distributed Supabase provider CA file held in TEMP, referenced only by session `DATABASE_SSL_CA_FILE`; no production environment changed. Existing insecure flags are ignored. Deployment/CI environments previously depending on those bypasses need a trusted CA configuration before rollout. See [Supabase connection guidance](https://supabase.com/docs/guides/database/connecting-to-postgres) and [SSL enforcement](https://supabase.com/docs/guides/platform/ssl-enforcement). A broken government certificate may reduce ingest success; it must not produce a falsely verified notification.

Both production-only and full npm dependency audits reported zero vulnerabilities. Python dependencies, payment provider verification, authenticated integrations, live CAPTCHA/rate-limit behavior and an external penetration test remain outside demonstrated coverage. Root CSP stays Report-Only as required. No external messages were sent.

## Tests and commands

| Executed command / check | Exact result |
|---|---|
| Initial npm run build | FAIL: committed catalog merge markers; corrected |
| Initial npm run test | FAIL: 4 frontend failures; corrected before final full run |
| npm run check:frontend | PASS: merge markers, TS-only structure, 92 valid JSON/XML assets |
| npm run type-check | PASS |
| npm run lint | PASS, max-warnings 0 |
| npm run test (final) | PASS: 462 frontend tests in 92 files; 318 backend passed, 1 skipped; 7 script tests |
| npm run build (final) | PASS; 708 modules; 10 job prerenders |
| npm run test:e2e | PASS:16 existing tests; 5 opt-in real-API viewport tests skipped in fixture-only run |
| Real API browser audit with PRODUCTION_AUDIT_URL=http://localhost:3689 | PASS: combined run 6/6 (five viewport journeys plus 51-path smoke); screenshot evidence waits for deferred discovery content |
| Evidence rerun with http://127.0.0.1:3689 | FAIL: Vite listens on ::1, IPv4 connection refused; corrected to localhost, not an application defect |
| npm run env:check | PASS project alignment |
| npm run india:validate:lgd | PASS:784 rows,36 units,no rejected/duplicate/unknown mappings |
| npm run india:import:lgd -- --district-file data/india/normalized/lgd-districts.csv --dry-run | PASS:784 unchanged,0 writes; strict CA rerun passed |
| npm run audit:india-explorer | PASS:16 structural checks |
| npm run audit:india:data | PASS:7 source-readiness checks; explicitly not a production DB assertion |
| node scripts/run-python.mjs scripts/audit-production-readonly.py with trusted CA | PASS:actual production SELECT evidence, zero writes |
| npm run audit:review-queue; npm run audit:source-funnel | PASS:read-only audits; refreshed report artifacts |
| npm run jobs:audit:detail-actions | PASS:10/10, no missing actions/generic apply/duplicate PDF |
| node scripts/check-performance-budgets.mjs | PASS:JS,CSS,catalog artifact budgets |
| npm audit --omit=dev; npm audit | PASS:zero reported vulnerabilities |
| git diff --check | PASS |

Frontend test teardown logs contain HappyDOM AbortError warnings; backend logs contain one Starlette/httpx deprecation warning and one skipped test. These are not hidden or represented as clean logs. Browser bootstrap found no available in-app browser; repo Playwright was used instead. Existing E2E fixture build remains isolated from production catalog.

Added/extended tests cover strict TLS including ignored insecure environment flags and CA loading, district-category scope, explorer loading/error/canonical/noindex/search behavior, search fallback, GA single page view, date-derived badges, public route shells and five real-data responsive journeys. Synthetic rows exist only inside tests, not exported production datasets.

## Remaining work and next ten actions

1. P0: approve and configure real API hosting/DNS, trusted database CA and frontend API origin; validate live health/read endpoints.
2. P0: approve deploying reviewed root routing/code changes; probe India/state/district/job deep links after release.
3. P0: reconcile the two raw-live records absent from the approved snapshot against quality gates; do not bypass gates.
4. P1: enrich missing official deadlines/PDFs for high-yield recruitment sources, starting ESIC/SSC/UPPSC/IBPS/UPSC; review before authorized publication.
5. P1: verify source coverage and freshness by state/organization; expand real official sources where missing.
6. P1: add verified city/place/category data and locality relationships through reviewed provenance-preserving migrations/imports; keep empty UI until then.
7. P1: review career salary/institute claims and duplicate alias canonicals; add useful server-rendered district content before expanding indexation.
8. P2: reduce service-worker precache and overlapping CSS; measure mobile Lighthouse and field Core Web Vitals.
9. P2: inspect actual GA/GSC receipt, consent and enhanced-measurement settings; measure indexing and official-apply/return-user journeys.
10. P2/P3: exercise authenticated alerts/bookmarks/payment delivery and comprehensive accessibility; then evaluate monetization with real usage rather than fake counts.

Approval is required by the user's explicit production-mutation restriction for deployment, DNS/domain/environment changes, DB migrations/imports/writes/deletions and Google submissions. No approval is requested for already-completed local code and read-only verification. No commit or push was performed.

### Correct backend start command

From the repository root in PowerShell, using the existing `backend/.venv`:

```powershell
$env:APP_ENV = 'development'
$env:ALLOW_INSECURE_ADMIN = '1'
# When your Supabase connection requires its trusted provider CA:
$env:DATABASE_SSL_CA_FILE = 'C:/certificates/prod-ca-2021.crt'
npm run dev:backend
```

Use an actual downloaded trusted certificate path. This launches `app.main:app` on port 8000; `npm run api:dev` is the original equivalent. Development flags are local only. Database-backed routes need valid backend configuration; no backend hosting is implied by Vercel frontend deployment.

## Complete route inventory

The generated tables below list all declarations. Backend paths are router-local declarations; actual prefixes/registration come from `backend/app/main.py`, not from a presumed Vercel /api host. A declaration is not automatically an authenticated end-to-end PASS.


| Frontend path | Component / redirect |
|---|---|
| `/` | Home page element |
| `/india` | LazyRoute, IndiaExplorerPage |
| `/india-map` | Navigate |
| `/latest-notifications` | Navigate |
| `/india/:stateId` | LazyRoute, StateExplorerPage |
| `/india/:stateId/district/:districtId` | LazyRoute, DistrictExplorerPage |
| `/india/:stateId/district/:districtId/:category` | LazyRoute, DistrictExplorerPage |
| `/india/:stateId/:category` | LazyRoute, StateExplorerPage |
| `/education` | LazyRoute, EducationHubPage |
| `/education/mock-tests` | LazyRoute, EducationHubPage |
| `/education/careers/:slug` | LazyRoute, EducationCareerPage |
| `/education/dashboard` | LazyRoute, EducationDashboardPage |
| `/admin/education` | LazyRoute, AdminRouteGuard, EducationAdminPage |
| `/career` | LazyRoute, EducationHubPage |
| `/jobs` | Home page element |
| `/jobs/all-india` | Home page element |
| `/qualification/:slug` | LazyRoute, BrowseJobsLandingPage |
| `/profession/:slug` | LazyRoute, BrowseJobsLandingPage |
| `/org/:slug` | LazyRoute, BrowseJobsLandingPage |
| `/explore` | LazyRoute, ExploreHubPage |
| `/qualifications` | LazyRoute, QualificationsIndexPage |
| `/professions` | LazyRoute, ProfessionsIndexPage |
| `/organizations` | LazyRoute, OrganizationsIndexPage |
| `/states` | LazyRoute, StatesIndexPage |
| `/boards` | LazyRoute, CategoriesIndexPage |
| `/categories` | LazyRoute, CategoriesIndexPage |
| `/jobs/latest-notifications` | LazyRoute, LatestNotificationsPage |
| `/state/:stateId` | LazyRoute, BrowseJobsLandingPage |
| `/board/:boardId` | LazyRoute, BrowseJobsLandingPage |
| `/category/:categoryId` | LazyRoute, BrowseJobsLandingPage |
| `/results/topics` | LazyRoute, ResultsTopicsIndexPage |
| `/results/admit-card` | LazyRoute, ResultsHubPage |
| `/results/answer-key` | LazyRoute, ResultsHubPage |
| `/results/:topicSlug` | Home page element |
| `/results` | LazyRoute, ResultsHubPage |
| `/alerts` | LazyRoute, AlertsPage |
| `/exams` | LazyRoute, ExamsIndexPage |
| `/exam/:examSlug` | LazyRoute, ExamLandingPage |
| `/exam-calendar` | LazyRoute, ExamCalendarPage |
| `/faq` | LazyRoute, FaqPage |
| `/guide/how-to-apply` | LazyRoute, HowToApplyPage |
| `/guide/exam-preparation` | LazyRoute, ExamPrepPage |
| `/privacy` | LazyRoute, PrivacyPage |
| `/terms` | LazyRoute, TermsPage |
| `/about` | LazyRoute, AboutPage |
| `/contact` | LazyRoute, ContactPage |
| `/sitemap` | LazyRoute, SitemapPage |
| `/disclaimer` | LazyRoute, DisclaimerPage |
| `/account` | LazyRoute, AccountPage |
| `/account/bookmarks` | LazyRoute, BookmarksPage |
| `/admission` | LazyRoute, AdmissionHubPage |
| `/scholarships` | LazyRoute, ScholarshipsHubPage |
| `/yojana` | LazyRoute, YojanaHubPage |
| `/latest-results` | LazyRoute, ResultsHubPage |
| `/admit-cards` | LazyRoute, ResultsHubPage |
| `/answer-keys` | LazyRoute, ResultsHubPage |
| `/upcoming-exams` | Navigate |
| `/designations` | LazyRoute, DesignationsIndexPage |
| `/designation/:slug` | LazyRoute, DesignationLandingPage |
| `/admin` | LazyRoute, AdminRouteGuard, AdminDashboardPage |
| `/jobs/:slug` | LazyRoute, RouteErrorBoundary, JobDetailPage |
| `*` | LazyRoute, NotFoundPage |

| Backend source | Method | Router-local path |
|---|---|---|
| `backend/app/routes/admin.py` | GET | `/review-queues` |
| `backend/app/routes/admin.py` | PATCH | `/review-queue/{review_id}` |
| `backend/app/routes/admin.py` | GET | `/jobs` |
| `backend/app/routes/admin.py` | PATCH | `/jobs/{job_id}` |
| `backend/app/routes/admin.py` | GET | `/source-health` |
| `backend/app/routes/admin.py` | GET | `/dashboard` |
| `backend/app/routes/admin.py` | GET | `/sources/health` |
| `backend/app/routes/admin.py` | POST | `/sources/sync` |
| `backend/app/routes/admin.py` | GET | `/supabase/audit` |
| `backend/app/routes/admin.py` | GET | `/sync-status` |
| `backend/app/routes/admin.py` | POST | `/alerts/deliver` |
| `backend/app/routes/admin.py` | GET | `/sync-runs` |
| `backend/app/routes/admin.py` | POST | `/ingest/run-all` |
| `backend/app/routes/admin_education.py` | GET | `/education/overview` |
| `backend/app/routes/admin_education.py` | GET | `/education/{kind}` |
| `backend/app/routes/admin_education.py` | POST | `/education/{kind}` |
| `backend/app/routes/admin_education.py` | PATCH | `/education/{kind}/{item_id}` |
| `backend/app/routes/admin_education.py` | DELETE | `/education/{kind}/{item_id}` |
| `backend/app/routes/admin_education.py` | GET | `/education/tests/{test_id}/questions` |
| `backend/app/routes/admin_education.py` | POST | `/education/tests/{test_id}/questions` |
| `backend/app/routes/admin_education.py` | PATCH | `/education/questions/{question_id}` |
| `backend/app/routes/admin_education.py` | DELETE | `/education/questions/{question_id}` |
| `backend/app/routes/admin_education.py` | POST | `/education/tests/{test_id}/recount` |
| `backend/app/routes/admin_moderation.py` | GET | `/moderation` |
| `backend/app/routes/admin_moderation.py` | PATCH | `/moderation/reports/{report_id}` |
| `backend/app/routes/admin_operations.py` | GET | `/source-funnel` |
| `backend/app/routes/admin_operations.py` | GET | `/stats` |
| `backend/app/routes/admin_operations.py` | GET | `/operations` |
| `backend/app/routes/alerts.py` | GET | `/channels` |
| `backend/app/routes/alerts.py` | POST | `/subscribe` |
| `backend/app/routes/alerts.py` | POST | `/unsubscribe` |
| `backend/app/routes/billing.py` | GET | `/config` |
| `backend/app/routes/billing.py` | POST | `/create-order` |
| `backend/app/routes/billing.py` | POST | `/verify` |
| `backend/app/routes/billing.py` | POST | `/webhook` |
| `backend/app/routes/health.py` | GET | `/health` |
| `backend/app/routes/health.py` | GET | `/health/detailed` |
| `backend/app/routes/india.py` | GET | `/overview` |
| `backend/app/routes/india.py` | GET | `/states` |
| `backend/app/routes/india.py` | GET | `/states/{state_id}` |
| `backend/app/routes/india.py` | GET | `/districts` |
| `backend/app/routes/india.py` | GET | `/states/{state_id}/districts` |
| `backend/app/routes/india.py` | GET | `/states/{state_id}/cities` |
| `backend/app/routes/india.py` | GET | `/states/{state_id}/districts/{district_id}` |
| `backend/app/routes/india.py` | GET | `/states/{state_id}/districts/{district_id}/cities` |
| `backend/app/routes/india.py` | GET | `/states/{state_id}/categories/{category}` |
| `backend/app/routes/india.py` | GET | `/search` |
| `backend/app/routes/ingest.py` | POST | `/run/{source_code}` |
| `backend/app/routes/ingest.py` | POST | `/run-all` |
| `backend/app/routes/job_reports.py` | GET | `/{report_id}` |
| `backend/app/routes/jobs.py` | GET | `/{slug}` |
| `backend/app/routes/meta.py` | GET | `/states` |
| `backend/app/routes/meta.py` | GET | `/categories` |
| `backend/app/routes/meta.py` | GET | `/sync-status` |

## Exact files changed

- `RUN.md`
- `backend/.env.example`
- `backend/app/database/connect_args.py`
- `backend/app/routes/india.py`
- `backend/app/scrapers/http_client.py`
- `backend/app/utils/url_safety.py`
- `backend/tests/test_connect_args.py`
- `backend/tests/test_india_explorer_api_contract.py`
- `docs/FULL_PRODUCTION_AUDIT_2026-10-07.md`
- `docs/audits/p0-review-queue-latest.json`
- `docs/audits/production-readonly-2026-10-07.json`
- `docs/audits/repository-inventory-2026-10-07.json`
- `docs/audits/screenshots-2026-10-07/production-audit-productio-08724-a-state-district-and-detail/home-1024.png`
- `docs/audits/screenshots-2026-10-07/production-audit-productio-08724-a-state-district-and-detail/state-1024.png`
- `docs/audits/screenshots-2026-10-07/production-audit-productio-21c23-a-state-district-and-detail/home-768.png`
- `docs/audits/screenshots-2026-10-07/production-audit-productio-21c23-a-state-district-and-detail/state-768.png`
- `docs/audits/screenshots-2026-10-07/production-audit-productio-809ed-a-state-district-and-detail/home-1440.png`
- `docs/audits/screenshots-2026-10-07/production-audit-productio-809ed-a-state-district-and-detail/state-1440.png`
- `docs/audits/screenshots-2026-10-07/production-audit-productio-81ea6-a-state-district-and-detail/home-360.png`
- `docs/audits/screenshots-2026-10-07/production-audit-productio-81ea6-a-state-district-and-detail/state-360.png`
- `docs/audits/screenshots-2026-10-07/production-audit-productio-e311e-a-state-district-and-detail/home-390.png`
- `docs/audits/screenshots-2026-10-07/production-audit-productio-e311e-a-state-district-and-detail/state-390.png`
- `docs/audits/source-funnel-latest.json`
- `frontend/e2e/production-audit.spec.ts`
- `frontend/playwright.audit.config.ts`
- `frontend/public/data/live-jobs-bootstrap.json`
- `frontend/public/data/live-jobs-list.json`
- `frontend/public/data/live-jobs.json`
- `frontend/public/sitemaps/districts.xml`
- `frontend/src/App.tsx`
- `frontend/src/components/AnalyticsPageTracker.tsx`
- `frontend/src/components/AppRoutes.tsx`
- `frontend/src/components/home/HomeCareerMarketplace.tsx`
- `frontend/src/components/home/HomeHeroMarketing.tsx`
- `frontend/src/components/home/HomePage.tsx`
- `frontend/src/components/home/IndiaGlancePanel.tsx`
- `frontend/src/components/home/TrustStrip.tsx`
- `frontend/src/components/india/ExplorerRecords.tsx`
- `frontend/src/components/jobs/JobCard.tsx`
- `frontend/src/data/indiaFacts.ts`
- `frontend/src/hooks/useIndiaExplorer.ts`
- `frontend/src/hooks/useServerJobSearch.ts`
- `frontend/src/lib/analytics.ts`
- `frontend/src/lib/indiaApi.ts`
- `frontend/src/pages/DistrictExplorerPage.tsx`
- `frontend/src/pages/IndiaExplorerPage.tsx`
- `frontend/src/pages/StateExplorerPage.tsx`
- `frontend/src/styles/extensions.css`
- `frontend/src/styles/india-explorer.css`
- `frontend/src/styles/polish.css`
- `frontend/src/styles/tokens.css`
- `frontend/src/tests/hooks/useServerJobSearch.test.tsx`
- `frontend/src/tests/lib/analytics.test.ts`
- `frontend/src/tests/pages/IndiaExplorer.lgd.test.tsx`
- `frontend/src/tests/utils/liveJobStatus.test.ts`
- `frontend/src/utils/liveJobAdapter.ts`
- `frontend/vite.config.ts`
- `package.json`
- `scripts/audit-india-data-readiness.mjs`
- `scripts/audit-production-readonly.py`
- `scripts/prerender-home-shell.mjs`
- `vercel.json`
