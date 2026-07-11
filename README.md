# My Govt Jobs — govtjobs.me

Government job portal for India. Monorepo: **React frontend**, **FastAPI backend**, **Supabase Postgres**, **Vercel** hosting, **GitHub Actions** daily ingest.

**Production:** [https://www.livegovtjobs.com](https://www.livegovtjobs.com)

---

## Table of contents

1. [Files you need](#files-you-need)
2. [Architecture](#architecture)
3. [First-time installation](#first-time-installation)
4. [Run locally (dev)](#run-locally-dev)
5. [Daily operations — what runs automatically](#daily-operations--what-runs-automatically)
6. [Daily checklist — what you do](#daily-checklist--what-you-do)
7. [Frontend](#frontend)
8. [Backend](#backend)
9. [Supabase](#supabase)
10. [Vercel (deploy)](#vercel-deploy)
11. [GitHub Actions](#github-actions)
12. [Google Analytics & Search Console](#google-analytics--search-console)
13. [All npm commands](#all-npm-commands)
14. [Troubleshooting](#troubleshooting)
15. [More docs](#more-docs)

---

## Files you need

Never commit real secrets. Keep these files on your machine only:

| File | Required | What goes in it |
|------|----------|----------------|
| `frontend/.env.local` | **Yes** (frontend + Vercel push) | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, optional GA/SEO |
| `backend/.env` | **Yes** (ingest + API) | `DATABASE_URL`, `SUPABASE_URL`, `ADMIN_API_KEY` |
| `vercel.json` | Committed | Root deploy config — **do not** use `frontend/vercel.json` |
| `database/supabase_setup.sql` | Committed | Run once in Supabase SQL Editor |
| `database/migrations/*.sql` | Committed | Run in order after setup |
| `.github/workflows/supabase-auto-ingest.yml` | Committed | Daily 8 AM IST scrape (GitHub secrets required) |

### `frontend/.env.local` template

```env
# Public keys only — NEVER service_role here
VITE_SUPABASE_URL=https://YOUR_REF.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your-anon-key

# Local dev: leave empty (Vite proxies /api → :8000)
VITE_API_URL=

# Local: auto | api | supabase | static — Vercel production always uses supabase
VITE_JOBS_SOURCE=auto

# 0 = live refresh; 1 = static JSON only
VITE_DAILY_SYNC_ONLY=0

# Production (push with npm run vercel:env:push:live)
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_GOOGLE_SITE_VERIFICATION=your-search-console-token
```

### `backend/.env` template

```env
SUPABASE_URL=https://YOUR_REF.supabase.co
# Transaction pooler — port 6543, prefix postgresql+asyncpg://
DATABASE_URL=postgresql+asyncpg://postgres.YOUR_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres

ADMIN_API_KEY=long-random-string
CORS_ORIGINS=http://localhost:2222,http://127.0.0.1:2222
APP_ENV=development

# Optional ingest tuning
INGEST_LOOKBACK_DAYS=60
INGEST_MAX_ITEMS_PER_SOURCE=120
DAILY_SYNC_HOUR_IST=8
DAILY_SYNC_ENFORCE_ONCE=1
```

---

## Architecture

```
Official gov.in portals + RSS (100+ sources)
        │
        ▼
┌─────────────────────────────────────────────────────────┐
│  INGEST (daily 8 AM IST)                                │
│  GitHub Actions  OR  npm run daily:sync                 │
│  → scrape → validate → Postgres → live-jobs.json        │
└─────────────────────────────────────────────────────────┘
        │
        ▼
   Supabase Postgres (jobs, job_posts, job_dates, sources)
        │
        ├──────────────────────────────────┐
        ▼                                  ▼
┌──────────────────┐            ┌──────────────────────┐
│  VERCEL (prod)   │            │  BACKEND (optional)  │
│  Static SPA      │            │  FastAPI :8000       │
│  govtjobs.me     │            │  GET /api/jobs       │
└──────────────────┘            └──────────────────────┘
        │
        ▼
Browser loads jobs:
  1. Static live-jobs.json (fast first paint)
  2. Supabase refresh in background (live data)
  3. Job detail: fetch full row + content_sections from Supabase
```

---

## First-time installation

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18+ (24 recommended) |
| Python | 3.11+ |
| Git | latest |
| Supabase account | free tier OK |
| Vercel account | for deploy |

### Step 1 — Clone & install

```bash
git clone https://github.com/Anilkumar-Nallapaneni/mygovtjobs-main.git
cd mygovtjobs-main
npm install
```

### Step 2 — Supabase database

1. Create project at [supabase.com](https://supabase.com).
2. **SQL Editor** → run `database/supabase_setup.sql`.
3. Run migrations `database/migrations/001.sql` through `008.sql` in order.
   - Or from repo root: `npm run db:migrate`
4. Copy from **Project Settings → API**:
   - Project URL → `VITE_SUPABASE_URL` / `SUPABASE_URL`
   - `anon` key → `VITE_SUPABASE_ANON_KEY` (frontend only)
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (backend / GitHub only)
5. Copy **Database → Connection string → Transaction pooler** (port **6543**) → `DATABASE_URL`
   - Must start with `postgresql+asyncpg://` (not `postgresql://`).

### Step 3 — Backend Python env

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
pip install -r requirements.txt

# macOS / Linux
source .venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env` (see template above).

### Step 4 — Frontend env

```bash
cd frontend
# Windows: copy .env.example .env.local  (or create manually)
```

Fill `frontend/.env.local` (see template above).

### Step 5 — Verify everything connects

From **repo root**:

```bash
npm run env:check        # frontend + backend Supabase ref match
npm run db:migrate       # schema (safe to re-run)
npm run db:test          # backend → Postgres
npm run supabase:test    # frontend → Supabase tables
npm run supabase:audit   # row counts
```

### Step 6 — First data load

```bash
npm run ingest:direct:quick   # 20 sources → DB + live-jobs.json (fast test)
# OR full daily pipeline:
npm run daily:sync
```

### Step 7 — Vercel + GitHub (production)

See sections [Vercel](#vercel-deploy) and [GitHub Actions](#github-actions) below.

---

## Run locally (dev)

**Terminal 1 — Backend API**

```bash
npm run api:dev
# → http://localhost:8000/docs
```

**Terminal 2 — Frontend**

```bash
npm run dev
# → http://localhost:2222
```

**Smoke test**

```bash
npm run verify
```

---

## Daily operations — what runs automatically

You do **not** need to run these manually if GitHub Actions is configured.

| When | What | Where |
|------|------|-------|
| **8:00 AM IST daily** | Scrape 100+ official sources → Supabase → `live-jobs.json` → sitemap commit | `.github/workflows/supabase-auto-ingest.yml` |
| **Sunday 8:30 AM IST** | PDF enrich + static job-detail JSON (50 jobs) | `.github/workflows/weekly-enrich.yml` |
| **Weekly** | Portal health audit | `.github/workflows/weekly-portal-audit.yml` |
| **On git push to `main`** | Vercel production deploy | Vercel (auto) |
| **On PR** | CI lint + test + build | `.github/workflows/ci.yml` |

### What the daily GitHub ingest does

1. Sync scraper registry → `sources` table  
2. Parallel scrape all enabled portals → `jobs` table  
3. Scrub aggregators / noise → export `frontend/public/data/live-jobs.json`  
4. Rebuild `frontend/public/sitemap.xml` (all job slugs)  
5. Run `jobs:audit:strict` quality gates  
6. Commit `live-jobs.json` + sitemap to `main` (triggers Vercel redeploy)  
7. Optional: email job alerts (`RESEND_API_KEY` secret)

**Skipped in daily CI** (too slow — runs weekly instead): full PDF enrich for all jobs, `build:job-details` for 1900+ files.

---

## Daily checklist — what you do

### Every day (2 minutes)

| # | Action | Command / URL |
|---|--------|---------------|
| 1 | Check site loads | Open [govtjobs.me](https://www.livegovtjobs.com) |
| 2 | Check last ingest ran | [GitHub Actions](https://github.com/Anilkumar-Nallapaneni/mygovtjobs-main/actions) → **Supabase auto ingest** → green ✓ |
| 3 | Check job count | `npm run supabase:audit` → expect 600+ live jobs |
| 4 | Spot-check 2–3 job details | Click job → title, PDF, Apply buttons match notification |

### If ingest failed (GitHub Action red ✗)

```bash
# Re-run manually from repo root (needs backend/.env):
npm run daily:sync

# Or trigger in GitHub: Actions → Supabase auto ingest → Run workflow
```

### Once a week (10 minutes)

```bash
npm run jobs:audit:strict          # data quality gates
npm run test                       # 139 frontend + 65 backend tests
npm run lint && npm run build      # before any big deploy
npm run go-live:check              # env + Vercel + GA sanity check
```

### After code changes (before production)

```bash
npm run check:frontend
npm run type-check
npm run lint
npm run test
npm run build
git push origin main               # Vercel auto-deploys
```

### Manual ingest (when you add sources or fix scrapers)

```bash
npm run daily:sync                 # fast — no PDF enrich (~20–45 min)
npm run daily:sync:full            # includes PDF backfill + enrich (hours)
npm run ingest:direct:quick        # 20 sources only (quick test)
```

---

## Frontend

| Item | Value |
|------|-------|
| Path | `frontend/` |
| Dev URL | http://localhost:2222 |
| Tech | Vite 7, React 18, TypeScript, i18next (22+ languages) |
| Entry | `frontend/src/main.tsx` → `App.tsx` |
| Job loading | `hooks/useLiveJobs.ts` |
| Job detail | `pages/JobDetailPage.tsx` → `components/jobs/JobDetail.tsx` |
| Deploy output | `frontend/dist/` |

### How jobs load in the browser

| `VITE_JOBS_SOURCE` | Behavior |
|---------------------|----------|
| `auto` (local default) | Static `live-jobs.json` first → Supabase background refresh |
| `supabase` (Vercel prod) | Same pattern; Supabase is source of truth |
| `api` | Backend `GET /api/jobs` (needs `npm run api:dev`) |
| `static` | `public/data/live-jobs.json` only |

### Key frontend files

```
frontend/src/
  main.tsx              # App shell, Analytics, SpeedInsights
  App.tsx               # Routes, navbar, job list hook
  hooks/useLiveJobs.ts  # Job catalog loader
  pages/JobDetailPage.tsx
  components/jobs/      # JobCard, JobDetail, CategoryGrid
  lib/jobsApi.ts        # API + Supabase job fetch
  lib/supabase.ts       # Supabase client
  lib/analytics.ts      # Google Analytics 4 (gtag)
  utils/jobNoiseFilter.ts  # Filters portal junk from list
```

### Frontend commands

```bash
npm run dev              # :2222
npm run build            # production build + sitemap + prerender 1000 job pages
npm run lint
npm run type-check
npm run test
```

---

## Backend

| Item | Value |
|------|-------|
| Path | `backend/` |
| Dev URL | http://localhost:8000 |
| Tech | FastAPI, SQLAlchemy async, asyncpg |
| Entry | `backend/app/main.py` |
| Docs | http://localhost:8000/docs |

### Key API routes

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/health` | — | Health check |
| GET | `/api/jobs` | — | List jobs (`?limit=1000&offset=0`) |
| GET | `/api/jobs/{slug}` | — | Single job + posts + dates |
| POST | `/api/alerts/subscribe` | — | Email alert signup |
| POST | `/api/admin/ingest/run-all` | `X-Admin-Key` | Trigger full ingest |

### Backend commands

```bash
npm run api:dev          # from repo root
npm run test:backend     # pytest
npm run db:test          # test DATABASE_URL
```

**Note:** Production on Vercel is **frontend-only** (static SPA). Backend is optional unless you deploy API separately and set `VITE_API_URL`.

---

## Supabase

| Item | Value |
|------|-------|
| Dashboard | [supabase.com/dashboard](https://supabase.com/dashboard) |
| Tables | `sources`, `raw_ingest`, `jobs`, `job_posts`, `job_dates`, `alert_subscriptions` |
| Public read | RLS on `jobs`, `sources` (anon key) |
| Write access | `service_role` in backend/.env + GitHub secrets only |

### Supabase commands

```bash
npm run db:migrate         # apply setup + migrations
npm run supabase:audit     # table row counts
npm run supabase:test      # connection + table check
npm run jobs:audit:strict  # PDF/apply/deadline quality gates
npm run env:check          # frontend/backend project ref alignment
```

### Connection strings

| Use | Pooler | Port |
|-----|--------|------|
| Backend + ingest | **Transaction** pooler | **6543** |
| Never use for async backend | Session pooler | 5432 |

Prefix for Python backend: `postgresql+asyncpg://...`

---

## Vercel (deploy)

| Item | Value |
|------|-------|
| Config | Root `vercel.json` (not `frontend/vercel.json`) |
| Domain | govtjobs.me |
| Build | `npm run build` → `frontend/dist/` |
| Analytics | `@vercel/analytics` + `@vercel/speed-insights` in `main.tsx` |

### One-time Vercel setup

```bash
npm install -g vercel
vercel login
npm run vercel:link
```

### Push environment variables

```bash
# Edit frontend/.env.local first (Supabase + GA keys)
npm run vercel:env:push:live
npm run vercel:env:check
npm run vercel:deploy
```

### Vercel production env vars

| Variable | Value |
|----------|--------|
| `VITE_SUPABASE_URL` | `https://YOUR_REF.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase **anon** key |
| `VITE_JOBS_SOURCE` | `supabase` (forced by push script) |
| `VITE_API_URL` | empty (unless API hosted elsewhere) |
| `VITE_GA_MEASUREMENT_ID` | `G-XXXXXXXXXX` from GA4 |
| `VITE_GOOGLE_SITE_VERIFICATION` | Search Console HTML tag token |
| `VITE_SITE_URL` | `https://www.livegovtjobs.com` |

`npm run vercel:env:push:live` reads `frontend/.env.local` and pushes all of the above.

### Deploy

```bash
git push origin main     # auto-deploy (recommended)
# OR manual:
npm run vercel:deploy
```

---

## GitHub Actions

Repo: [github.com/Anilkumar-Nallapaneni/mygovtjobs-main/actions](https://github.com/Anilkumar-Nallapaneni/mygovtjobs-main/actions)

### Required secrets

**Settings → Secrets and variables → Actions**

| Secret | Where to get it |
|--------|-----------------|
| `DATABASE_URL` | Supabase → Database → **Transaction pooler** URI (`postgresql+asyncpg://...:6543/...`) |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase → API → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API → service_role |
| `ADMIN_API_KEY` | Same as `backend/.env` |
| `ALERT_SITE_URL` | `https://www.livegovtjobs.com` |

**Alternative to `DATABASE_URL`:** set `SUPABASE_PROJECT_REF` + `SUPABASE_DB_PASSWORD` + `SUPABASE_DB_REGION`.

### Optional secrets (alerts)

| Secret | Purpose |
|--------|---------|
| `RESEND_API_KEY` | Email job alerts |
| `ALERT_FROM_EMAIL` | Sender address |
| `NOTIFY_EMAIL` | Your inbox when workflows fail |
| `TELEGRAM_BOT_TOKEN` | Telegram alerts |
| `SLACK_WEBHOOK_URL` | Slack failure notifications |

### Workflows

| File | Schedule | Purpose |
|------|----------|---------|
| `supabase-auto-ingest.yml` | Daily 8 AM IST | Main scrape + export + sitemap |
| `weekly-enrich.yml` | Sunday | PDF enrich + detail JSON files |
| `weekly-portal-audit.yml` | Weekly | Portal health check |
| `ci.yml` | On PR/push | Lint, test, build |
| `notify-on-failure.yml` | Called on failure | Email/Slack alert |

### Push GitHub secrets from local

```bash
npm run github:secrets:push
```

### Manual trigger

GitHub → **Actions** → **Supabase auto ingest** → **Run workflow**

---

## Google Analytics & Search Console

### Google Analytics 4 (GA4)

1. Create property at [analytics.google.com](https://analytics.google.com).
2. Copy **Measurement ID** (`G-XXXXXXXXXX`).
3. Add to `frontend/.env.local`:
   ```env
   VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
   ```
4. Push to Vercel and redeploy:
   ```bash
   npm run vercel:env:push:live
   git push origin main
   ```
5. Code: `frontend/src/lib/analytics.ts` + `components/AnalyticsPageTracker.tsx` (page views on route change).

### Vercel Web Analytics

Installed via `@vercel/analytics` in `main.tsx`. No env var needed — view in **Vercel dashboard → Analytics** after deploy.

### Google Search Console

1. Add property `https://www.livegovtjobs.com` at [search.google.com/search-console](https://search.google.com/search-console).
2. Verify via HTML tag:
   ```bash
   npm run google:verify
   # OR manually add VITE_GOOGLE_SITE_VERIFICATION=token to frontend/.env.local
   npm run vercel:env:push:live
   npm run vercel:deploy
   ```
3. Submit sitemap: `https://www.livegovtjobs.com/sitemap.xml`
   - Rebuilt on every `npm run build` and daily GitHub ingest.

---

## All npm commands

Run from **repo root** unless noted.

### Development

| Command | What |
|---------|------|
| `npm run dev` | Frontend :2222 |
| `npm run api:dev` | Backend :8000 |
| `npm run verify` | Quick stack smoke test |
| `npm run env:check` | Supabase ref alignment |
| `npm run go-live:check` | Full production readiness |

### Quality / CI

| Command | What |
|---------|------|
| `npm run lint` | ESLint |
| `npm run type-check` | TypeScript |
| `npm run test` | Frontend + backend tests |
| `npm run build` | Production build |
| `npm run everything` | Full CI-like check |

### Database & audit

| Command | What |
|---------|------|
| `npm run db:migrate` | Schema + migrations |
| `npm run db:test` | Test DATABASE_URL |
| `npm run supabase:audit` | Row counts |
| `npm run supabase:test` | Table existence |
| `npm run jobs:audit` | Job quality report |
| `npm run jobs:audit:strict` | Quality gates (fail on bad data) |

### Ingest & sync

| Command | What |
|---------|------|
| `npm run daily:sync` | **Daily pipeline** (fast, no PDF enrich) |
| `npm run daily:sync:full` | Daily + PDF backfill + enrich |
| `npm run ingest:direct:quick` | 20 sources test |
| `npm run ingest:direct` | Full direct ingest |
| `npm run fetch:official` | JSON only (no DB) |
| `npm run backfill:pdfs` | Fill missing PDF URLs |
| `npm run enrich:jobs` | Parse PDFs → content_sections |
| `npm run build:job-details` | Static detail JSON files |
| `npm run build:sitemap` | Regenerate sitemap.xml |

### Deploy

| Command | What |
|---------|------|
| `npm run vercel:link` | Link Vercel project |
| `npm run vercel:env:push` | Push env to Vercel (preview) |
| `npm run vercel:env:push:live` | Push production env (govtjobs.me) |
| `npm run vercel:env:check` | Verify VITE_JOBS_SOURCE on Vercel |
| `npm run vercel:deploy` | Manual production deploy |
| `npm run github:secrets:push` | Push secrets to GitHub Actions |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Site shows old jobs | Check GitHub Actions ingest; run `npm run daily:sync` |
| Job detail wrong / mismatch | Hard refresh; ensure latest deploy; check `jobs:audit:strict` |
| 0 jobs on site | `npm run supabase:audit`; run ingest; check `VITE_JOBS_SOURCE` on Vercel |
| Vercel build fails | `npm run build` locally; fix TypeScript errors |
| Ingest fails on GitHub | Check `DATABASE_URL` uses **pooler** host port 6543 |
| No GA data | Set `VITE_GA_MEASUREMENT_ID` → `vercel:env:push:live` → redeploy |
| PDF buttons missing | `npm run backfill:pdfs` then `npm run enrich:jobs` |
| `daily:sync` says "already in progress" | Wait for GitHub Action to finish, or use `--force` |

---

## More docs

| Doc | Topic |
|-----|-------|
| [ROADMAP.md](ROADMAP.md) | Product roadmap — phases, 90-day plan, quality targets |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Full roadmap (same content) |
| [docs/INSTALLATION_AND_RUN.md](docs/INSTALLATION_AND_RUN.md) | Extended install guide |
| [docs/DEPLOY_VERCEL_SUPABASE.md](docs/DEPLOY_VERCEL_SUPABASE.md) | Deploy focus |
| [docs/DAILY_8AM_SYNC.md](docs/DAILY_8AM_SYNC.md) | Daily ingest details |
| [docs/GO_LIVE.md](docs/GO_LIVE.md) | Production go-live steps |
| [docs/COMPONENTS.md](docs/COMPONENTS.md) | Every React component |
| [AGENTS.md](AGENTS.md) | AI/developer conventions |

---

## Repository layout

```
mygovtjobs-main/
├── frontend/                 # React SPA (Vercel)
│   ├── src/                  # TypeScript only
│   ├── public/data/          # live-jobs.json, sitemap.xml
│   └── .env.local            # YOU create — not committed
├── backend/                  # FastAPI
│   ├── app/                  # routes, scrapers, services
│   └── .env                  # YOU create — not committed
├── database/                 # supabase_setup.sql + migrations/
├── scripts/                  # ingest, audit, env push
├── .github/workflows/        # daily ingest, CI, weekly enrich
├── vercel.json               # root deploy config
└── package.json              # all npm scripts
```

---

## License & status

| System | Status |
|--------|--------|
| Frontend (govtjobs.me) | Live on Vercel |
| Supabase jobs DB | ~700 live, ~1500 total |
| Daily GitHub ingest | 8 AM IST |
| GA4 + Vercel Analytics | Configured |
| Google Search Console | Sitemap at `/sitemap.xml` |
