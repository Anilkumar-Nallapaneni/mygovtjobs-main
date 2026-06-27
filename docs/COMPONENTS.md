# Frontend components reference

All UI code lives under `frontend/src/` (TypeScript only — `.ts` / `.tsx`).

## Entry & shell

| File | Role |
|------|------|
| `main.tsx` | React root, i18n, theme, error boundary |
| `App.tsx` | Layout shell: ticker, navbar, job loading, routes home ↔ detail |
| `components/ErrorBoundary.tsx` | Catches render errors |

## Layout

| Component | Role |
|-----------|------|
| `layout/Navbar.tsx` | Top nav, search, color mode, language |
| `layout/Ticker.tsx` | Scrolling headlines from official feed |
| `layout/Footer.tsx` | Links to sections / states / categories |
| `layout/IndianLanguageSelector.tsx` | All 23 Indian languages (single switcher) |
| `layout/BrandLogo.tsx` | Logo mark |

## Home page

| Component | Role |
|-----------|------|
| `home/HomePage.tsx` | Main jobs grid, map, filters, categories, state panel |
| `home/StateJobsPanel.tsx` | Jobs for selected state |
| `home/NotificationsSidebar.tsx` | Side notifications list |
| `home/LatestNotificationsTable.tsx` | Table view of latest jobs |
| `home/OfficialHeadlinesSection.tsx` | Official RSS/portal headlines |
| `home/AlertSection.tsx` | Email/WhatsApp alert signup |

## Jobs

| Component | Role |
|-----------|------|
| `jobs/JobCard.tsx` | Card in grid; **PDF** quick link when available |
| `jobs/JobCardGrid.tsx` | Virtualized grid for large lists |
| `jobs/JobDetail.tsx` | Full notification view, **multiple PDF buttons** |
| `jobs/StateGrid.tsx` | State filter chips with counts |
| `jobs/CategoryGrid.tsx` | Category filter chips |

## Maps

| Component | Role |
|-----------|------|
| `Maps/IndiaMap/IndiaMap.tsx` | Interactive India SVG map |

## Data & hooks

| Module | Role |
|--------|------|
| `hooks/useLiveJobs.ts` | Loads jobs: API / Supabase / JSON (up to 8000 rows) |
| `hooks/useNow.ts` | Deadline clock for cards and detail |
| `hooks/useOfficialFeed.ts` | Official headlines JSON |
| `lib/jobsApi.ts` | `GET /api/jobs` client |
| `lib/supabase.ts` | Supabase client |
| `lib/officialFeed.ts` | Feed file loader |
| `utils/liveJobAdapter.ts` | API row → UI job shape + PDF list |
| `utils/resolvePdfUrl.ts` | Collect official notification PDF URLs |
| `utils/officialDomains.ts` | Block aggregators; allow `.gov.in` / PSU hosts |
| `utils/jobFilters.ts` | Display filters |
| `utils/jobAggregates.ts` | Per-state / per-category counts |

## Static data

| File | Role |
|------|------|
| `data/categories.ts` | Category ids, icons, colors (counts are live) |
| `data/states.ts` | State list for map and filters |
| `data/officialSites.ts` | Portal registry for `fetch:official` |
