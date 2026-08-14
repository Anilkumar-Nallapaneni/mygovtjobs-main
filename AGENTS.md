# Agent / developer guide — My Govt Jobs

Government job portal monorepo. Read this before editing code or running ingest.

**Simple run guide:** [RUN.md](RUN.md) — agents, daily commands, `npm run everything`.

## Stack

| Layer | Path | Port | Tech |
|-------|------|------|------|
| Frontend | `frontend/` | 3689 | Vite 7, React 18, TypeScript, i18next |
| Backend API | `backend/` | 8000 | FastAPI, SQLAlchemy async, asyncpg |
| Database | Supabase Postgres | — | RLS public read on `jobs`, `sources` |
| Deploy | repo root `vercel.json` | — | Static SPA + Supabase client |
| Ingest | `scripts/` | — | **Official gov.in scrapers** (primary) |
| PDF reader | `backend/app/agents/pdf_reader_agent.py` | — | Read & memorize official notification PDFs |
| Job detail | `backend/app/agents/job_detail_agent.py` | — | Publish detail UI (PDF > notification > listing) |
| QA Review (AI employee) | `backend/app/agents/qa_review_agent.py` | — | Verify vacancy/dates/PDF/state by bucket |
| Watchdog (AI employee) | `backend/app/agents/watchdog_agent.py` | — | Demote bad live jobs |
| AI Employees | `backend/app/agents/ai_employees.py` | — | QA → promote → watchdog |
| Website health | `scripts/website-health-agent.mjs` | — | Audit/fix code, Supabase, Vercel, GitHub, API, analytics |
| All Websites | `all websites/` | — | Discover official + unofficial govt job portals across India |

## Commands (repo root)

```bash
npm run dev              # frontend :3689
npm run api:dev          # backend :8000
npm run everything       # full CI-like check
npm run verify           # quick stack smoke test
npm run health:website   # Agent 4 — code/data/env audit (add :full for live site)
npm run health:website:full # + verify:production + Vercel + live probes
npm run export:live-jobs # DB → live-jobs.json (+ list/bootstrap via clean:live-jobs)
npm run env:check        # frontend/backend Supabase ref alignment
npm run db:migrate       # supabase_setup.sql + migrations 001–035
npm run supabase:audit   # table row counts via REST
npm run ingest:direct:quick   # test ~20 sources
npm run ingest:direct:quick   # 20 sources → DB + live-jobs.json
npm run sync:quick            # RSS + archives (~4 h CI)
npm run sync:production       # full daily ingest (GitHub Actions)
npm run verify:production       # env + DB + job quality audit
npm run daily:sync            # local Agent 1 scrape (same core as production)
npm run daily:sync:full       # daily sync + PDF enrich
npm run weekly:enrich:ci      # CI: pdf:read (50) + job:details (50)
npm run pdf:read              # PdfReaderAgent: read PDFs → DB + job-details JSON
npm run pdf:read:live         # all live jobs missing PDF memory
npm run pdf:backfill          # discover missing PDF URLs on notice pages
npm run job:details           # Agent 3: build job detail pages from PDF/notification
npm run pipeline:live         # Agent 2+3 (PDF read + detail publish)
npm run pipeline:live:full    # Agent 1+2+3 (daily sync + PDF + details)
npm run pipeline:live:employees # Agent 2+3 + AI employees dry-run
npm run ai:employees          # QA (state buckets) + promote + watchdog (dry-run)
npm run ai:employees:apply    # Write QA fixes, promote, export
npm run ai:review             # QA Review Agent only (dry-run)
npm run ai:watchdog           # Watchdog only (dry-run)
npm run websites:discover     # catalog all govt job websites → all websites/output/
```

## Conventions

- **Frontend:** TypeScript only under `frontend/src/` (no `.js`/`.jsx`). See `frontend/FRONTEND_STRUCTURE.md`.
- **Imports:** `@/` alias → `frontend/src/`.
- **Jobs data:** Homepage catalog is always `live-jobs.json` (static/CDN). `VITE_JOBS_SOURCE` still affects job detail / search fallbacks (`supabase` \| `api` \| `auto`).
- **Deadlines:** use `hooks/useNow.ts` in components (never `Date.now()` in render).
- **PDF links:** `utils/resolvePdfUrl.ts` + `utils/officialDomains.ts` — official hosts only (no non-official fallback).
- **Backend auth:** `X-Admin-Key` header for `/api/admin/*` and ingest routes. Admin UI off unless `VITE_ENABLE_ADMIN_UI=1`.
- **Secrets:** `service_role` only in `backend/.env`. Frontend uses `VITE_SUPABASE_ANON_KEY` only.

## Database

1. Run `database/supabase_setup.sql` in Supabase SQL Editor.
2. Run migrations in `database/migrations/` in order (001–035).
3. Backend connects via **Transaction pooler** (`postgresql+asyncpg://…:6543/…`).

## File map

```
frontend/src/
  App.tsx, main.tsx          # shell
  components/                # UI (layout, home, jobs, Maps)
  hooks/useLiveJobs.ts       # job loading
  hooks/useNow.ts            # deadline clock
  lib/jobsApi.ts, supabase.ts
  utils/                     # filters, adapters, PDF, structured detail
  types/job.ts               # shared job types
  i18n/                      # 22+ locales

backend/app/
  main.py                    # FastAPI app
  routes/                    # jobs, ingest, alerts, admin, health, meta
  services/                  # job, ingest, persist, validation
  scrapers/, parsers/, agents/

scripts/                     # ingest, audit, fetch, env helpers
database/                    # SQL setup + migrations
docs/                        # install, deploy, components
```

## PR checklist

```bash
npm run check:frontend && npm run type-check && npm run lint && npm run test && npm run build
```

## Do not

- Commit `.env` / `.env.local` (use `.env.example` templates).
- Put `service_role` in `VITE_*` env vars.
- Add `.js` React files under `frontend/src/`.
- Deploy using `frontend/vercel.json` — use **root** `vercel.json`.

## Cursor Cloud specific instructions

Deps are pre-installed by the startup update script (`npm install` for the root + `frontend` workspace, and a Python venv at `backend/.venv` from `backend/requirements.txt`). Standard commands live in the table above and in `docs/INSTALLATION_AND_RUN.md`.

- **`.env.example` templates** are at repo root, `frontend/`, and `backend/` — copy to `.env.local` / `.env` and fill secrets. None are needed to run the frontend on static data.
- **Frontend runs fully standalone on committed static data** — `frontend/public/data/live-jobs.json` (~1,600 real jobs). Set `frontend/.env.local` to `VITE_JOBS_SOURCE=static` (or rely on the `auto` default), then `npm run dev` (:3689). No Supabase or backend required to browse/search/view job details.
- **Backend boots without a database**, but DB-backed routes (`/api/jobs`, etc.) return `503` and `/health` reports `"degraded"` until `DATABASE_URL` (Supabase **transaction pooler**, port 6543) is set in `backend/.env`. Start it with `ALLOW_INSECURE_ADMIN=1 APP_ENV=development npm run api:dev`. The default `DATABASE_URL` points at `localhost:5432`, so logs show `ConnectionRefusedError` when no DB is configured — expected.
- Python scripts/tests run through `backend/.venv` via `scripts/run-python.mjs` (`npm run test:backend`, ingest, etc.). After changing `backend/requirements.txt`, reinstall into `backend/.venv` — `api:dev`'s `--reload` does not pick up new packages.
- `npm run lint` runs on every PR with `--max-warnings 0` (see `.github/workflows/ci.yml`). `npm run type-check`, frontend tests, backend tests, and `npm run build` should pass before push.
- Live-data features (fresh jobs, `supabase`/`api` job sources, alert persistence, ingest) require Supabase secrets: frontend `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`, backend `DATABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`/`ADMIN_API_KEY`.
