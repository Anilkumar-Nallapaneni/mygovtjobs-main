# My Govt Jobs — Installation & Run Guide

Complete step-by-step setup for **Frontend**, **Backend**, **Supabase**, and **Vercel**. Use this page on a new machine from zero to a running app (local + production).

---

## What you are setting up

| Layer | Technology | Port / URL |
|-------|------------|------------|
| **Frontend** | Vite + React + TypeScript | http://localhost:2222 |
| **Backend API** | FastAPI + SQLAlchemy | http://localhost:8000 |
| **Database** | Supabase (Postgres) | Cloud |
| **Production site** | Vercel (static frontend) | `https://your-project.vercel.app` |
| **Job ingest** | Python scrapers (local or GitHub Actions) | Writes to Supabase |

**How jobs reach the UI:**

```
Official portals / RSS
        ↓
   Ingest scripts (Python)
        ↓
   Supabase `jobs` table
        ↓
   Frontend reads via Supabase REST (production)
   or Backend API / static JSON (local options)
```

---

## Part 0 — Prerequisites (install once per machine)

### Required software

| Tool | Version | Download | Used for |
|------|---------|----------|----------|
| **Git** | any recent | https://git-scm.com | Clone repo |
| **Node.js** | **18+** (20 recommended) | https://nodejs.org | Frontend, npm scripts |
| **Python** | **3.11+** (3.12 recommended) | https://www.python.org | Backend, ingest |
| **Supabase account** | free tier OK | https://supabase.com | Database |
| **Vercel account** | free tier OK | https://vercel.com | Production frontend |

### Optional (production / CLI)

| Tool | Purpose |
|------|---------|
| **Vercel CLI** | `npm i -g vercel` — deploy from terminal |
| **Supabase CLI** | https://supabase.com/docs/guides/cli — optional DB tooling |

### Verify installs

```bash
git --version
node --version    # v18+
npm --version
python --version  # 3.11+
```

**Windows note:** Use **PowerShell** or **Terminal**. If `python` fails, try `py -3.12`. If `pip` fails, use `python -m pip`.

---

## Part 1 — Clone repository & install Node (frontend + scripts)

### Step 1.1 — Clone

```bash
git clone <your-repo-url>
cd gov-job-alert-Govt-Jobs
```

### Step 1.2 — Install Node dependencies

From **repo root** (not only `frontend/`):

```bash
npm install
```

This installs:

- Root workspace tools (`cheerio`, `rss-parser`, Supabase JS for scripts)
- **Frontend** dependencies via npm workspaces (`frontend/package.json`)

### Step 1.3 — Confirm frontend installs

```bash
cd frontend
npm ci          # optional: clean install from lockfile
cd ..
```

---

## Part 2 — Supabase (database)

### Step 2.1 — Create project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. **New project** → choose name, password, region
3. Wait until the project is **Active**

### Step 2.2 — Run SQL (schema + security)

In Supabase → **SQL Editor**, run **in order**:

1. **`database/supabase_setup.sql`** — creates tables: `sources`, `raw_ingest`, `jobs`, `job_posts`, `job_dates`, `alert_subscriptions`, `alert_deliveries`
2. **`database/migrations/002_supabase_rls_and_grants.sql`** — RLS policies + `GRANT SELECT` for anon on `jobs`

Optional later migrations: check `database/migrations/` for any newer files.

### Step 2.3 — Copy API keys

**Project Settings → API**

| Supabase field | Use in app as |
|----------------|---------------|
| **Project URL** | `VITE_SUPABASE_URL` / `SUPABASE_URL` |
| **anon public** | `VITE_SUPABASE_ANON_KEY` (frontend only) |
| **service_role** | `SUPABASE_SERVICE_ROLE_KEY` (backend only — **never** in Vercel frontend) |

### Step 2.4 — Copy database connection string

**Project Settings → Database → Connection string**

- Choose **URI**
- Use **Transaction pooler** (port **6543**) for the Python backend
- Replace scheme with async driver:

```text
postgresql+asyncpg://postgres.<PROJECT_REF>:<PASSWORD>@aws-0-<REGION>.pooler.supabase.com:6543/postgres
```

URL-encode special characters in the password (`@`, `#`, etc.).

### Step 2.5 — Verify Supabase (after frontend env exists)

From repo root (after Part 4):

```bash
npm run supabase:test
```

Expected: all tables show **✓**; sample job titles may print. A **✗ REST 401** on the root URL alone is OK if `jobs` reads succeed.

```bash
npm run supabase:audit    # row counts per table
```

---

## Part 3 — Backend (Python / FastAPI)

### Step 3.1 — Create environment file

```bash
cd backend
```

**Windows:**

```powershell
copy .env.example .env
```

**macOS / Linux:**

```bash
cp .env.example .env
```

### Step 3.2 — Edit `backend/.env`

```env
DATABASE_URL=postgresql+asyncpg://postgres.<REF>:<PASSWORD>@aws-0-<REGION>.pooler.supabase.com:6543/postgres

SUPABASE_URL=https://<PROJECT_REF>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

ADMIN_API_KEY=<long-random-string>
ALLOW_INSECURE_ADMIN=0
APP_ENV=development

CORS_ORIGINS=http://localhost:2222,http://127.0.0.1:2222,https://mygovtjobs.vercel.app

SQL_ECHO=0
INGEST_LOOKBACK_DAYS=60
INGEST_MAX_ITEMS_PER_SOURCE=120
```

Add your **Vercel production URL** to `CORS_ORIGINS` if you host the API separately later.

### Step 3.3 — Create Python virtual environment

Still in `backend/`:

```bash
python -m venv .venv
```

**Windows — install packages:**

```powershell
.venv\Scripts\activate
python -m pip install -r requirements.txt
```

**macOS / Linux:**

```bash
source .venv/bin/activate
python -m pip install -r requirements.txt
```

### Step 3.4 — Verify backend imports

```bash
# With venv activated, from backend/
set ALLOW_INSECURE_ADMIN=1          # Windows CMD
set APP_ENV=development
python -c "from app.main import app; print(app.title)"
```

**PowerShell:**

```powershell
$env:ALLOW_INSECURE_ADMIN="1"
$env:APP_ENV="development"
python -c "from app.main import app; print(app.title)"
```

Expected: `My Govt Jobs API`

### Step 3.5 — Verify database from backend

From **repo root**:

```bash
npm run db:test
```

Expected: `[OK] Database connected - jobs table has N row(s)`

### Step 3.6 — Run backend unit tests (optional)

```bash
cd backend
python -m pytest tests/ -v
```

---

## Part 4 — Frontend (Vite / React)

### Step 4.1 — Create environment file

```bash
cd frontend
```

**Windows:**

```powershell
copy .env.example .env.local
```

**macOS / Linux:**

```bash
cp .env.example .env.local
```

> **Never commit** `frontend/.env.local` — it is gitignored.

### Step 4.2 — Edit `frontend/.env.local`

```env
VITE_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-public-key>

# Leave empty in local dev — Vite proxies /api → http://127.0.0.1:8000
VITE_API_URL=

# Choose how the UI loads jobs (see table below)
VITE_JOBS_SOURCE=supabase
```

#### `VITE_JOBS_SOURCE` options

| Value | When to use | Loads from |
|-------|-------------|------------|
| **`supabase`** | **Vercel production**, or local without backend | Supabase `jobs` table (up to 8000 rows, paginated) |
| **`api`** | Local dev with backend running | `GET http://localhost:8000/api/jobs` |
| **`static`** | Offline / demo | `frontend/public/data/live-jobs.json` only |
| **`auto`** | Legacy default | static → supabase → api |

**Recommendations:**

- **Production (Vercel):** `supabase`
- **Local full stack:** `api` or `supabase`
- **Fast UI without backend:** `static` or `auto`

### Step 4.3 — Type-check, lint, build (optional QA)

From `frontend/`:

```bash
npm run type-check
npm run lint
npm run build
```

Or from repo root:

```bash
npm run type-check
npm run lint
npm run build
```

---

## Part 5 — Run everything locally

You need **two terminals** for API + UI (or one terminal if using `supabase` mode only).

### Terminal A — Backend API

**Option 1 — from repo root (uses `backend/.venv` automatically):**

```bash
npm run api:dev
```

**Option 2 — manual:**

```bash
cd backend
.venv\Scripts\activate    # Windows
# source .venv/bin/activate   # macOS / Linux
uvicorn app.main:app --reload --port 8000
```

| URL | Purpose |
|-----|---------|
| http://localhost:8000/docs | Swagger API |
| http://localhost:8000/health | Health check |
| http://localhost:8000/health/detailed | DB status |
| http://localhost:8000/api/jobs?limit=10 | Job list |

### Terminal B — Frontend

From **repo root**:

```bash
npm run dev
```

Open: **http://localhost:2222/**

(Vite proxies `/api/*` → port 8000 when `VITE_API_URL` is empty.)

### Step 5.1 — Verify full stack

With frontend running:

```bash
npm run verify
```

Expected: **11/11 checks passed** (includes live Supabase/frontend URLs when dev server is up).

```bash
npm run check:frontend    # TS-only policy under frontend/src
```

---

## Part 6 — Load jobs into the database (ingest)

Without ingest, the DB may be empty and the UI shows demo/few jobs.

### Quick test (~20 sources)

```bash
npm run ingest:direct:quick
```

### Full India ingest (all enabled sources)

```bash
npm run ingest:direct
```

Takes a long time (30–90+ minutes depending on network).

### Alternative: Supabase sync scripts

```bash
npm run supabase:sync-sources
npm run supabase:full-sync
```

### JSON only (no database)

```bash
npm run fetch:official
```

Writes `frontend/public/data/live-jobs.json` — use with `VITE_JOBS_SOURCE=static`.

### After ingest — refresh static fallback file

```bash
npm run data:scrub
```

Or export from DB (800-row cap in exporter):

```bash
# Uses backend/.env DATABASE_URL
node scripts/run-python.mjs -c "
import asyncio, sys
from pathlib import Path
sys.path.insert(0, str(Path('backend').resolve()))
from app.database.session import SessionLocal
from app.services.job_persist_service import JobPersistService
async def main():
    async with SessionLocal() as s:
        n = await JobPersistService().export_live_jobs_json(s)
    print('Exported', n, 'jobs')
asyncio.run(main())
"
```

### Enrich metadata (vacancies, PDFs — reduces placeholder labels)

```bash
npm run backfill:pdfs
npm run enrich:jobs
```

---

## Part 7 — Vercel (production frontend)

Full detail: [DEPLOY_VERCEL_SUPABASE.md](./DEPLOY_VERCEL_SUPABASE.md)

### Architecture (production)

```
Browser → Vercel CDN (React app)
              ↓
         Supabase REST (anon key) → jobs table
```

No backend required on Vercel if `VITE_JOBS_SOURCE=supabase`.

### Step 7.1 — Install Vercel CLI (optional)

```bash
npm i -g vercel
vercel login
```

### Step 7.2 — Link project

From **repo root**:

```bash
vercel link
```

Choose your team and project (or create **mygovtjobs**).

### Step 7.3 — Set environment variables

**Option A — CLI (reads `frontend/.env.local`):**

```bash
npm run vercel:env:push
```

Sets on **production**:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_JOBS_SOURCE=supabase`

**Option B — Vercel Dashboard**

Project → **Settings → Environment Variables**:

| Name | Value | Environments |
|------|--------|--------------|
| `VITE_SUPABASE_URL` | `https://<ref>.supabase.co` | Production, Preview |
| `VITE_SUPABASE_ANON_KEY` | anon key | Production, Preview |
| `VITE_JOBS_SOURCE` | `supabase` | Production, Preview |
| `VITE_API_URL` | *(leave empty)* | unless API hosted elsewhere |

**Option C — Vercel ↔ Supabase integration**

Integrations → Supabase → link project, then map to `VITE_*` names (not `NEXT_PUBLIC_*`).

### Step 7.4 — Deploy

```bash
npm run vercel:deploy
# or
vercel --prod
```

`vercel.json` at repo root configures:

- Build: `cd frontend && npm ci && npm run build`
- Output: `frontend/dist`
- SPA rewrites to `index.html`

### Step 7.5 — Verify production

1. Open your `*.vercel.app` URL
2. DevTools → **Network** → requests to `*.supabase.co/rest/v1/jobs`
3. Job grid should show DB rows (thousands if ingested)

---

## Part 8 — GitHub Actions (scheduled ingest)

Workflow: `.github/workflows/supabase-auto-ingest.yml`

**Repository secrets** (Settings → Secrets → Actions):

| Secret | Purpose |
|--------|---------|
| `DATABASE_URL` | Supabase pooler URI (`postgresql+asyncpg://...`) |
| `VITE_SUPABASE_URL` | Audit workflow |
| `VITE_SUPABASE_ANON_KEY` | Audit workflow |
| `ADMIN_API_KEY` | If using API ingest workflow |
| `MYGOVTJOBS_API_URL` | Deployed API URL (optional) |

Ingest still runs against Supabase; Vercel only serves the frontend.

---

## Command reference (repo root)

### Install & verify

| Command | What it does |
|---------|----------------|
| `npm install` | Install Node deps (root + frontend) |
| `npm run db:test` | Backend → Postgres connection |
| `npm run supabase:test` | Frontend env → Supabase tables |
| `npm run supabase:audit` | Row counts |
| `npm run verify` | Stack smoke test (needs `npm run dev` for full pass) |
| `npm run check:frontend` | No stray `.js` in `frontend/src` |

### Run locally

| Command | What it does |
|---------|----------------|
| `npm run dev` | Frontend on **:2222** |
| `npm run api:dev` | Backend on **:8000** (uses `backend/.venv`) |
| `npm run build` | Production frontend build |
| `npm run lint` | ESLint |
| `npm run type-check` | TypeScript |

### Data & ingest

| Command | What it does |
|---------|----------------|
| `npm run ingest:direct` | Full scrape → DB → export JSON |
| `npm run ingest:direct:quick` | ~20 sources test ingest |
| `npm run ingest:all` | Ingest via HTTP API (backend must run) |
| `npm run fetch:official` | RSS/sites → JSON only |
| `npm run supabase:full-sync` | Full Supabase sync pipeline |
| `npm run data:scrub` | Remove aggregators + export JSON |
| `npm run backfill:pdfs` | Find PDF URLs in DB |
| `npm run enrich:jobs` | Enrich from PDF text |

### Deploy

| Command | What it does |
|---------|----------------|
| `npm run vercel:link` | Link folder to Vercel project |
| `npm run vercel:env:push` | Push env from `.env.local` |
| `npm run vercel:deploy` | Production deploy |

---

## Environment variables (complete list)

### Frontend — `frontend/.env.local`

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes (live mode) | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes (live mode) | Public anon key only |
| `VITE_API_URL` | No | Backend base URL; **empty** in dev (use Vite proxy) |
| `VITE_JOBS_SOURCE` | Recommended | `supabase` \| `api` \| `static` \| `auto` |

### Backend — `backend/.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | `postgresql+asyncpg://...` pooler URI |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-side key (ingest/admin) |
| `ADMIN_API_KEY` | Yes | Protects ingest/admin routes |
| `CORS_ORIGINS` | Yes | Comma-separated allowed origins |
| `APP_ENV` | No | `development` / `production` |
| `ALLOW_INSECURE_ADMIN` | No | `1` only for local testing |
| `INGEST_LOOKBACK_DAYS` | No | Default `60` |
| `INGEST_MAX_ITEMS_PER_SOURCE` | No | Default `120` |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| **Demo jobs only** | Run ingest; set `VITE_JOBS_SOURCE=supabase` or `api`; restart `npm run dev` |
| **Many placeholder labels on cards** | Missing vacancy counts in DB — run `npm run enrich:jobs` |
| **`ModuleNotFoundError: http_client`** | Ensure `backend/app/scrapers/http_client.py` exists |
| **`db:test` fails** | Fix `DATABASE_URL`, password encoding, run SQL setup |
| **Supabase 401 on jobs** | Run migration `002`; check anon key; confirm RLS |
| **`ingest:all` 401** | Set `ADMIN_API_KEY` in `backend/.env`; start API |
| **Windows: pip not found** | Use `python -m pip install -r requirements.txt` |
| **Vercel: no jobs** | Set `VITE_JOBS_SOURCE=supabase`; redeploy after env change |
| **verify fails on frontend** | Run `npm run dev` first |
| **API 0 jobs, health OK** | Restart `npm run api:dev`; check `health/detailed` |

---

## Quick start cheat sheet

### New developer (local, Supabase live data)

```bash
# 1. Install
git clone <repo>
cd gov-job-alert-Govt-Jobs
npm install
cd backend && python -m venv .venv && .venv\Scripts\pip install -r requirements.txt
cd ../frontend && copy .env.example .env.local   # then edit keys

# 2. Supabase: run database/supabase_setup.sql + migrations/002 in SQL Editor

# 3. Test connections
npm run db:test
npm run supabase:test

# 4. Ingest (once)
npm run ingest:direct:quick

# 5. Run (two terminals)
npm run api:dev      # optional if VITE_JOBS_SOURCE=supabase
npm run dev          # http://localhost:2222
```

### Production (Vercel + Supabase only)

```bash
# Local: configure frontend/.env.local with Supabase keys
npm run vercel:link
npm run vercel:env:push
vercel --prod

# Ingest from laptop periodically:
npm run ingest:direct
```

---

## Related docs

| Document | Contents |
|----------|----------|
| [README.md](../README.md) | Project overview, API reference, roadmap |
| [DEPLOY_VERCEL_SUPABASE.md](./DEPLOY_VERCEL_SUPABASE.md) | Vercel + Supabase deployment focus |
| [COMPONENTS.md](./COMPONENTS.md) | Frontend component map |
| [ROADMAP.md](./ROADMAP.md) | Planned features |

---

## Security reminders

- Never put **`service_role`** in `frontend/.env.local` or Vercel `VITE_*` variables.
- Never commit **`backend/.env`** or **`frontend/.env.local`**.
- Rotate keys if they were exposed in git or chat.
- `VITE_*` values are visible in the browser bundle — only use **anon** key there.
