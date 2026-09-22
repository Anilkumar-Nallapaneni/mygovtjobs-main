# LiveGovtJobs — Traffic & Revenue Implementation Plan

## What this update changes

This package deliberately does **not** delete working product features. The immediate bottleneck is content coverage/distribution, not another UI rewrite.

Implemented in this update:

1. `npm run growth:audit` — a repeatable local audit that reports live-job inventory, verification/publishing coverage, required dates/URLs, active/archive sitemap counts and the highest-priority growth gaps.
2. `frontend/.env.example` now documents `VITE_ADSENSE_CLIENT`, because `AdSlot.tsx` renders nothing when this variable is absent.
3. This implementation guide documents the operating procedure so growth work is measurable instead of ad-hoc.

Deleted in this update: **nothing**. Existing scrapers, API, alerts, PWA, SEO, JobPosting schema, sitemaps, results, exams and admin functionality are retained.

## What the repository already has

The project already contains a substantial foundation: official-source fetchers, ingestion/sync pipelines, PDF reader/detail agents, QA/watchdog agents, Supabase/API support, job detail pages, JobPosting SEO, alerts, sitemap generation, analytics hooks and AdSense rendering.

The committed `frontend/public/data/live-jobs.json` currently contains only 35 jobs. That is the central scale problem visible in this package. A mature government-jobs publisher needs a continuous pipeline and a much larger useful archive.

## P0 — Do this first

### 1. Configure environment variables

Create `frontend/.env.local` from `frontend/.env.example`. Configure the real production values in Vercel as well. Never commit private service keys.

Required for measurement/monetization when applicable:

- `VITE_SITE_URL=https://www.livegovtjobs.com`
- `VITE_GA_MEASUREMENT_ID`
- `VITE_GOOGLE_SITE_VERIFICATION`
- `VITE_ADSENSE_CLIENT` after AdSense approval
- Supabase/API values used by the selected production data path
- social URLs for channels you actually operate

### 2. Run the baseline audit

```bash
npm install
npm run growth:audit
npm run jobs:audit:strict
npm run build:sitemap
npm run build
```

Record the output before changing data. The goal is to improve the numbers weekly.

### 3. Run the publishing pipeline every day

Start with:

```bash
npm run pipeline:daily
npm run jobs:audit:strict
npm run build:sitemap
npm run growth:audit
```

Do not publish scraped rows blindly. Official source, recruitment type, dates, qualification, vacancy information, apply/notification URL and verification status should pass the existing publication gates.

### 4. Increase useful inventory

Milestones:

- 300+ verified live recruitment pages
- 20–50 verified new/updated items per day when official notices support that volume
- 500+ useful archived recruitment pages, then 1,000+
- preserve expired pages that still have historical/search value

Do not manufacture thin pages just to hit a URL target.

## P1 — Search acquisition

### Sitemap

`scripts/build-sitemap.mjs` already separates active and archived recruitment URLs. Run it after every publication batch. Investigate data/publish-gate failures when `jobs-archive.xml` remains empty; do not solve that by weakening verification rules.

### Job detail quality

Every important page should expose, where the official notice provides it:

- organization and advertisement number
- vacancy count/post breakup
- start and closing dates
- fee and age/relaxation
- qualification
- salary/pay scale
- selection process
- application procedure
- official notification
- official application URL
- source/update timestamp
- related jobs
- useful FAQ derived from verified notice data

### Structured data

Keep the existing JobPosting implementation aligned with the visible page. Expired jobs must not appear as currently open. Validate representative pages in Google's Rich Results Test and monitor Search Console enhancement reports.

### Internal-link hubs

Prioritize existing state, qualification, profession, organization, exam and result routes. Each hub should contain useful explanatory copy plus real matching records, not empty/near-duplicate shells.

## P2 — Distribution

A new verified job should trigger a distribution checklist:

1. publish page
2. rebuild sitemap
3. confirm page is crawlable/canonical
4. post concise alert to the real Telegram channel
5. post to the real WhatsApp channel/community where permitted
6. publish social post/short for high-demand notifications
7. send matching subscriber alerts through the existing alert system
8. track source/medium and conversions in analytics

Never buy bot traffic or incentivized ad clicks.

## P3 — Retention

Make alerts a first-class conversion goal. Let users subscribe by useful dimensions such as state, qualification, organization/category and profession. Measure:

- alert signup conversion rate
- returning-user rate
- subscribers by channel
- click-through from alerts to job detail
- unsubscribe/failure rate

## P4 — Monetization

AdSense is not a traffic strategy. First verify that the domain/account is approved and that production has the real client/ad-unit configuration. `AdSlot.tsx` intentionally renders nothing without `VITE_ADSENSE_CLIENT`.

Track revenue with traffic quality metrics: pageviews, ad impressions, viewability, RPM, organic sessions and returning users. Add placements carefully; do not damage job-reading/apply usability.

Later revenue options can include relevant exam-preparation affiliates, direct education advertising, mock tests and premium convenience features, while keeping public recruitment information and official links transparent.

## 90-day operating cadence

### Daily

- discover official notices
- ingest/parse
- human/automated QA using existing gates
- publish verified updates
- rebuild sitemap
- distribute alerts
- review errors and broken official links

### Weekly

- run `npm run growth:audit`
- inspect Search Console queries/pages
- improve pages already earning impressions
- inspect indexing exclusions
- review GA acquisition and returning users
- review alert growth
- review AdSense only after meaningful traffic exists

### Monthly

- compare organic clicks, indexed useful pages, live inventory, archive inventory, subscribers and revenue against the previous month
- remove/merge genuinely useless duplicate/thin content only after confirming canonical/indexing implications

## Targets

Use these as operational milestones, not guarantees:

- Stage 1: 300+ verified active jobs and 500+ useful archive pages
- Stage 2: 1,000+ useful indexable URLs and consistent daily distribution
- Stage 3: 1,000 organic visits/day with measurable subscriber conversion
- Stage 4: 5,000+ visits/day and diversified monetization tests

Traffic and earnings are not guaranteed by URL count. Search demand, accuracy, authority, competition, CTR, retention and ad market conditions determine results.

## Files changed by this package

- `package.json` — added `growth:audit` command.
- `scripts/growth-audit.mjs` — new growth/SEO inventory audit.
- `frontend/.env.example` — documented AdSense client variable.
- `docs/GROWTH_IMPLEMENTATION_2026-09.md` — this guide.

No existing application file was removed.
