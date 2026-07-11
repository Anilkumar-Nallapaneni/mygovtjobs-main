# Implementation backlog status

Last updated: June 2026. Tracks audit backlog vs repo state.

## P0 — This week

| Item | Status | Notes |
|------|--------|-------|
| `npm run db:migrate` (migrations 011–012) | **Manual** | Run with `backend/.env` pooler URL on production Supabase |
| Resend alert secrets | **Manual** | Add `RESEND_API_KEY`, `ALERT_FROM_EMAIL` to GitHub + Railway/Render |
| Submit GSC sitemap | **Manual** | [Search Console](https://search.google.com/search-console) → `https://www.livegovtjobs.com/sitemap.xml` |
| Expand `.gitignore` (Android) | **Done** | `.gradle/`, `*.aab`, `*.apk`, review screenshots |
| `npm run go-live:check` | **Manual** | Requires local `frontend/.env.local` + `backend/.env` |

## P1 — Month 1

| Item | Status | Notes |
|------|--------|-------|
| Full-text search (006 → API → UI) | **Done** | FTS in `job_service.py`; `useServerJobSearch` when `VITE_API_URL` set |
| Deploy backend + `VITE_API_URL` | **Manual** | `railway.toml` / `render.yaml` ready; see `docs/GO_LIVE.md` |
| Sentry (frontend + backend) | **Done** | Optional: `VITE_SENTRY_DSN`, `SENTRY_DSN` — no-op when unset |
| Scrub data → 95%+ recruitment | **Manual** | `npm run data:scrub-noise:apply` on production DB |
| Docs migrations 009–012 | **Done** | `AGENTS.md`, `DEPLOY_VERCEL_SUPABASE.md`, `database/README.md` |

## P2 — Month 2

| Item | Status | Notes |
|------|--------|-------|
| Weak-state PSC scrapers | **Done** | DSSSB Delhi, Ladakh recruitment, Puducherry PSC in `officialSites.ts` — run `npm run registry:generate` |
| `title_fingerprint` dedupe | **Done** | Migration `012`; set on ingest in `job_persist_service.py` |
| Expired jobs auto-hide (30d grace) | **Done** | `shouldHideFromBrowse()` in `jobFilters.ts` |
| Coverage in CI | **Done** | `npm run test:coverage` in `ci.yml` |
| Security headers | **Done** | Root `vercel.json` (HSTS, X-Frame-Options, CSP-adjacent) |
| Ingest metrics on admin | **Done** | Stale count + success rate on `/api/admin/dashboard` |

## P3 — Month 3+

| Item | Status | Notes |
|------|--------|-------|
| Razorpay monetization | **Started** | `/api/billing/*` + Account Premium panel — see `docs/RAZORPAY.md` |
| Redis rate limiting | **Partial** | Code ready; set `REDIS_URL` on API host |
| Regional AI summaries | **Partial** | `jobContentTranslate.ts` exists |
| OG share cards (browse) | **Done** | `og:image` + Twitter card in `browseSeo.ts`; job pages use `/og/job.svg` |
| Per-portal scraper overrides | **Not started** | ROADMAP 6.1 |
| `strict: true` in frontend TS | **Not started** | Incremental migration recommended |
| Sponsored badge UI | **Done** | `JobCard` + CSS + API field `is_sponsored` |

## Quick commands

```bash
npm run go-live:check
npm run env:check
npm run supabase:audit
npm run jobs:audit:strict
npm run db:migrate
npm run data:scrub-noise:apply   # production only, after dry-run
npm run registry:generate        # after officialSites.ts edits
```

## Manual-only checklist

1. **Alerts:** Subscribe on govtjobs.me → wait for daily ingest → verify inbox.
2. **Backend health:** `curl https://api.livegovtjobs.com/health` → `"database":{"connected":true}`.
3. **Vercel env:** `VITE_JOBS_SOURCE=supabase`, Supabase keys, optional `VITE_API_URL`, `VITE_SENTRY_DSN`.
4. **Play Store:** TWA built; keystore stays local only.
