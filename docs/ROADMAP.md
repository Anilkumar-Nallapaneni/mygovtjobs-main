# My Govt Jobs — Product Roadmap

**Site:** [livegovtjobs.com](https://www.livegovtjobs.com)  
**Last updated:** 27 July 2026 (full trust-boundary audit)
**Production readiness:** recovery required — code gates pass, but only four jobs meet the strict public standard

This roadmap covers what is **done**, what runs **daily**, what is **broken/pending**, and what to build **next**.

---

## Table of contents

1. [Audit snapshot (22 Jul 2026)](#audit-snapshot-22-jul-2026)
2. [Current status](#current-status)
3. [Daily & weekly rhythm](#daily--weekly-rhythm)
4. [What you need to do now](#what-you-need-to-do-now)
5. [Phase 0 — Foundation](#phase-0--foundation)
6. [Phase 1 — Live data MVP](#phase-1--live-data-mvp)
7. [Phase 2 — Trust & quality](#phase-2--trust--quality)
8. [Phase 3 — Alerts product](#phase-3--alerts-product)
9. [Phase 4 — SEO & growth](#phase-4--seo--growth)
10. [Phase 5 — Monetization](#phase-5--monetization)
11. [Phase 6 — Scale](#phase-6--scale)
12. [90-day priorities](#90-day-priorities)
13. [Key file map](#key-file-map)
14. [GitHub issues](#github-issues)

---

## Audit snapshot (27 Jul 2026)

### Verdict: **code healthy; production data incomplete**

| Check | Result | Notes |
|-------|--------|-------|
| Trust boundary | Pass | Shared sanitizer, India deadline gate, admin gate, export filter, snapshot checks, and RLS aligned |
| Public snapshot | Pass | 4 approved jobs; zero raw-HTML titles; zero missing/past live deadlines |
| Supabase | Pass with data warning | 3,181 total rows; 4 public live rows; 18 unsafe live rows demoted |
| Alert ownership | Pass | Caller-owned `user_id` removed; anon rows unowned; auth ownership uses `auth.uid()` |
| Frontend/backend tests | Pass | Full verification commands listed in the audit report |
| Production inventory | Failing target | 4 live jobs versus the current minimum target of 50 |

### Local vs production data (audit)

| Metric | Local / DB now | Target | Notes |
|--------|----------------|--------|-------|
| Public live jobs | **4** | 50 minimum, then 500+ | P0 ingest recovery |
| Invalid live deadlines | **0** | 0 | Gate enforced |
| Raw HTML titles | **0** | 0 | Sanitizer and snapshot check enforced |
| Public vacancies | **507 across 3 jobs** | Reliable per notice | Revalidated snapshot |
| Public API/archive rows | **4 / 0** | Deliberate | Unpublished archive rows are no longer exposed |
| `content_sections` (live) | Low | 80%+ | Enrichment remains P1 |

### Root causes to fix (engineering)

1. **Insufficient valid ingest output** — only four rows currently have verified recruitment classification, completeness, publication approval, and a current normalized deadline.
2. **Backend not deployed** — contact submission and backend alert actions remain unavailable at the configured production hostname.
3. **PDF detail coverage remains low** — expand enrichment after the active catalog is restored.

---

## Current status

| Area | Status | Notes |
|------|--------|-------|
| **Frontend on Vercel** | Live, data-limited | Browsing works; public snapshot contains four approved jobs |
| **Supabase Postgres** | Live | 3,181 total records; public RLS exposes four approved jobs |
| **Daily GitHub ingest** | Recovery required | Must produce deadline-bearing, verified records without weakening the gate |
| **Sync freshness** | Failing target | Strict production audit remains red below 50 live jobs |
| **4h RSS refresh** | ✅ | Green; but races with daily ingest archives |
| **Weekly PDF enrich** | 🟡 | Workflow exists; live section coverage collapsed — verify Sunday run |
| **Dynamic sitemap** | ✅ | Rebuilt with snapshot (local OK) |
| **Job detail pages** | ✅ | Slug routing + structured UI (data thin without PDF memory) |
| **Google Analytics 4** | ✅ | `VITE_GA_MEASUREMENT_ID` on Vercel |
| **Vercel Analytics** | ✅ | `@vercel/analytics` |
| **Google Search Console** | 🟡 | Verification done; **sitemap submit still manual** |
| **i18n (22+ languages)** | ✅ | UI chrome translated; job body English |
| **E2E + unit tests** | ✅ | 376 FE + 132 BE (+ 2 skipped); Playwright in CI |
| **Job quality audit** | Red on volume | Accuracy checks pass; live count is below the minimum |
| **Backend API on cloud** | 🟡 Optional | `api.livegovtjobs.com` down — browse uses Supabase/static |
| **Email/Telegram alerts** | Partial | Ownership is secured; deployed delivery and signed email unsubscribe still need verification |
| **Monetization** | ⬜ Not started | Freemium, Razorpay, sponsored listings |
| **Code clarity cleanup** | ✅ Jul 2026 | COMPONENTS.md, fallbacks, jobDetailUi split, scripts/archive |

**Manual leftover items:** [HUMAN_CHECKLIST.md](./HUMAN_CHECKLIST.md)

---

## Daily & weekly rhythm

### Automatic (no manual work)

| Schedule | Task | Workflow / system |
|----------|------|-------------------|
| **Daily 8:00 AM IST** | Scrape 100+ sources → Supabase → `live-jobs.json` → sitemap → commit | `supabase-auto-ingest.yml` → `sync:production` |
| **~Every 4 hours** | RSS + official archives | `fetch-official-feeds.yml` → `sync:quick` |
| **Daily** | Vercel redeploy on `main` push | Vercel (currently failing on bad snapshot) |
| **Sunday 8:30 AM IST** | PDF enrich (Agent 2+3, 50 jobs) | `weekly-enrich.yml` → `weekly:enrich:ci` |
| **Weekly** | Portal health audit | `weekly-portal-audit.yml` |
| **On PR** | Lint, test, build | `ci.yml` |

### Your manual checklist

| Frequency | Action |
|-----------|--------|
| **Daily (2 min)** | Open livegovtjobs.com · check GitHub Actions green · spot-check 2 job details · glance Vercel latest Ready |
| **Weekly (10 min)** | `npm run jobs:audit:strict` · `npm run test` · `npm run go-live:check` · `npm run health:website:full` |
| **After code change** | `npm run everything` (or lighter PR check) → push |
| **If ingest fails** | Re-run `supabase-auto-ingest` workflow **or** `npm run sync:production` locally |
| **If Vercel ERROR** | Confirm `live-jobs.json` has vacancies > 0; re-export + commit; avoid RSS commits deploying broken data |

Full ops guide: **[RUN.md](../RUN.md)** · **[README.md](../README.md)**

---

## What you need to do now

### P0 — unblock production (this week)

| # | Action | Who |
|---|--------|-----|
| 1 | Run and repair `sync:production` until at least 50 rows pass the strict publication gate | You / agent |
| 2 | Investigate source/date extraction for the 18 demoted records; approve only verified corrections | Agent |
| 3 | Deploy the FastAPI backend or equivalent serverless endpoints for contact and signed unsubscribe | You / agent |
| 4 | Restore PDF detail coverage after the live inventory is healthy | You / agent |

### P1 — human-only (dashboard)

| # | Action | Status |
|---|--------|--------|
| 1 | Submit sitemap in [Google Search Console](https://search.google.com/search-console) → `sitemap.xml` | ⏳ You |
| 2 | Enable Supabase **Leaked password protection** (Auth → Password security) | ⏳ You |

See [HUMAN_CHECKLIST.md](./HUMAN_CHECKLIST.md).

### P2 — product / roadmap (next)

| Item | Phase |
|------|-------|
| Raise recruitment-like purity toward 95% (`data:scrub-noise`) | 2 |
| Wire FTS search UI to `search_vector` | 2.11 |
| Test Resend alert delivery end-to-end (0 subs today) | 3 |
| Optional: Railway API + `api.livegovtjobs.com` DNS | 1.14 |
| Razorpay / freemium | 5 |

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
| 0.8 | GitHub Actions secrets | ✅ | Daily ingest runs (when push succeeds) |

---

## Phase 1 — Live data MVP

**Goal:** Homepage always shows fresh official jobs; detail pages trustworthy.

| ID | Task | Status | Done when |
|----|------|--------|-----------|
| 1.1 | Scheduled daily ingest (GitHub) | 🟡 | Green daily **and** snapshot committed to `main` |
| 1.2 | Unified job load chain (static → Supabase) | ✅ | `useLiveJobs.ts` + `VITE_JOBS_SOURCE` |
| 1.3 | 100+ official sources in registry | ✅ | `scripts/scraper_registry.json` (~163 sources in DB) |
| 1.4 | State PSC + national board coverage | 🟡 | Expand weak states |
| 1.5 | `live-jobs.json` + sitemap export | 🟡 | Local OK; prod deploy blocked until remote snapshot fixed |
| 1.6 | Portal noise filter (UI) | ✅ | `jobNoiseFilter.ts` |
| 1.7 | Job detail slug race fix | ✅ | `JobDetailPage.tsx` slug guard |
| 1.8 | Job card stale data fix | ✅ | `JobCard` memo compares deadlines |
| 1.9 | Detail loading skeleton | ✅ | Wait for full Supabase fetch |
| 1.10 | **Exit:** ≥500 live jobs, &lt;24h refresh | ✅ count / 🟡 freshness | ~2885 live; freshness flaky |
| 1.11 | DB scrub for non-recruitment rows | 🟡 | Re-run — purity dropped to 74.6% |
| 1.12 | Backfill `job_posts` / `job_dates` | 🟡 | Sparse vs job count; continue enrich |

### Phase 1 — remaining

| ID | Task | Priority | Effort |
|----|------|----------|--------|
| 1.13 | Enable more state PSC scrapers (batch 2) | P2 | Edit `scraper_registry.json` |
| 1.14 | Deploy backend API to Railway/Render (optional admin) | P3 | See `docs/GO_LIVE.md` Step 3 |
| 1.15 | **NEW:** Stop RSS/ingest archive push races + keep vacancy-valid snapshot on `main` | **P0** | Workflow + export |

---

## Phase 2 — Trust & quality

**Goal:** Users trust every job card and PDF link; admins can monitor health.

| ID | Task | Status | Done when |
|----|------|--------|-----------|
| 2.1 | Strict job quality audit in CI | ✅ | `jobs:audit:strict` in daily workflow |
| 2.2 | Detail action audit | ✅ | Generic homepage apply blocked |
| 2.3 | Block aggregator PDF hosts | ✅ | `officialDomains.ts` |
| 2.4 | Structured PDF sections in UI | ✅ code / 🔴 data | UI ready; live sections ≈ 0% |
| 2.5 | Admin dashboard (`/admin`) | ✅ | Stats + source health (needs API URL) |
| 2.5b | Account + alert management | ✅ | `/account` magic link + alerts panel |
| 2.6 | Account page + Supabase Auth | ✅ | `/account` magic link |
| 2.7 | Prerender job pages (SEO) | ✅ | `prerender-job-pages.mjs` (~3027 local) |
| 2.8 | ESLint + unit tests | ✅ | lint + 376 FE / 132 BE |

### Phase 2 — remaining

| ID | Task | Priority | Effort |
|----|------|----------|--------|
| 2.9 | `title_fingerprint` dedupe (near-duplicate titles) | P2 | Index exists unused — wire into ingest |
| 2.10 | Expired jobs auto-hide after N days | P2 | `jobFilters.ts` + cron |
| 2.11 | Full-text search (`search_vector` migration 006) | P2 | Index unused — wire API + search UI |
| 2.12 | Sentry error tracking (frontend + backend) | P3 | Sentry DSN env vars |
| 2.13 | Ingest metrics dashboard (per-source success rate) | P3 | Admin UI enhancement |
| 2.14 | **NEW:** Restore live `content_sections` ≥ 50% then 80% | **P1** | `weekly:enrich:ci` / `pdf:read:live` |

---

## Phase 3 — Alerts product

**Goal:** Users subscribe by state/category; get email when matching jobs appear.

| ID | Task | Status | Done when |
|----|------|--------|-----------|
| 3.1 | Subscribe API + DB table | ✅ | `POST /api/alerts/subscribe` + anon RLS fix |
| 3.2 | Alert delivery worker | ✅ | `run-alert-delivery.py` in daily CI |
| 3.3 | Frontend subscribe UI | ✅ | `AlertSection.tsx` + `/alerts` styles |
| 3.4 | Email via Resend | 🟡 | Secrets set; **0 subscriptions / 0 deliveries** — need E2E test |
| 3.5 | Telegram bot | 🟡 | Optional — not configured |
| 3.6 | Web push | 🟡 | `PUSH_WEBHOOK_URL` + device token / VAPID |
| 3.7 | Unsubscribe + preference management | ✅ | `/account` alerts tab |

### Phase 3 — next steps

1. Subscribe once on live site → confirm row in `alert_subscriptions`  
2. Wait for daily ingest / run `npm run alerts:deliver` → check inbox  
3. Add Telegram channel (optional)

---

## Phase 4 — SEO & growth

**Goal:** Rank on Google for "government jobs", state-wise queries, exam names.

| ID | Task | Status | Done when |
|----|------|--------|-----------|
| 4.1 | Dynamic sitemap (all job slugs) | ✅ | `/sitemap.xml` + jobs-1..4 chunks |
| 4.2 | Job detail SEO (`applyJobSeo`) | ✅ | Title + meta per job |
| 4.3 | Google Analytics 4 | ✅ | `VITE_GA_MEASUREMENT_ID` |
| 4.4 | Vercel Web Analytics | ✅ | Dashboard in Vercel |
| 4.5 | Google Search Console verification | ✅ | Meta tag live |
| 4.6 | Submit sitemap to GSC | 🟡 | Manual one-time — still pending |
| 4.7 | Browse SEO (`browseSeo.ts`) | ✅ | State/category page titles |
| 4.8 | Core Web Vitals | 🟡 | Speed Insights; monitor scores |
| 4.9 | OG image API (`api/og.js`) | ✅ | WHATWG URL parse fix shipped |

### Phase 4 — next steps

| Action | Command / URL |
|--------|---------------|
| Submit sitemap | [Google Search Console](https://search.google.com/search-console) → Sitemaps → `https://www.livegovtjobs.com/sitemap.xml` |
| Request indexing for homepage | GSC → URL Inspection |
| Monitor GA4 | analytics.google.com → realtime |
| Check Lighthouse | Vercel → Speed Insights |

---

## Phase 5 — Monetization

**Goal:** Sustainable revenue without hurting trust (official sources only).

| ID | Task | Status | Notes |
|----|------|--------|-------|
| 5.1 | Freemium alert tiers (daily digest vs instant) | 🟡 | `profiles.subscription_tier` in migration 011 |
| 5.2 | Razorpay / Stripe subscription | ⬜ | India-focused payments — see `docs/RAZORPAY.md` |
| 5.3 | Sponsored "featured" listings (official only) | 🟡 | `jobs.is_sponsored` + badge; index unused |
| 5.4 | Apply-link click analytics | ⬜ | GA4 events |
| 5.5 | Affiliate-free policy (no aggregator links) | ✅ | Already enforced |

---

## Phase 6 — Scale

**Goal:** 10,000+ jobs, sub-second search, 99.9% uptime.

| ID | Task | Status | Notes |
|----|------|--------|-------|
| 6.1 | Per-portal scraper overrides (top 10 states) | ⬜ | `backend/app/scrapers/` |
| 6.2 | Redis rate limiter (multi-instance API) | 🟡 | Code ready; needs `REDIS_URL` |
| 6.3 | Celery + Redis for long ingest | ⬜ | Budget/watchdog already mitigate CI hangs |
| 6.4 | Supabase Storage for all job-detail JSON | 🟡 | Weekly upload partial |
| 6.5 | Edge caching for `live-jobs.json` | ⬜ | Vercel CDN headers |
| 6.6 | Mobile app (PWA already via vite-plugin-pwa) | 🟡 | PWA installed; no native app |
| 6.7 | Regional language job summaries (AI) | 🟡 | `jobContentTranslate.ts` |

---

## 90-day priorities

### Month 1 (now → late July / early August 2026)

| Week | Focus | Tasks |
|------|-------|-------|
| **Now** | **Unblock prod** | Fix archive race; good `live-jobs.json` on `main`; Vercel Ready |
| 1 | **Stability** | Daily ingest green 7/7 with successful push; GSC sitemap submitted |
| 2 | **Detail quality** | Restore `content_sections` via enrich; recruitment-like → 85%+ |
| 3 | **Alerts** | One real subscribe + Resend delivery proof |
| 4 | **SEO** | Monitor GSC impressions; fix crawl errors |

### Month 2 (August 2026)

| Focus | Tasks |
|-------|-------|
| Search | Enable FTS in UI (`search_vector` already in DB) |
| Sources | Add weak-state PSC scrapers |
| Admin | Optional Railway API + `VITE_API_URL` |

### Month 3 (September 2026)

| Focus | Tasks |
|-------|-------|
| Growth | State landing SEO; OG share cards |
| Product | Telegram alerts |
| Quality | Sentry + per-source ingest dashboard |

---

## Quality score targets

| Metric | Current (22 Jul) | Target (top tier) |
|--------|-----------------|-------------------|
| CI (`everything`) | Code gates pass; data volume fails strict production audit | 100% |
| Vercel production deploy | Verify after merge | Ready daily |
| Strict audit thresholds | Fails live-count target | Pass |
| Recruitment-like public jobs | **100% of 4** | **98%+** |
| Live jobs count | **4** | **50 minimum, then 500+** |
| HTML titles / invalid live deadlines | **0 / 0** | **0 / 0** |
| `content_sections` coverage (live) | Low | **80%+** |
| Lighthouse Performance | TBD | **90+** |
| GSC indexed pages | TBD | **80%+ of sitemap** |

---

## Key file map

| Area | Path |
|------|------|
| **Roadmap** | `docs/ROADMAP.md` (this file) |
| **Daily ops** | `RUN.md`, `README.md` |
| **Human checklist** | `docs/HUMAN_CHECKLIST.md` |
| **Go live** | `docs/GO_LIVE.md` |
| **Daily ingest** | `docs/DAILY_8AM_SYNC.md` |
| **Deploy** | `docs/DEPLOY_VERCEL_SUPABASE.md` |
| **Health agent** | `.cursor/skills/website-health-agent/` · `npm run health:website` |
| **Schema** | `database/supabase_setup.sql`, `database/migrations/` |
| **Scrapers** | `scripts/scraper_registry.json`, `backend/app/scrapers/` |
| **Ingest agent** | `backend/app/agents/ingest_agent.py`, `scripts/run-sync-production.py` |
| **Daily CI** | `.github/workflows/supabase-auto-ingest.yml` |
| **RSS CI** | `.github/workflows/fetch-official-feeds.yml` |
| **Frontend jobs** | `frontend/src/hooks/useLiveJobs.ts` |
| **Job detail** | `frontend/src/pages/JobDetailPage.tsx` |
| **Quality audit** | `scripts/audit-job-quality.mjs` |
| **Vercel config** | `vercel.json` (repo root) |
| **GA4** | `frontend/src/lib/analytics.ts` |

---

## GitHub issues

Open issues: **0** (as of 22 Jul 2026). Historical tracker: [docs/github-issues/README.md](./github-issues/README.md)

Suggested issues to reopen / file from this audit:

- P0: Ingest vs RSS `official-archives` push conflict
- P0: Vercel build fails when snapshot has 0 vacancies
- P1: Restore live `content_sections` coverage
- P2: Recruitment-like purity back to 95%

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done / live in production |
| 🟡 | Partially done, flaky, or needs config |
| 🔴 / ⬜ | Broken / not started |
| P0 | Do now (blocks prod) |
| P1 | This week |
| P2 | Next month |
| P3 | Later |

---

*For day-to-day commands see [RUN.md](../RUN.md). For agent conventions see [AGENTS.md](../AGENTS.md).*
