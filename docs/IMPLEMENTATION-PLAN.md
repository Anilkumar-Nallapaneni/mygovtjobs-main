# Implementation plan — 90+ score roadmap

**Current score:** ~90/100 · **Target:** 92+ (data polish)

---

## Phase 1 — CI & E2E ✅

| Status | Task | Command / file |
|--------|------|----------------|
| ☑ | Playwright in GitHub Actions | `.github/workflows/ci.yml` → `e2e` job |
| ☑ | `playwright:install` script | `frontend/package.json` |
| ☑ | Root `test:e2e` installs browsers | `package.json` |
| ☑ | axe a11y E2E | `frontend/e2e/a11y.spec.ts` |

```bash
npm run test:e2e
```

---

## Phase 2 — Data quality ✅ (scripts) / ops

| Status | Task | Command |
|--------|------|---------|
| ☑ | Noise title scrubber | `npm run data:scrub-noise` |
| ☑ | Apply + re-export | `npm run data:scrub-noise:apply` |
| ☑ | List index migration | `database/migrations/005_jobs_list_index.sql` |
| ☑ | Run migration in Supabase SQL Editor | manual |
| ☐ | Schedule `daily:sync:full` | Task Scheduler / GH Actions |
| ☑ | SEBI/ISRO/news noise patterns | `noise_filter.py`, `job_sql_filters.py`, `jobNoiseFilter.ts` |
| ☑ | Prerender 1000 job pages | `scripts/prerender-job-pages.mjs` |

```bash
npm run data:scrub-noise          # dry-run
npm run data:scrub-noise:apply    # expire noise rows + export JSON
npm run enrich:jobs:all
npm run jobs:audit
```

---

## Phase 3 — Tests ✅

| Status | Task | File |
|--------|------|------|
| ☑ | HomePage tests | `components/home/HomePage.test.tsx` |
| ☑ | JobDetail tests | `components/jobs/JobDetail.test.tsx` |
| ☑ | Navbar tests | `components/layout/Navbar.test.tsx` |
| ☑ | ErrorBoundary tests | `components/ErrorBoundary.test.tsx` |
| ☑ | Backend list_jobs route test | `backend/tests/test_routes.py` |
| ☑ | Coverage thresholds 50% | `frontend/vite.config.ts` |

---

## Phase 4 — A11y & UX ✅

| Status | Task | File |
|--------|------|------|
| ☑ | JobDetail focus trap | `JobDetail.tsx` |
| ☑ | Navbar `aria-current` | `Navbar.tsx` |
| ☑ | Ticker locale numbers | `Ticker.tsx` |
| ☑ | Map roving tabindex | `IndiaMap.tsx` (prior) |
| ☑ | Reduced motion ticker | `Ticker.tsx` + `global.css` |

---

## Phase 5 — Backend scale ✅

| Status | Task | File |
|--------|------|------|
| ☑ | Single-fetch list_jobs (no while-loop) | `job_service.py` |
| ☑ | SQL recruitment filters | `job_sql_filters.py` |
| ☑ | Redis shared rate limiter | `rate_limit.py` + `REDIS_URL` env |

---

## Verification

```bash
npm run test
npm run type-check
npm run lint
npm run build
npm run test:e2e
npm run jobs:audit
```

**Projected score after ops steps:** 90–92/100
