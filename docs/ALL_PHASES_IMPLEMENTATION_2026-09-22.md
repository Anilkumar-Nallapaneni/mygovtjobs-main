# LiveGovtJobs — All Phases Implementation

This package turns the existing repository into a controlled P0–P9 execution program. It intentionally reuses the project's tested ingestion, QA, enrichment, lifecycle, sitemap, i18n, alert and verification components rather than replacing them with a second stack.

## Safety rules
- Never fabricate vacancy counts, dates, qualifications or verification state.
- Never bulk-publish the review queue. The publication gate and watchdog remain mandatory.
- Keep `.env`, Supabase/Vercel secrets and production domains outside source control.
- Audit before apply. Do not deploy if validation/build fails.

## Commands
- `npm run phases:audit` — read-only/derived-output audit of P0–P9.
- `npm run p0:repair` — recover dates/PDF-derived fields/details, deterministic QA, safe promotion, watchdog, export and verify.
- `npm run p1:audit` / `npm run p1:apply` — official source/funnel health.
- `npm run p2:audit` / `npm run p2:apply` — rich job-detail coverage and enrichment.
- `npm run p3:apply` — recruitment lifecycle events and official archives.
- `npm run p4:apply` — organisation indexes, sitemap and growth audit.
- `npm run p5:apply` — locale generation/fill/audit. Official facts must remain source-faithful.
- `npm run p6:apply` — rebuild searchable public snapshots and verify job-detail routing.
- `npm run p7:apply` — deliver configured alerts only.
- `npm run p8:audit` — growth/performance audit.
- `npm run p9:audit` — monetization readiness; it does not invent AdSense credentials or revenue.
- `npm run phases:apply` — executes the above in sequence and finishes with validation/build. Use only after the audit is understood and environment variables are correct.

## Current P0 baseline (22 Sep 2026)
Audit supplied by the operator: review queue 1,223; jobs 3,732; draft 3,192; expired 506; live 34. Main blockers were missing/malformed deadline (1,093), completeness 45 (810), unverified (740), non-recruitment classification (511), and missing official notification PDF (366). The deterministic QA approved only one row and marked 2,878 as needing fixes. These numbers are a baseline, not hard-coded targets.

## P0
Recover evidence-backed dates and fields, enrich from official notification/detail content, run deterministic QA, promote only records passing the existing gate, watchdog the result, export and verify. Date parser coverage was expanded for `application deadline` and `online registration closes` wording.

## P1
Audit official-site reliability and source funnel. Keep independent source health visible. Fix individual source adapters when a priority source is blocked, timed out, 404, or parser-broken; do not mark an HTTP failure as healthy merely because a fallback returned links.

## P2
Enrich job details and child records. Target complete, source-backed dates, qualification, vacancies, age/pay/fees where present, application links and official notification references. Missing facts remain missing rather than generated.

## P3
Populate lifecycle events and build archives for results, admit cards, answer keys, cutoffs, syllabus, previous papers, interviews and related notices. Expired recruitment may remain as useful archive content but must not masquerade as an active JobPosting.

## P4
Generate organisation/state/category/qualification discovery surfaces only when they contain useful content. Rebuild sitemap after data changes. Avoid thin/empty SEO pages.

## P5
The repository already contains English/Hindi plus many Indian-language locale overrides. Run generation/fill/audit before exposing incomplete locales. UI/explanatory translations may be localized; official organisation names, advertisement numbers, dates, vacancy facts and source URLs must remain faithful to the official notice.

## P6
Use the existing search/filter utilities and compact live-job snapshots. Eligibility features must be presented as assistance, not a replacement for official eligibility rules.

## P7
Use the existing alert subsystem for opted-in subscribers. Do not spam or scrape private contact lists.

## P8
Measure indexable inventory, source health, search visibility, job-detail engagement, official-apply clicks, subscriptions and returning users. Performance budgets remain part of the release gate.

## P9
Monetization is a readiness layer, not a data shortcut. Ad components and configuration are audited, but production publisher IDs and approvals remain external configuration. Never buy invalid traffic or fabricate engagement.

## Release sequence
1. Back up database and current production deployment.
2. `npm install` (and `npm install --prefix frontend` if required by your setup).
3. Preserve/restore your existing `.env` values; this ZIP intentionally does not create secrets.
4. `npm run phases:audit`.
5. Inspect reports in `docs/audits/` and `scripts/*report*.json`.
6. Run phases individually, starting with `npm run p0:repair`; do not jump directly to `phases:apply` on production data.
7. After each phase, compare live count, rejected/needs-fix counts and source health. More rows is not success if quality falls.
8. `npm run validate` and `npm run build`.
9. Preview deploy first. Verify pages, job links, sitemap, robots, structured data and analytics.
10. Production deploy only after preview verification.

## What this package does not claim
It does not guarantee 300 live jobs, 2,000 indexed URLs, all-state active vacancies, Search Console indexing, AdSense approval, or revenue. Those depend on current official vacancies, source availability, production credentials, search engines and user demand. The code keeps those goals measurable without fabricating data.
