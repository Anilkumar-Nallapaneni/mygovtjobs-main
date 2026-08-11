# Stage 1 and 2 baseline — 2026-08-11

## Stage 1: release baseline

- Deployable asset hygiene: 66 JSON/XML files parsed successfully; repository merge-marker check passed.
- TypeScript: type-check and strict-slice checks passed.
- Lint: passed with zero warnings.
- Tests: 405 frontend tests and 219 backend tests passed; 1 backend test skipped.
- Sitemap: regenerated from the publication source and parsed successfully. Do not hand-merge generated sitemap or catalog files.
- Production build: passed, including route/bundle budgets and snapshot verification.
- Build-time public catalog: 13 publication-gated jobs. The database audit observed 16 published rows, so export freshness must remain a monitored release invariant.

Representative compressed bundle sizes from the baseline build:

| Asset | Gzip |
|---|---:|
| Application entry JavaScript | 58.61 KB |
| Supabase vendor JavaScript | 54.61 KB |
| Sentry vendor JavaScript | 123.45 KB |
| Admin route JavaScript | 33.62 KB |
| Main CSS | 12.89 KB |
| Polish CSS | 13.26 KB |
| Jobs CSS | 5.53 KB |

## Stage 2: priority-source baseline

The canonical 25-source growth list is `scripts/priority-sources.json`; its rolling target is 500 active publication-gated jobs. The machine-readable current report is `docs/audits/source-funnel-latest.json`.

Current database funnel:

- Stored jobs: 3,340
- Published jobs: 16
- Overall publication yield: 0.48%
- Highest-yield priority source: ISRO, 5 of 60 stored rows (8.33%)
- Priority sources with no attributed stored rows: Employment News, Army, Air Force, Coast Guard, FCI, MPSC, and WBPSC

Live validation runs:

| Source | Fetched | Saved | Rejected | Result |
|---|---:|---:|---:|---|
| SSC | 50 | 28 | 22 | Pipeline healthy; publication fields remain incomplete |
| UPSC | 39 | 3 | 36 | Pipeline completes; very low acceptance yield |
| Employment News | 0 | 0 | 0 | Broken: no rows saved |

Follow-up isolated runs after preserving HTML table-row context:

| Source | Fetched | Saved | Rejected |
|---|---:|---:|---:|
| ESIC | 40 | 14 | 26 |
| DRDO | 30 | 2 | 28 |
| UPPSC | 13 | 3 | 10 |
| IBPS | 24 | 12 | 12 |
| KVS | 50 | 1 | 49 |
| RBI | 19 | 0 | 19 |

The scraper now carries official table-row context into parsing, preserving dates, vacancy counts, and advertisement metadata that portals place outside hyperlink text. This improves ingestion quality without changing publication gates.

The dominant primary rejection reason is missing deadline extraction. Missing PDF, vacancy, and qualification data are the next source-specific blockers. These must be fixed in scraper/parser contracts; publication gates must not be weakened to inflate catalog size.

## Execution order from here

1. Fix deadline extraction for KVS, RBI, DRDO, ESIC, UPSC, and state PSC sources.
2. Fix notification/PDF discovery for IBPS and UPPSC.
3. Fix vacancy and qualification extraction for SSC, then rerun its funnel.
4. Repair zero-yield source discovery, starting with Employment News, FCI, Army, Air Force, and Coast Guard.
5. Run every priority source independently with a bounded timeout; save fetched, accepted, rejected, and rejection-reason metrics.
6. Export the gated snapshot, regenerate sitemaps, and require catalog count not to fall below the rolling minimum.
7. Repeat until the 500-active-job target is reached without relaxing official-source, freshness, PDF, or completeness gates.

## Supabase release requirement

Supabase Data API access requires both table grants and RLS policies. Because Supabase's 2026 default-grant change affects new and existing projects, deployment verification must explicitly test frontend-role access to every public table; the service-role key must remain backend-only.
