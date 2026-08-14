# Frontend components reference

All UI code lives under `frontend/src/` (TypeScript only — `.ts` / `.tsx`).
Conventions: [FRONTEND_STRUCTURE.md](../frontend/FRONTEND_STRUCTURE.md) · commands: [RUN.md](../RUN.md)

## Entry & shell

| File | Role |
|------|------|
| `main.tsx` | React root, i18n, analytics, PWA, root `ErrorBoundary` |
| `App.tsx` | Layout shell: nav, job loading, home composition |
| `components/AppRoutes.tsx` | All routes + lazy pages + Suspense |
| `components/ErrorBoundary.tsx` | App + route error UI (`level="app" \| "route"`) |
| `components/RouteErrorBoundary.tsx` | Thin alias → `ErrorBoundary` with `level="route"` |
| `components/PageFallback.tsx` | Loading spinner for Suspense / page waits |
| `components/RoutePageFallback.tsx` | Thin alias → `PageFallback` |
| `components/ScrollToTop.tsx` | Scroll reset on navigation |
| `components/AnalyticsPageTracker.tsx` / `AnalyticsClickTracker.tsx` | GA4 helpers |
| `components/TurnstileWidget.tsx` | Cloudflare Turnstile on forms |
| `context/BrowseContext.tsx` | BrowseProvider + `useBrowseContext` (filter/route state) |

## Layout

| Component | Role |
|-----------|------|
| `layout/Navbar.tsx` | Top nav, search, theme, language |
| `layout/MobileNavDrawer.tsx` / `MobileBottomNav.tsx` | Mobile navigation |
| `layout/EmploymentNewsBar.tsx` | Official feed strip (replaced old Ticker) |
| `layout/Footer.tsx` | Section / state / category links |
| `layout/IndianLanguageSelector.tsx` | 22+ Indian languages |
| `layout/BrandLogo.tsx` | Logo mark |
| `layout/HeadlineStatsBar.tsx` | Live job counts strip |
| `layout/InstallAppBanner.tsx` | PWA install prompt |
| `layout/AlertBellIcon.tsx` / `SearchMagnifyIcon.tsx` | Nav icons |

## Home page

Route component lives under `components/home/` (not `pages/`) — composition root for `/`.

| Component | Role |
|-----------|------|
| `home/HomePage.tsx` | Home composition: hero, map, tables, filters |
| `home/HomeHeroMarketing.tsx` | Hero + India glance |
| `home/HomeMapBlock.tsx` | India map + state glance |
| `home/HomeJobsListSection.tsx` | Main job cards section |
| `home/LatestNotificationsTable.tsx` | Latest jobs table (simple + detailed modes) |
| `home/LatestJobsSimpleTable.tsx` | Simple table mode used inside notifications |
| `home/OfficialHeadlinesSection.tsx` / `OfficialHeadlinesTable.tsx` | Official RSS/portal headlines |
| `home/HomeExamUpdatesRow.tsx` | Exam lifecycle / archives row |
| `home/AlertSection.tsx` | Email/Telegram alert signup |
| `home/StateGlancePanel.tsx` / `IndiaGlancePanel.tsx` | Fact panels for state / India |
| `home/StateJobsPanel.tsx` | Jobs for selected state |
| `home/latestNotifications/*` | Filters + row + empty states for notifications table |

## Browse & hub

| Component / page | Role |
|------------------|------|
| `browse/SectorBrowser.tsx` | Category / state grids on home |
| `browse/BrowseBreadcrumbs.tsx` | Browse trail |
| `hub/HubCard.tsx` | Shared hub card |
| `pages/*IndexPage.tsx` | SEO index lists (states, categories, quals, professions, orgs, results) |
| `pages/BrowseLandingPage.tsx` | State / category / qualification landings |
| `pages/ResultsHubPage.tsx` | Results hub |

## Jobs

| Component | Role |
|-----------|------|
| `jobs/JobCard.tsx` | Card in grid; PDF quick link when available |
| `jobs/JobCardGrid.tsx` | Virtualized grid for large lists |
| `jobs/JobDetail.tsx` | Full notification view |
| `jobs/jobDetailUi/` | Detail UI modules (section, facts, glance, sticky, actions) |
| `jobs/JobDetailFaq.tsx` | Detail FAQ accordion |
| `jobs/RelatedJobs.tsx` | Related listings |
| `jobs/StateGrid.tsx` / `CategoryGrid.tsx` | Filter chips with counts |
| `jobs/ReportJobButton.tsx` | User report flow |
| `pages/JobDetailPage.tsx` | Slug route + Suspense for detail |

## Account & admin

| Component / page | Role |
|------------------|------|
| `pages/AccountPage.tsx` | Magic-link account |
| `account/AccountAlertsPanel.tsx` | Manage alert subscriptions |
| `account/PremiumUpgradePanel.tsx` | Freemium / Razorpay UI |
| `pages/AdminPage.tsx` | Admin dashboard (needs API URL) |

## Maps

| Component | Role |
|-----------|------|
| `Maps/IndiaMap/IndiaMap.tsx` | Interactive India SVG map |
| `Maps/IndiaMap/mapStateJobCount.ts` | Per-state counts for map |

## Data & hooks

| Module | Role |
|--------|------|
| `hooks/useLiveJobs.ts` | Homepage catalog from static `live-jobs.json` (CDN); detail/search may use Supabase/API |
| `hooks/useNow.ts` | Deadline clock (never `Date.now()` in render) |
| `hooks/useOfficialFeed.ts` | Official headlines JSON |
| `hooks/useBrowseState.ts` + `hooks/browse/*` | Browse filters, route sync, navigation |
| `lib/jobsApi.ts` | `GET /api/jobs` client |
| `lib/supabase.ts` | Supabase anon client |
| `lib/analytics.ts` | GA4 helpers |
| `utils/liveJobAdapter.ts` | API row → UI job shape + PDF list |
| `utils/resolvePdfUrl.ts` | Official notification PDF URLs |
| `utils/officialDomains.ts` | Block aggregators; allow `.gov.in` / PSU |
| `utils/jobFilters.ts` / `jobNoiseFilter.ts` | Display + noise filters |
| `utils/jobDetail*.ts` | Detail hydration, links, structured sections, labels |

## Static data

| File | Role |
|------|------|
| `data/categories.ts` | Category ids, icons, colors |
| `data/states.ts` | State list for map and filters |
| `data/officialSites.ts` | Portal registry |
| `data/stateFacts.ts` / `indiaFacts.ts` | Glance panel copy |
| `data/professions.ts` / `qualifications.ts` / `orgIndex.ts` | Landing taxonomies |

## Styles

Large CSS lives in `frontend/src/styles/` (`home.css`, `layout.css`, `jobs.css`, …). Prefer feature-scoped edits when touching styles.
