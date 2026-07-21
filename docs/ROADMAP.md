# My Govt Jobs — Product Roadmap

**Site:** [govtjobs.me](https://www.livegovtjobs.com)  
**Last updated:** June 2026  
**Quality score:** ~94–96/100 (CI + audits passing; data purity ~87.5% recruitment-like in DB)

This roadmap covers what is **done**, what runs **daily**, and what to build **next** to become the top government jobs portal in India.

---

## Table of contents

1. [Current status](#current-status)
2. [Daily & weekly rhythm](#daily--weekly-rhythm)
3. [Phase 0 — Foundation](#phase-0--foundation)
4. [Phase 1 — Live data MVP](#phase-1--live-data-mvp)
5. [Phase 2 — Trust & quality](#phase-2--trust--quality)
6. [Phase 3 — Alerts product](#phase-3--alerts-product)
7. [Phase 4 — SEO & growth](#phase-4--seo--growth)
8. [Phase 5 — Monetization](#phase-5--monetization)
9. [Phase 6 — Scale](#phase-6--scale)
10. [90-day priorities](#90-day-priorities)
11. [Key file map](#key-file-map)
12. [GitHub issues](#github-issues)

---

## Current status

| Area | Status | Notes |
|------|--------|-------|
| **Frontend on Vercel** | ✅ Live | `livegovtjobs.com`, auto-deploy on `main` push |
| **Supabase Postgres** | ✅ Live | ~2,800+ live jobs, ~3,000+ total (Jul 2026) |
| **Daily GitHub ingest** | ✅ 8 AM IST | `supabase-auto-ingest.yml` (360m cap, SYNC_CONCURRENCY=8, 4h scrape budget → always commits a fresh snapshot) |
| **Sync freshness** | ✅ | `daily-sync-state.json` completed 2026-07-20 |
| **Weekly PDF enrich** | ✅ Sunday | `weekly-enrich.yml` → `weekly:enrich:ci` |
| **Dynamic sitemap** | ✅ | Rebuilt with snapshot export |
| **Job detail pages** | ✅ | Slug routing, Supabase fetch, structured PDF sections |
| **Google Analytics 4** | ✅ | `VITE_GA_MEASUREMENT_ID` on Vercel |
| **Vercel Analytics** | ✅ | `@vercel/analytics` in `main.tsx` |
| **Google Search Console** | 🟡 Setup | See [HUMAN_CHECKLIST.md](./HUMAN_CHECKLIST.md) |
| **i18n (22+ languages)** | ✅ | UI chrome translated; job body English |
| **E2E + unit tests** | ✅ | Frontend + backend unit suite |
| **Job quality audit** | ✅ Strict pass | 0% blocked hosts |
| **Backend API on cloud** | 🟡 Optional | DNS for `api.livegovtjobs.com` not set — browse uses Supabase/static |
| **Email/Telegram alerts** | 🟡 Partial | Subscribe API + worker; needs Resend secrets |
| **Monetization** | ⬜ Not started | Freemium, sponsored listings |
| **Code clarity cleanup** | ✅ Jul 2026 | COMPONENTS.md, fallbacks, jobDetailUi split, browse nav split, scripts/archive |

**Manual leftover items:** [HUMAN_CHECKLIST.md](./HUMAN_CHECKLIST.md)

---

## Daily & weekly rhythm

### Automatic (no manual work)

| Schedule | Task | Workflow / system |
|----------|------|-------------------|
| **Daily 8:00 AM IST** | Scrape 100+ sources → Supabase → `live-jobs.json` → sitemap → commit | `supabase-auto-ingest.yml` |
| **Daily** | Vercel redeploy on `main` push | Vercel |
| **Sunday 8:30 AM IST** | PDF enrich (Agent 2+3, 50 jobs) | `weekly-enrich.yml` → `weekly:enrich:ci` |
| **Weekly** | Portal health audit | `weekly-portal-audit.yml` |
| **On PR** | Lint, test, build | `ci.yml` |

### Your manual checklist

| Frequency | Action |
|-----------|--------|
| **Daily (2 min)** | Open govtjobs.me · check GitHub Actions green · spot-check 2 job details |
| **Weekly (10 min)** | `npm run jobs:audit:strict` · `npm run test` · `npm run go-live:check` |
| **After code change** | `npm run lint && npm run test && npm run build` → `git push origin main` |
| **If ingest fails** | Re-run workflow or `npm run daily:sync` locally |

Full ops guide: **[README.md](../README.md)**

---

## Phase 0 — Foundation

**Goal:** Repo runs locally; database exists; first jobs ingested.

| ID | Task | Status | Done when |
|----|------|--------|-----------|
| 0.1 | Apply `database/supabase_setup.sql` + migrations | ✅ | `npm run db:migrate` succeeds |
| 0.2 | `backend/.env` + pooler `DATABASE_URL` | ✅ | `npm run db:test` OK |
| 0.3 | `frontend/.env.local` (anon key only) | ✅ | `npm run env:check` OK |
| 0.4 | First ingest | ✅ | 600+ jobs in Supabase |
| 0.5 | Python venv + `requirements.txt` | ✅ | `npm run api:dev` starts |
| 0.6 | README + roadmap docs | ✅ | This file + README |
| 0.7 | Vercel linked + env pushed | ✅ | `vercel:env:push:live` |
| 0.8 | GitHub Actions secrets | ✅ | Daily ingest runs green |

---

## Phase 1 — Live data MVP

**Goal:** Homepage always shows fresh official jobs; detail pages trustworthy.

| ID | Task | Status | Done when |
|----|------|--------|-----------|
| 1.1 | Scheduled daily ingest (GitHub) | ✅ | `supabase-auto-ingest.yml` green daily |
| 1.2 | Unified job load chain (static → Supabase) | ✅ | `useLiveJobs.ts` + `VITE_JOBS_SOURCE` |
| 1.3 | 100+ official sources in registry | ✅ | `scripts/scraper_registry.json` |
| 1.4 | State PSC + national board coverage | 🟡 | 138 sources; expand weak states |
| 1.5 | `live-jobs.json` + sitemap export | ✅ | Committed daily by CI |
| 1.6 | Portal noise filter (UI) | ✅ | `jobNoiseFilter.ts` |
| 1.7 | Job detail slug race fix | ✅ | `JobDetailPage.tsx` slug guard |
| 1.8 | Job card stale data fix | ✅ | `JobCard` memo compares deadlines |
| 1.9 | Detail loading skeleton | ✅ | Wait for full Supabase fetch |
| 1.10 | **Exit:** ≥500 live jobs, &lt;24h refresh | ✅ | ~695 live jobs |
| 1.11 | DB scrub for non-recruitment rows | ✅ | `data:scrub-noise:apply` — 0 marked 2026-06-16 |
| 1.12 | Backfill `job_posts` / `job_dates` | ✅ | `sync:job-children` — 763/1221 with sections |

### Phase 1 — remaining

| ID | Task | Priority | Effort |
|----|------|----------|--------|
| 1.13 | Enable more state PSC scrapers (batch 2) | P2 | Edit `scraper_registry.json` |
| 1.14 | Deploy backend API to Railway/Render (optional admin) | P3 | See `docs/GO_LIVE.md` Step 3 |

---

## Phase 2 — Trust & quality

**Goal:** Users trust every job card and PDF link; admins can monitor health.

| ID | Task | Status | Done when |
|----|------|--------|-----------|
| 2.1 | Strict job quality audit in CI | ✅ | `jobs:audit:strict` in daily workflow |
| 2.2 | Detail action audit (588 jobs) | ✅ | 0% generic homepage apply |
| 2.3 | Block aggregator PDF hosts | ✅ | `officialDomains.ts` |
| 2.4 | Structured PDF sections in UI | ✅ | `jobDetailStructured.ts` |
| 2.5 | Admin dashboard (`/admin`) | ✅ | Stats + source health (needs API URL) |
| 2.5b | Account + alert management | ✅ | `/account` magic link + alerts panel |
| 2.6 | Account page + Supabase Auth | ✅ | `/account` magic link |
| 2.7 | Prerender 1000 job pages (SEO) | ✅ | `prerender-job-pages.mjs` |
| 2.8 | ESLint + 139 unit tests | ✅ | `npm run lint` + `npm run test` |

### Phase 2 — remaining

| ID | Task | Priority | Effort |
|----|------|----------|--------|
| 2.9 | `title_fingerprint` dedupe (near-duplicate titles) | P2 | DB migration + ingest |
| 2.10 | Expired jobs auto-hide after N days | P2 | `jobFilters.ts` + cron |
| 2.11 | Full-text search (`search_vector` migration 006) | P2 | API + search UI |
| 2.12 | Sentry error tracking (frontend + backend) | P3 | Sentry DSN env vars |
| 2.13 | Ingest metrics dashboard (per-source success rate) | P3 | Admin UI enhancement |

---

## Phase 3 — Alerts product

**Goal:** Users subscribe by state/category; get email when matching jobs appear.

| ID | Task | Status | Done when |
|----|------|--------|-----------|
| 3.1 | Subscribe API + DB table | ✅ | `POST /api/alerts/subscribe` |
| 3.2 | Alert delivery worker | ✅ | `run-alert-delivery.py` in daily CI |
| 3.3 | Frontend subscribe UI | ✅ | `AlertSection.tsx` |
| 3.4 | Email via Resend | 🟡 | Set secrets — see `docs/ALERTS_SETUP.md` |
| 3.5 | Telegram bot | 🟡 | Numeric chat ID + `TELEGRAM_BOT_TOKEN` |
| 3.6 | Web push | 🟡 | `PUSH_WEBHOOK_URL` + device token / VAPID |
| 3.7 | Unsubscribe + preference management | ✅ | `/account` alerts tab + `POST /api/alerts/unsubscribe` |

### Phase 3 — next steps

1. Add `RESEND_API_KEY` and `ALERT_FROM_EMAIL` to GitHub secrets  
2. Test: subscribe on govtjobs.me → wait for daily ingest → check inbox  
3. Add Telegram channel for instant alerts (optional)

---

## Phase 4 — SEO & growth

**Goal:** Rank on Google for "government jobs", state-wise queries, exam names.

| ID | Task | Status | Done when |
|----|------|--------|-----------|
| 4.1 | Dynamic sitemap (all job slugs) | ✅ | `/sitemap.xml` 1600+ URLs |
| 4.2 | Job detail SEO (`applyJobSeo`) | ✅ | Title + meta per job |
| 4.3 | Google Analytics 4 | ✅ | `VITE_GA_MEASUREMENT_ID` |
| 4.4 | Vercel Web Analytics | ✅ | Dashboard in Vercel |
| 4.5 | Google Search Console verification | 🟡 | `VITE_GOOGLE_SITE_VERIFICATION` set |
| 4.6 | Submit sitemap to GSC | 🟡 | Manual one-time |
| 4.7 | Browse SEO (`browseSeo.ts`) | ✅ | State/category page titles |
| 4.8 | Core Web Vitals | 🟡 | Speed Insights enabled; monitor scores |

### Phase 4 — next steps

| Action | Command / URL |
|--------|---------------|
| Submit sitemap | [Google Search Console](https://search.google.com/search-console) → Sitemaps → `https://www.livegovtjobs.com/sitemap.xml` |
| Request indexing for homepage | GSC → URL Inspection → govtjobs.me |
| Monitor GA4 | analytics.google.com → realtime after deploy |
| Check Lighthouse | Vercel → Speed Insights |

---

## Phase 5 — Monetization

**Goal:** Sustainable revenue without hurting trust (official sources only).

| ID | Task | Status | Notes |
|----|------|--------|-------|
| 5.1 | Freemium alert tiers (daily digest vs instant) | 🟡 | `profiles.subscription_tier` in migration 011 |
| 5.2 | Razorpay / Stripe subscription | ⬜ | India-focused payments |
| 5.3 | Sponsored "featured" listings (official only) | 🟡 | `jobs.is_sponsored` + Featured badge on cards |
| 5.4 | Apply-link click analytics | ⬜ | GA4 events |
| 5.5 | Affiliate-free policy (no aggregator links) | ✅ | Already enforced |

---

## Phase 6 — Scale

**Goal:** 10,000+ jobs, sub-second search, 99.9% uptime.

| ID | Task | Status | Notes |
|----|------|--------|-------|
| 6.1 | Per-portal scraper overrides (top 10 states) | ⬜ | `backend/app/scrapers/` |
| 6.2 | Redis rate limiter (multi-instance API) | 🟡 | Code ready; needs `REDIS_URL` |
| 6.3 | Celery + Redis for long ingest | ⬜ | If GitHub 90min timeout hits |
| 6.4 | Supabase Storage for all job-detail JSON | 🟡 | Weekly upload partial |
| 6.5 | Edge caching for `live-jobs.json` | ⬜ | Vercel CDN headers |
| 6.6 | Mobile app (PWA already via vite-plugin-pwa) | 🟡 | PWA installed; no native app |
| 6.7 | Regional language job summaries (AI) | 🟡 | `jobContentTranslate.ts` — sections lists/tables |

---

## 90-day priorities

### Month 1 (now → July 2026)

| Week | Focus | Tasks |
|------|-------|-------|
| 1 | **Stability** | Daily ingest green 7/7 days; GSC sitemap submitted |
| 2 | **Data purity** | `data:scrub-noise:apply`; recruitment-like → 95%+ |
| 3 | **Alerts** | Resend secrets; test email delivery end-to-end |
| 4 | **SEO** | Monitor GSC impressions; fix top crawl errors |

### Month 2 (August 2026)

| Focus | Tasks |
|-------|-------|
| Search | Enable FTS (`006_jobs_search_vector.sql`); search bar uses API |
| Sources | Add 20 weak-state PSC scrapers |
| Admin | Deploy backend to Railway; wire `VITE_API_URL` on Vercel |

### Month 3 (September 2026)

| Focus | Tasks |
|-------|-------|
| Growth | State landing pages SEO content; share cards (OG images) |
| Product | Telegram alerts; unsubscribe flow |
| Quality | Sentry + ingest per-source dashboard |

---

## Quality score targets

| Metric | Current | Target (top tier) |
|--------|---------|-------------------|
| CI (lint + test + build) | 100% | 100% |
| Job detail action audit | 100% | 100% |
| Strict audit thresholds | Pass | Pass |
| Recruitment-like titles (DB) | 87.5% | **95%+** |
| Live jobs count | ~695 | **1000+** |
| PDF coverage | 79% | **90%+** |
| `content_sections` coverage | 67% | **80%+** |
| Lighthouse Performance | TBD | **90+** |
| GSC indexed pages | TBD | **80%+ of sitemap** |

---

## Key file map

| Area | Path |
|------|------|
| **Roadmap** | `docs/ROADMAP.md` (this file) |
| **Daily ops** | `README.md` |
| **Go live** | `docs/GO_LIVE.md` |
| **Daily ingest** | `docs/DAILY_8AM_SYNC.md` |
| **Deploy** | `docs/DEPLOY_VERCEL_SUPABASE.md` |
| **Components** | `docs/COMPONENTS.md` |
| **Schema** | `database/supabase_setup.sql`, `database/migrations/` |
| **Scrapers** | `scripts/scraper_registry.json`, `backend/app/scrapers/` |
| **Ingest agent** | `backend/app/agents/ingest_agent.py`, `scripts/run-daily-8am-sync.py` |
| **Daily CI** | `.github/workflows/supabase-auto-ingest.yml` |
| **Frontend jobs** | `frontend/src/hooks/useLiveJobs.ts` |
| **Job detail** | `frontend/src/pages/JobDetailPage.tsx` |
| **Noise filter** | `frontend/src/utils/jobNoiseFilter.ts` |
| **Quality audit** | `scripts/audit-job-quality.mjs` |
| **Vercel config** | `vercel.json` (repo root) |
| **GA4** | `frontend/src/lib/analytics.ts` |

---

## GitHub issues

35 tracked issues with labels `P0`–`P5`:

```powershell
$env:GITHUB_TOKEN = "ghp_..."
.\scripts\create-github-issues.ps1
```

Details: [docs/github-issues/README.md](./github-issues/README.md)

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done / live in production |
| 🟡 | Partially done or needs config |
| ⬜ | Not started |
| P1 | Do this month |
| P2 | Next month |
| P3 | Later |

---

*For day-to-day commands see [README.md](../README.md). For agent conventions see [AGENTS.md](../AGENTS.md).*
