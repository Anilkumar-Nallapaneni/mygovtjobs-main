# SEO and indexability

The frontend owns metadata, canonical links, structured data, robots directives, and static rendering. Route components should provide canonical URLs and useful page titles; directory pages must not imply that unverified or unavailable records exist.

## Sitemap and robots

`npm run build` regenerates the sitemap index and child sitemaps from static pages, active jobs, and supported India routes. The production verification script checks `robots.txt`, `sitemap.xml`, the sitemap index, child sitemaps, and the live-job snapshot:

```powershell
npm run verify:production-seo
npm run build
npm run verify:production-seo
```

Only useful, canonical pages should be exposed for indexing. Empty data should not be turned into a large set of thin pages. JSON-LD is descriptive and must match visible, sourced content.

## Search Console

The build and local checks establish technical readiness only. Submit the production sitemap in Google Search Console and use its reports to determine crawl and indexing status; repository checks cannot prove that Google indexed a URL. Configure the site-verification token in the deployment environment, not as a fabricated claim of verification.
