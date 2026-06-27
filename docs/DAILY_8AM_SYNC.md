# Daily 8:00 AM IST auto-update

Official India government job listings are refreshed **once per day at 8:00 AM IST** using the **IngestAgent** pipeline (scrapers + RSS + PDF enrich). After that run completes, the site shows the same data until the next morning.

## What runs

| Step | Action |
|------|--------|
| 1 | Sync `scripts/scraper_registry.json` → `sources` table |
| 2 | **IngestAgent** — all enabled official portals (UPSC, SSC, state PSC, banks, etc.) |
| 3 | `npm run fetch:official` + import JSON → DB |
| 4 | `npm run backfill:pdfs` |
| 5 | `npm run enrich:jobs` — parse PDFs → `content_sections` in DB |
| 6 | `npm run data:scrub` — remove aggregators, export `live-jobs.json` |
| 7 | `npm run weekly:enrich:ci` — PdfReaderAgent + JobDetailAgent (weekly CI) |

State file: `frontend/public/data/daily-sync-state.json`  
Snapshot: `frontend/public/data/live-jobs.json` (includes `dailySync` metadata)

## Run manually

From repo root (requires `backend/.env` with `DATABASE_URL`):

```bash
npm run setup:supabase-env # first time only; reads DATABASE_URL + VITE_SUPABASE_* from env/flags
npm run daily:sync          # fast daily run (parallel scrape, skips PDF enrich)
npm run daily:sync:full     # full pipeline incl. backfill:pdfs + enrich:jobs
npm run daily:sync:fast     # scrape + scrub only (fastest)
npm run pdf:read:live && npm run job:details   # after sync: PDF memory + detail UI
npm run weekly:enrich:ci                       # same as Sunday CI (50 jobs)
```

Force a second run the same day:

```bash
npm run daily:sync -- --force
```

## Windows Task Scheduler (your PC at 8 AM)

PowerShell **as Administrator**:

```powershell
cd E:\gov-job-alert-Govt-Jobs
.\scripts\schedule-daily-8am-windows.ps1
```

## GitHub Actions (production — recommended)

### Daily (fast, ~20–45 min)

Workflow: `.github/workflows/supabase-auto-ingest.yml`  
Cron: `30 2 * * *` (= 8:00 AM IST)

| Step | Time | What it does |
|------|------|----------------|
| Scrape 100 govt sources | 15–30 min | Parallel ingest → Supabase |
| Scrub + export | 2–5 min | `live-jobs.json` |
| Commit | <1 min | Only `live-jobs.json` + archives (not 1900 detail files) |

**Skipped in daily CI** (too slow): full `pdf:read:live` + `job:details` without limit — these take **hours**.

### Weekly (PDF + detail agents)

Workflow: `.github/workflows/weekly-enrich.yml`  
Sunday 8:30 AM IST — enriches newest 100 jobs in DB + runs `weekly:enrich:ci` (50 PDF reads + 50 detail publishes).

Job detail pages load from **Supabase first**; static JSON is a fallback.

### One-time setup (GitHub repo → Settings → Secrets and variables → Actions)

| Secret | Where to get it |
|--------|-----------------|
| `DATABASE_URL` | Supabase → Database → Connection string → **Transaction pooler** (port **6543**). Must use `aws-0-REGION.pooler.supabase.com` — **not** `db.PROJECT.supabase.co:6543` (fails on GitHub). |
| `VITE_SUPABASE_URL` | `https://YOUR_REF.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase → API → anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API → service_role key. Optional for the fast daily ingest; required for weekly PDF detail uploads / Supabase Storage. |
| `ADMIN_API_KEY` | Any random string (ingest lock) |

**Or** set `SUPABASE_PROJECT_REF` + `SUPABASE_DB_PASSWORD` + `SUPABASE_DB_REGION` instead of `DATABASE_URL`.

### Test it now

1. GitHub → **Actions** → **Supabase auto ingest** → **Run workflow**
2. Green check = jobs updated in Supabase + static JSON committed to repo
3. Red X = open the failed step; usually missing/wrong `DATABASE_URL`

Validate secrets locally:

```bash
node scripts/check-github-actions-secrets.mjs
```

### Self-hosted PC runner (optional, not recommended)

Only use if cloud workflow cannot reach your database. Workflow: `supabase-auto-ingest-self-hosted.yml` (manual trigger only).

- Install `actions-runner` **outside** this repo (e.g. `C:\actions-runner\mygovtjobs`)
- Do **not** put `actions-runner/` inside the project — it breaks git checkout
- Add `DATABASE_URL` as a GitHub secret (checkout folder has no `backend/.env`)
- Uses Windows PowerShell (`powershell`), not `pwsh`

## Frontend behaviour

Set in `frontend/.env.local`:

```env
VITE_DAILY_SYNC_ONLY=1
VITE_JOBS_SOURCE=supabase
```

- Loads jobs from the daily snapshot (cached, no intraday refresh)
- Shows “Updated daily · last sync … IST” on the home page
- API: `GET /api/meta/sync-status`

## Block extra ingests during the day

In `backend/.env`:

```env
DAILY_SYNC_ENFORCE_ONCE=1
```

Manual API ingest (`POST /api/ingest/run-all`) returns **409** if today’s sync already finished. Use `npm run daily:sync -- --force` to override.
