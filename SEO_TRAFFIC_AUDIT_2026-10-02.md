# LiveGovtJobs production SEO/traffic audit — 2026-10-02

## Verified live findings

A live crawl of https://www.livegovtjobs.com/ currently exposes a small live catalogue on the homepage (the crawler saw 404 vacancies / 16 notifications / 12 organisations), while older indexed job/state pages still expose a 4,490+ vacancy shell. This is a freshness/consistency problem: different pages are advertising materially different catalogue snapshots.

The homepage also contains the phrase `Official .gov.in listings — loading live catalog…`, which indicates that the catalogue is hydrated after the initial shell. Search engines can index the resulting job cards, but relying on client hydration for the primary catalogue makes crawl consistency harder than serving a stable server-generated snapshot.

The current repository snapshot used for the frontend contains only 15 live jobs in `frontend/public/data/live-jobs.json`. The checked-in active sitemap also contains only 15 job URLs, while the archive sitemap is empty. This is a major indexation bottleneck.

## Root causes to fix first

1. **Public snapshot is too small/stale** — rebuild from Supabase at deploy time and use the service-role key only in build/CI, never in browser code.
2. **Sitemap under-reports the site** — include education/career/admission/scholarship/yojana pages and all verified active/archive job URLs returned by the database.
3. **Homepage and older pages show inconsistent counts** — publish one snapshot/version and invalidate CDN/Vercel cache after a data refresh.
4. **Archive sitemap is empty** — verified expired jobs should be discoverable only if their pages have substantial unique value; otherwise keep them out and use canonical/410 handling.
5. **Thin landing pages** — qualification/state/org pages need unique summaries, current counts, useful filters, FAQ/schema where appropriate, and internal links.
6. **New-domain authority** — search visibility will not appear immediately. Build genuine backlinks/mentions from relevant communities, social channels, Telegram, and useful original resources. Do not buy spam links.
7. **Search Console is mandatory** — verify the domain, submit the sitemap index, inspect representative URLs, and monitor Crawled/Indexed, Excluded, duplicate/canonical and Core Web Vitals reports.

## What this package changes

- Sitemap generation now accepts `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` in build/CI, with safe fallback to the public snapshot.
- The sitemap includes the education/career/admission/scholarship/yojana surfaces.
- `robots.txt` points to the sitemap index rather than the childless alias.
- A production audit/runbook is included.

## Required production environment

For the deployment/build environment only:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SITE_URL=https://www.livegovtjobs.com`

Never expose `SUPABASE_SERVICE_ROLE_KEY` as a `VITE_*` variable.

## Post-deploy validation

1. Run the official data refresh.
2. Run the frontend build.
3. Confirm `public/data/live-jobs.json` has the expected current live count.
4. Confirm `public/sitemaps/jobs-active.xml` contains the same approved active set.
5. Confirm the sitemap index is reachable.
6. Submit `https://www.livegovtjobs.com/sitemap-index.xml` in Google Search Console.
7. Inspect the homepage, a state page, a qualification page and 5 representative job pages.
8. Confirm canonical URL, title, description, JSON-LD, status 200 and no accidental noindex.
9. Purge Vercel/CDN cache after a large data refresh.

## Traffic diagnosis

No public traffic estimator can prove your actual Google Search Console traffic. The live crawl does, however, establish that the site is currently presenting a very small current catalogue and inconsistent historical snapshots. Until that is corrected and Search Console shows healthy indexing, changing colours or adding more UI will not solve the traffic problem.
