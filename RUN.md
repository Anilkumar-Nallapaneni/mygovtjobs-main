# RUN.md — Simple command guide

Copy-paste commands for **Live Govt Jobs**. Run everything from **repo root**.

---

## Operator commands (use these)

| Goal | Command |
|------|---------|
| **Dev (frontend)** | `npm run dev` → http://localhost:3689 |
| **Validate** | `npm run validate` (type-check + lint + tests) |
| **Sync jobs** | `npm run sync:jobs` (production ingest; currently frozen in CI until `ALLOW_AUTO_INGEST=true`) |
| **Build** | `npm run build` |
| **Deploy check** | `npm run deploy:check` |

Other scripts below remain for agents and recovery. Prefer the five commands above for normal operation.

---

## Quick pick — what do you want?

| Goal | Run this |
|------|----------|
| **Browse jobs locally (no setup)** | `npm run dev` → http://localhost:3689 |
| **Daily morning update** | See [Daily routine](#daily-routine) below |
| **Find / fix website issues** | `npm run health:website` · full: `npm run health:website:full` |
| **Manual secrets / GSC / API DNS** | [docs/HUMAN_CHECKLIST.md](docs/HUMAN_CHECKLIST.md) |
| **Full CI check (before PR)** | `npm run everything` |
| **Frontend unit + E2E tests** | `npm run test` · `npm run test:e2e` |
| **All 3 agents in one go** | `npm run pipeline:live:full` |
| **First time on a new PC** | See [One-time setup](#one-time-setup) |

---

## Production sync (canonical)

GitHub Actions and local production use **three public commands** only:

| Command | When | What it does |
|---------|------|----------------|
| **`npm run sync:quick`** | Every 4 hours (CI) | RSS feeds + official archives — no DB scrape |
| **`npm run sync:production`** / **`sync:jobs`** | Daily ~8 AM IST (CI) | Full scrape, export `live-jobs.json`, feeds, sitemap |
| **`npm run verify:production`** | After deploy / manual | Env, DB, Supabase audit, job quality, snapshot verify |

**CI freeze (fresh restart):** scheduled auto-ingest / weekly enrich / scheduled RSS commits are gated on repository variable `ALLOW_AUTO_INGEST=true`. Ingest always sets `AUTO_PUBLISH_VERIFIED=0` so new rows stay `draft` until verified.

**CI workflows:** `fetch-official-feeds.yml` → `sync:quick` · `supabase-auto-ingest.yml` → `sync:production`

Advisory lock `20260710` prevents two syncs at once. Run history is stored in Supabase `sync_runs`.

Legacy aliases (`daily:sync`, `sync:all`, `supabase:full-sync`) still work for local dev; prefer the three commands above for production.

---

## Canonical npm scripts

Use these names — older aliases were removed to reduce duplication.

| Category | Canonical command | Notes |
|----------|-------------------|-------|
| **Dev** | `npm run dev` | Frontend :3689 |
| **API** | `npm run api:dev` | Backend :8000 |
| **Production sync** | `npm run sync:production` | Daily ingest + export (CI) |
| **RSS refresh** | `npm run sync:quick` | Feeds only (~4 h in CI) |
| **Production verify** | `npm run verify:production` | Full stack validation |
| **Website health (Agent 4)** | `npm run health:website` | Fast audit; `:code` for tests; `:full` for live probes |
| **Daily ingest (local)** | `npm run daily:sync` | Agent 1 — scrape + export JSON |
| **Full daily** | `npm run daily:sync:full` | Ingest + PDF backfill + enrich |
| **Quick ingest test** | `npm run ingest:direct:quick` | ~20 sources |
| **PDF backfill** | `npm run pdf:backfill` | Find missing PDF URLs in DB |
| **PDF read** | `npm run pdf:read:live` | Agent 2 — all missing PDFs |
| **Job details** | `npm run job:details` | Agent 3 — publish detail UI |
| **AI employees** | `npm run ai:employees` | QA + promote + watchdog (dry-run) |
| **AI employees apply** | `npm run ai:employees:apply` | Write fixes, promote, export |
| **Weekly CI enrich** | `npm run weekly:enrich:ci` | pdf:read (50) + job:details (50) |
| **Portal audit** | `npm run audit:official-sites:strict` | Strict official-site checks |
| **Aggregator scrub** | `npm run data:scrub` | Remove blocked jobs + export |
| **PR check** | `npm run check:frontend && npm run type-check && npm run test && npm run build` | Lighter than `everything` |
| **E2E (Playwright)** | `npm run test:e2e` | Builds `dist-e2e/`, starts preview on :4321, runs Playwright (no manual preview) |

**Coverage targets** (`npm run test:coverage`): utilities and hooks enforce 70% line coverage; components enforce 40% lines, 35% branches, 35% statements, and 18% functions. Globs include `.ts` and `.tsx` explicitly.

**Removed aliases** (use canonical name instead): `ingest:official*` → `daily:sync*`; `backfill:pdfs` → `pdf:backfill`; `data:scrub-blocked` → `data:scrub`; `portal:audit` → `audit:official-sites:strict`; `upload:job-details` / `build:job-details:ci` → `weekly:enrich:ci`. `build:job-details` still prints a deprecation message — use `pdf:read:live` + `job:details`.

---

```
Official portals  →  Agent 1  →  Agent 2  →  Agent 3  →  Website
                     Ingest      PDF         Job         (UI)
                     new jobs    read PDFs   detail
                                 pages
```

| # | Agent | What it does | Command |
|---|-------|--------------|---------|
| **1** | **IngestAgent** | Scrape 100+ official gov.in sites → Supabase + `live-jobs.json` | `npm run daily:sync` |
| **2** | **PdfReaderAgent** | Download notification PDFs → vacancies, dates, sections in DB | `npm run pdf:read:live` |
| **3** | **JobDetailAgent** | Build job detail pages for the UI | `npm run job:details` |
| **4** | **WebsiteHealthAgent** | Audit + guide fixes for code, Supabase, Vercel, GitHub, API, analytics, live site | `npm run health:website` / `health:website:full` |
| **5** | **QaReviewAgent** | AI employee — verify vacancy/date/PDF/state/title by state bucket | `npm run ai:review` / `ai:review:apply` |
| **6** | **WatchdogAgent** | AI employee — demote bad live jobs | `npm run ai:watchdog` / `ai:watchdog:apply` |
| **7** | **AI Employees** | QA (all buckets) → promote → watchdog | `npm run ai:employees` / `ai:employees:apply` |
| — | **All Websites** | Catalog gov job portals across India (discovery only) | `npm run websites:discover` |
| — | **RSS feeds** | Official Wire & Notices (separate from main ingest) | `npm run fetch:official:feeds` |

**Code:** `backend/app/agents/ingest_agent.py`, `pdf_reader_agent.py`, `job_detail_agent.py`, `qa_review_agent.py`, `watchdog_agent.py`, `ai_employees.py`  
**Health code:** `scripts/website-health-agent.mjs` · report → `scripts/output/website-health-report.json`

### AI employees (state-wise)

Dry-run first (no DB writes):

```bash
npm run ai:employees                 # QA all buckets + promote dry-run + watchdog dry-run
npm run ai:review -- --bucket north  # one region only
```

Apply fixes + promote + export:

```bash
npm run ai:employees:apply
```

Optional LLM assist (never invents numbers — only confirms text-backed fields):

```bash
# in backend/.env
OPENAI_API_KEY=sk-...
AI_REVIEW_MODEL=gpt-4o-mini
```

---

## Daily routine

**Production (recommended):**

```bash
npm run sync:production           # Full daily pipeline (~30–60 min)
npm run verify:production         # Optional — audits + env check
```

**Local / manual steps** (needs `backend/.env` with Supabase):

```bash
npm run daily:sync                  # Agent 1 — new jobs (~20–45 min)
npm run sync:quick                  # RSS + official notices only
```

Quick check after:

```bash
npm run supabase:audit              # row counts
npm run jobs:audit                  # job quality
```

**Weekly (PDF enrichment — slow):**

```bash
npm run pdf:backfill                # find missing PDF links
npm run pdf:read:live               # Agent 2 — read all missing PDFs
npm run job:details                 # Agent 3 — publish detail pages
```

---

## One-time setup

```bash
npm install
cd backend && python -m venv .venv && .venv\Scripts\pip install -r requirements.txt && cd ..
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env.local
# Edit both .env files with Supabase keys
npm run db:migrate
npm run db:test && npm run supabase:test
```

**Windows shortcut:** `npm run setup:windows`

---

## Run locally

**Terminal 1 — frontend (required):**

```bash
npm run dev
```

Open **http://localhost:3689**

**Terminal 2 — backend (optional):**

```bash
npm run api:dev
```

API docs: http://localhost:8000/docs

**No Supabase?** Set `VITE_JOBS_SOURCE=static` in `frontend/.env.local` — uses committed JSON (~1,600 jobs).

---

## Pipeline commands (agents combined)

| Command | Runs |
|---------|------|
| `npm run pipeline:live:full` | Agent 1 + 2 + 3 (full daily pipeline) |
| `npm run pipeline:live` | Agent 2 + 3 only (skip ingest) |
| `npm run daily:sync` | Agent 1 only — **fast**, skips PDF (~20–45 min) |
| `npm run daily:sync:full` | Agent 1 + PDF enrich (~1–3+ hours) |
| `npm run sync:all` | RSS + forced sync + archives |

---

## Agent 1 — Ingest (live jobs)

| Command | When to use |
|---------|-------------|
| `npm run daily:sync` | **Default daily** — scrape all portals, export JSON |
| `npm run daily:sync:full` | Daily + PDF backfill + enrich (slow) |
| `npm run daily:sync:fast` | Fastest — scrape + scrub only |
| `npm run ingest:direct:quick` | Test ~20 sources |
| `npm run ingest:direct` | Full scrape all sources (30–90+ min) |
| `npm run daily:sync -- --force` | Run again same day |

---

## Agent 2 — PDF reader

| Command | When to use |
|---------|-------------|
| `npm run pdf:read` | 50 live jobs missing PDF content |
| `npm run pdf:read:live` | **All** live jobs still missing PDF memory |
| `npm run pdf:read:all` | Re-read every job with a PDF |
| `npm run pdf:backfill` | Find PDF URLs missing in DB |
| `npm run enrich:jobs` | Light metadata backfill from PDF text |

---

## Agent 3 — Job detail pages

| Command | When to use |
|---------|-------------|
| `npm run job:details` | Publish detail UI for jobs that need it |
| `npm run job:details:all` | Force rebuild all detail pages |
| `npm run weekly:enrich:ci` | CI batch: pdf:read (50) + job:details (50) |
| `npm run build:job-details` | **Deprecated** — prints migration hint; use `pdf:read:live` + `job:details` |

---

## RSS & official feeds

| Command | When to use |
|---------|-------------|
| `npm run fetch:official:feeds` | Fetch RSS + portal notices |
| `npm run fetch:official:feeds -- --rss-only` | RSS only (faster) |
| `npm run build:official-archives` | Build archive pages after fetch |

---

## `npm run everything` — what it runs

Full CI-like check before a PR or deploy:

```bash
npm run everything
```

| Step | Command | What it checks |
|------|---------|----------------|
| 1 | `check:frontend` | No `.js` React files under `frontend/src/` |
| 2 | `type-check` | TypeScript compiles |
| 3 | `lint` | ESLint |
| 4 | `test` | Frontend + backend unit tests |
| 5 | `build` | Production frontend build |
| 6 | `env:check` | Frontend/backend Supabase project ref match |
| 7 | `supabase:test` | Frontend can reach Supabase REST |
| 8 | `supabase:audit` | Table row counts |
| 9 | `db:test` | Backend connects to Postgres |
| 10 | `jobs:audit` | Job data quality |
| 11 | `verify` | Full stack smoke test |

**CI also runs** `npm run test:e2e` (Playwright) on every push and PR — critical path: home → job detail → apply link.

E2E uses `frontend/dist-e2e/` (not `dist/`) so a running production preview does not block the build. The test webserver frees port **4321** automatically if a stale preview is still listening.

**Lighter PR check:**

```bash
npm run check:frontend && npm run type-check && npm run test && npm run build
```

---

## Verify & health checks

| Command | What it does |
|---------|--------------|
| `npm run verify` | Quick 11-point stack smoke test |
| `npm run env:check` | Supabase ref alignment |
| `npm run db:test` | Backend → Postgres |
| `npm run supabase:test` | Frontend → Supabase REST |
| `npm run supabase:audit` | Table row counts |
| `npm run jobs:audit` | Job quality report |
| `npm run go-live:check` | Production readiness |

---

## Database & env

| Command | What it does |
|---------|--------------|
| `npm run db:migrate` | Apply schema + migrations |
| `npm run setup:supabase-env` | Align frontend + backend env files |
| `npm run admin:key:generate` | Generate `ADMIN_API_KEY` |

---

## Deploy

| Command | What it does |
|---------|--------------|
| `npm run vercel:link` | Link to Vercel project |
| `npm run vercel:env:push` | Push env from `.env.local` |
| `npm run vercel:deploy` | Deploy to production |
| `npm run build:sitemap` | Generate sitemap.xml |
| `npm run deploy:verify` | Check production deploy |

Production needs: `VITE_JOBS_SOURCE=supabase` on Vercel.

---

## Data cleanup (run rarely)

| Command | What it does |
|---------|--------------|
| `npm run data:scrub` | Remove aggregator jobs + export JSON |
| `npm run data:scrub-noise` | Preview noise title removal |
| `npm run clean:live-jobs` | Clean static JSON file |
| `npm run alerts:deliver` | Send job alerts (email / Telegram / WhatsApp / push) — see `docs/ALERTS_SETUP.md` |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Demo jobs only | Run `npm run daily:sync`; set `VITE_JOBS_SOURCE=supabase` |
| No PDF details | `npm run pdf:backfill` then `npm run pdf:read:live` |
| `db:test` fails | Fix `DATABASE_URL` in `backend/.env`; run `npm run db:migrate` |
| Empty RSS section | `npm run fetch:official:feeds` |
| Python module error | `.venv\Scripts\pip install -r backend/requirements.txt` |

---

## More detail

| Doc | Contents |
|-----|----------|
| `AGENTS.md` | Developer guide |
| `docs/INSTALLATION_AND_RUN.md` | Step-by-step setup |
| `docs/DAILY_8AM_SYNC.md` | Daily sync deep dive |
| `docs/GO_LIVE.md` | Production deployment checklist |

One-command full audit (copy-paste)

cd e:\mygovtjobs-main

npm run check:frontend
npm run type-check
npm run lint
npm run test --prefix frontend
npm run test:backend
npm run build
npm run env:check
npm run supabase:test
npm run supabase:audit
npm run db:test
npm run jobs:audit
npm run jobs:audit:detail-actions
npm run i18n:audit
npm run verify
npm run audit:official-sites:strict
npm run go-live:check
