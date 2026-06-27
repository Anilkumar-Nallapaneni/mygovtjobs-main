# Roadmap checklist (offline)

Use this if you cannot run `create-github-issues.ps1` yet. Check boxes as you complete work.

**Last updated:** 2026-06-16 — aligned with Phase 1 UI MVP (Weeks 1–3) + `docs/ROADMAP.md`.

## Phase 0 — Foundation

- [x] Run `database/supabase_setup.sql` in Supabase
- [x] `backend/.env` with `DATABASE_URL`, `ADMIN_API_KEY`
- [x] `frontend/.env.local` with `VITE_SUPABASE_*`, `VITE_API_URL`
- [x] `pip install -r backend/requirements.txt` + start API (`npm run api:dev`)
- [x] First ingest via daily sync / `supabase-auto-ingest.yml`
- [x] README / env examples reviewed

## Phase 1 — Week 1 (Data + trust)

- [x] Secrets: `MYGOVTJOBS_API_URL`, `ADMIN_API_KEY` on GitHub
- [x] Scheduled ingest (`supabase-auto-ingest.yml` — cloud daily; `ingest-api.yml` manual)
- [x] Unified live data path in `useLiveJobs.ts` (`VITE_JOBS_SOURCE`)
- [x] Enable RRB / DRDO / ISRO RSS (in scraper registry)
- [x] State PSC batch 1 (8 states)
- [ ] State PSC batch 2 (remaining weak states) — P2, see ROADMAP 1.13
- [x] Weekly portal audit in CI (`weekly-portal-audit.yml`, Sundays)
- [x] Scraper noise / validation tuning (`jobNoiseFilter.ts`, `data:scrub-noise`)
- [x] **≥50 live jobs on homepage** (~1,655 in DB; daily export to `live-jobs.json`)
- [x] Job detail slug race fix (`JobDetailPage.tsx`)
- [x] `CategoryGrid.tsx` + `HeadlineStatsBar.tsx` on home / latest page

## Phase 1 — Week 2 (Homepage grids)

- [x] `HomePage.tsx` discovery block
- [x] `HomeExamUpdatesRow.tsx` (admit card, results, answer key, syllabus rows)
- [x] `HomeBrowseStrips.tsx` (education + org browse)
- [x] `officialFilters.ts` for feed/archive topic filtering

## Phase 1 — Week 3 (Latest notifications filters)

- [x] `/jobs/latest-notifications` route (`AppRoutes.tsx`)
- [x] `LatestNotificationsPage.tsx` + `LatestNotificationsTable.tsx`
- [x] `browseRoutes.ts` — `parseLatestNotifQuery` / `buildLatestNotifQuery`
- [x] `latestNotificationsFilters.ts` — state / category / education / profession / expiring
- [x] Unit + E2E tests for latest-notifications filters

## Phase 1 — Data quality (ops)

- [x] DB noise scrub (`npm run data:scrub-noise:apply`) — 0 rows marked 2026-06-16
- [x] Backfill `job_posts` / `job_dates` (`npm run sync:job-children`)
- [ ] Deploy backend API to Railway/Render for admin (optional) — ROADMAP 1.14

## Phase 2 — Month 1 ops

- [ ] `title_fingerprint` dedupe
- [x] `sources` table sync
- [x] React admin dashboard (`/admin`)
- [x] PDF parser hardening
- [x] `job_posts` / `job_dates` backfill script
- [ ] Expired job lifecycle (auto-hide after N days)
- [x] Scheduler documented (`run-daily-8am-sync.py`, GitHub Actions)

## Phase 3 — Alerts

- [x] AlertSection → API
- [x] Delivery worker (`run-alert-delivery.py`)
- [ ] Email provider (needs `RESEND_API_KEY` + `ALERT_FROM_EMAIL`)
- [ ] Telegram bot (needs `TELEGRAM_BOT_TOKEN`)
- [ ] Web push (optional)
- [x] Filter UI (state / category / qualification on subscribe)

## Phase 4 — Monetization

- [ ] Freemium tiers
- [ ] Stripe/Razorpay
- [ ] Sponsored listings
- [ ] Apply-link analytics

## Phase 5 — Scale

- [ ] Per-portal overrides
- [ ] Celery (if needed)
- [ ] Full-text search
- [ ] Sentry + metrics
- [ ] Production hardening
