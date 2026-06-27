# All Agents & Run Guide

> **Simple view:** see **[RUN.md](../RUN.md)** at repo root — agents, daily commands, and `npm run everything` explained in one page.

This doc has the **full** install, deploy, and GitHub Actions details.

---

## Agents at a glance

| # | Agent | Command | What it does |
|---|-------|---------|--------------|
| 1 | **IngestAgent** | `npm run daily:sync` | Scrape official portals → Supabase + `live-jobs.json` |
| 2 | **PdfReaderAgent** | `npm run pdf:read:live` | Read PDFs → vacancies, dates, sections |
| 3 | **JobDetailAgent** | `npm run job:details` | Build job detail UI pages |
| — | RSS feeds | `npm run fetch:official:feeds` | Official Wire & Notices |
| — | All Websites | `npm run websites:discover` | Catalog gov job portals |

**Combined:** `npm run pipeline:live:full` (all 3 agents)

---

## Daily routine (manual)

```bash
npm run daily:sync
npm run fetch:official:feeds
npm run build:official-archives
npm run supabase:audit
```

---

## What you are running

| Layer | Path | Port / host | Purpose |
|-------|------|-------------|---------|
| **Frontend** | `frontend/` | `:2222` local, **Vercel** prod | React UI |
| **Backend API** | `backend/` | `:8000` local | FastAPI — admin, ingest API |
| **Database** | Supabase Postgres | Cloud | `jobs`, `sources`, PDF memory |
| **Ingest scripts** | `scripts/` | Local or GitHub Actions | Scrape 100+ official portals |

### Data flow

```
Official portals + RSS feeds
        ↓
   Agent 1 (Ingest) — scrape → Supabase `jobs` table
        ↓
   Agent 2 (PDF Reader) — download PDFs → enrich DB + static JSON
        ↓
   Agent 3 (Job Detail) — build detail pages → UI / Storage
        ↓
   Frontend reads via Supabase REST (Vercel prod) or static JSON (local)
```

---

## One-time installation

### Prerequisites

| Tool | Version |
|------|---------|
| **Node.js** | 18+ |
| **Python** | 3.11+ |
| **Supabase account** | free tier OK |
| **Vercel account** | free tier OK (production) |

### Steps

```bash
git clone <your-repo-url>
cd mygovtjobs-main
npm install
cd backend && python -m venv .venv && .venv\Scripts\pip install -r requirements.txt && cd ..
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env.local
npm run db:migrate
npm run db:test && npm run supabase:test
```

**Windows:** `npm run setup:windows`

---

## Environment files

### Frontend — `frontend/.env.local`

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_PUBLIC_KEY
VITE_JOBS_SOURCE=supabase
VITE_DAILY_SYNC_ONLY=1
```

| `VITE_JOBS_SOURCE` | Loads from |
|--------------------|------------|
| `supabase` | Supabase `jobs` table (production) |
| `api` | Backend API at `:8000` |
| `static` | `frontend/public/data/live-jobs.json` only |

### Backend — `backend/.env`

```env
DATABASE_URL=postgresql+asyncpg://postgres.<REF>:<PASSWORD>@aws-0-<REGION>.pooler.supabase.com:6543/postgres
SUPABASE_URL=https://<PROJECT_REF>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
ADMIN_API_KEY=<long-random-string>
```

Generate admin key: `npm run admin:key:generate`

---

## Supabase setup

1. Create project at [supabase.com/dashboard](https://supabase.com/dashboard)
2. Run `npm run db:migrate` (or run SQL files in `database/` manually)
3. Copy API keys from **Project Settings → API**
4. Use **Transaction pooler** URI (port **6543**) for `DATABASE_URL`

Verify:

```bash
npm run db:test
npm run supabase:test
npm run env:check
```

---

## Deploy frontend on Vercel

1. Import repo at [vercel.com/new](https://vercel.com/new) — use **root** `vercel.json`
2. Set env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_JOBS_SOURCE=supabase`
3. Deploy

```bash
npm run vercel:link
npm run vercel:env:push
npm run vercel:deploy
```

---

## GitHub Actions (automated daily)

| Workflow | Schedule | What it does |
|----------|----------|--------------|
| `supabase-auto-ingest.yml` | Daily 8:00 AM IST | Scrape → scrub → commit JSON → RSS → sitemap |
| `fetch-official-feeds.yml` | Every 4 hours | Refresh RSS snapshot |
| `weekly-enrich.yml` | Sunday 8:30 AM IST | PDF enrich + detail files |

**Required GitHub secrets:** `DATABASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `ADMIN_API_KEY`

Push from local: `npm run github:secrets:push`

---

## Security

- **Never** put `service_role` in frontend or Vercel `VITE_*` vars
- **Never** commit `.env` files
- Frontend uses **anon key only**

---

## Related docs

| Document | Contents |
|----------|----------|
| **[RUN.md](../RUN.md)** | **Simple command cheat sheet** |
| `AGENTS.md` | Developer agent guide |
| `docs/INSTALLATION_AND_RUN.md` | Detailed install steps |
| `docs/DAILY_8AM_SYNC.md` | Daily sync deep dive |
| `docs/GO_LIVE.md` | Production checklist |
