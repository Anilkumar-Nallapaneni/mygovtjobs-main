# Google / Search Visibility Audit — 2026-10-06

## Observed production state

A public web crawl can see the homepage and some existing state/qualification/job URLs, but the search footprint is still sparse. The homepage currently exposes only a small live catalog in the crawl snapshot. This is materially smaller than established competitors.

## Primary problems

1. The site is still perceived primarily as a small government-job catalog rather than a useful India information destination.
2. The new `/india` hierarchy is not yet a mature indexed content set because verified district/city records have not been imported at production scale.
3. State pages can exist, but thin pages do not create useful search demand by themselves.
4. The production catalog is far smaller than large competitors; this limits long-tail query coverage.
5. Search engines need stable, internally linked, indexable URLs with unique useful content and consistent canonical metadata.
6. Sitemap submission alone does not create rankings; pages need real content and demand.

## Required SEO architecture

- `/india`
- `/india/{state}` for 36 public States/UTs
- `/india/{state}/district/{district}` for verified districts
- `/india/{state}/district/{district}/{category}` only when that category has verified records or substantial official content
- Existing `/state/{state}` job pages remain for compatibility
- Canonicalize duplicate routes carefully; do not create competing near-identical pages.

## Search Console actions

1. Verify the `www.livegovtjobs.com` property.
2. Submit `https://www.livegovtjobs.com/sitemap.xml`.
3. Inspect `/india`, several `/india/{state}`, and representative district URLs.
4. Request indexing for a small number of high-quality pages after content is populated.
5. Monitor Page indexing, Crawl stats, Core Web Vitals, and manual actions.
6. Do not mass-request indexing for thousands of thin pages.

## Content strategy

Build useful pages around actual demand:

- government jobs by state
- government jobs by district where verified location exists
- state-wise recruitment boards
- district government offices
- official education directories
- verified hospitals and healthcare institutions
- transport hubs
- tourism/heritage information
- government schemes
- exam/result/admit-card resources

Every page should answer a real query and cite/attribute the underlying official source.
