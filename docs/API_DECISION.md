# API decision — Week 2

**Decision (Aug 2026 recovery):** keep **Supabase + static snapshot** as the primary public path. Treat FastAPI (`api.livegovtjobs.com`) as **optional**, not required for browse/search/alerts MVP.

## What works without the API

| Feature | Path |
|---------|------|
| Job catalog | `/data/live-jobs.json` (homepage is always static/CDN; `VITE_JOBS_SOURCE` is for detail/search only) |
| Job detail | Static JSON fields + optional Supabase row |
| Client search/filter | Frontend over loaded catalog |
| Contact / report | Prefer Supabase table writes or mailto until API is healthy |

## What still needs FastAPI

| Feature | Why |
|---------|-----|
| Admin ingest / publish UI | `X-Admin-Key` routes |
| Server FTS (`useServerJobSearch`) | Postgres `search_vector` via `/api/jobs` |
| Alert subscription delivery hooks | Resend/Telegram orchestration in backend |
| Turnstile-protected contact forms | Fail-closed in production when secret unset |

## Operator rule

1. Leave `VITE_API_URL` **empty** on Vercel until `https://api.livegovtjobs.com/health` returns healthy with DB connected.
2. Deploy FastAPI (Railway/Render — see [DEPLOY_RAILWAY_RENDER.md](DEPLOY_RAILWAY_RENDER.md)) only after live catalog stays ≥50 for several days.
3. Until then, do not block catalog recovery or SEO work on API DNS.

## Revisit trigger

Reopen API deploy when: public live jobs ≥500 **or** alert/contact conversion requires server-side Turnstile + Resend E2E.
