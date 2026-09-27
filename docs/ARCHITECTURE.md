# Architecture

## Production (Vercel + Supabase)

```
User browser
    │
    ▼
Vercel CDN (frontend/dist)
    │  Homepage catalog: always /data/live-jobs.json
    │  VITE_JOBS_SOURCE → detail/search fallbacks only
    ├─► Static live-jobs.json (CDN)
    ├─► Supabase REST (anon) ──► job detail / search when configured
    └─► Optional FastAPI (VITE_API_URL) ──► Postgres pooler
```

## Local development

```
Terminal 1: npm run api:dev     →  http://localhost:8000
Terminal 2: npm run dev         →  http://localhost:3689
                                      └─ /api/* proxied to :8000
```

## Ingest pipeline

```
scraper_registry.json (171 scrapers, 164 enabled)
    → RSS / HTML scrapers (backend/app/scrapers/)
    → NotificationParser + ValidationService + noise_filter
    → dedupe (content_hash)
    → JobPersistService → Postgres (jobs table)
    → export → frontend/public/data/live-jobs.json
```

Scheduled: GitHub Actions `.github/workflows/canonical-daily-pipeline.yml` (daily ~8:00 AM IST, cron `30 2 * * *`). The job runs only when the repository variable `ALLOW_CANONICAL_PIPELINE` is `true`. It calls `scripts/run_pipeline.py --mode daily` → `sync:production` (scrape, publish-gate promote, watchdog, export, sitemap, RSS). New scrapes stay draft while `AUTO_PUBLISH_VERIFIED=0`; only rows that already pass the gate are promoted. Legacy `supabase-auto-ingest.yml` was removed.

## Job visibility

| Status | Anon REST (RLS) | Backend API | UI |
|--------|-----------------|-------------|-----|
| `live` | ✓ | ✓ | Shown |
| `expired` | ✓ | ✓ | Shown with badge |
| `draft` | ✗ | ✗ (filtered) | Hidden |

Backend `JobService` applies an additional recruitment/noise filter before returning rows.

## Key env files

| File | Purpose |
|------|---------|
| `frontend/.env.local` | `VITE_SUPABASE_*`, `VITE_JOBS_SOURCE` |
| `backend/.env` | `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_API_KEY` |

Run `npm run env:check` to confirm both point at the same Supabase project ref.

## Related docs

- [INSTALLATION_AND_RUN.md](./INSTALLATION_AND_RUN.md) — setup
- [DEPLOY_VERCEL_SUPABASE.md](./DEPLOY_VERCEL_SUPABASE.md) — production
- [COMPONENTS.md](./COMPONENTS.md) — frontend file map
- [../AGENTS.md](../AGENTS.md) — agent/developer guide
