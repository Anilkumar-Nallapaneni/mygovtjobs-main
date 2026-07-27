# Job publication paths

## Canonical flow

```text
Official government source
-> scraper/RSS fetch
-> RawIngest evidence
-> IngestAgent normalization
-> deterministic classification, sanitization, and publication gate
-> JobPersistService.upsert_normalized
-> Postgres jobs table
-> JobService approved-public query
-> live-jobs JSON export / API / Supabase Data API
-> frontend catalog and job detail
-> sitemap and prerender
```

`backend/app/services/job_persist_service.py::JobPersistService.upsert_normalized`
is the only canonical job-creation writer. Agents do not decide publication status;
they pass normalized records to this service. The final decision is made by
`backend/app/services/publish_gate.py`.

## Source collection

| File | Function or command | Output |
| --- | --- | --- |
| `backend/app/scrapers/registry.py`, `backend/app/scrapers/*` | registered official-site scrapers | raw source rows |
| `backend/app/agents/ingest_agent.py` | `IngestAgent.run_source` | `RawIngest` rows and normalized candidates |
| `scripts/run-daily-8am-sync.py` | daily orchestrator | invokes all registered sources |
| `scripts/run-sync-production.py` | production entry point | advisory-locked daily sync |
| `scripts/run-sync-quick.py` | RSS/archive refresh | official feed/archive JSON; does not own the job catalog |
| `scripts/import-official-json-to-db.py` | official JSON import | calls the canonical persist service |

## PDF extraction and enrichment

| File | Responsibility | Write behavior |
| --- | --- | --- |
| `backend/app/agents/pdf_reader_agent.py` | extracts and memorizes official notification PDFs | updates an existing `jobs.detail`; then calls canonical export |
| `backend/app/agents/job_detail_agent.py` | builds structured detail from PDF/notice/listing evidence | updates an existing `jobs.detail`; then calls canonical export |
| `backend/app/parsers/notification_parser.py` | parses dates, links, posts, and notification fields | no direct public write |
| `backend/app/parsers/pdf_enrich.py` | PDF field extraction helpers | no direct public write |

Enrichment may improve existing records but must not set `status`,
`published_to_site`, or `verification_status` to a public state. Publication is
owned by `JobPersistService` and the admin approval route.

## Normalization and validation

| File | Responsibility |
| --- | --- |
| `backend/app/agents/ingest_agent.py::_normalize_raw` | maps scraper output to the normalized job contract |
| `backend/app/services/noise_filter.py` | shared plain-text sanitizer and deterministic noise/tender checks |
| `backend/app/services/document_classifier.py` | deterministic document type classification |
| `backend/app/services/dedupe_service.py` | content hash and title fingerprint |
| `backend/app/services/job_completeness_service.py` | completeness score and missing fields |
| `backend/app/services/publish_gate.py` | India-date status, mandatory validation, confidence, final publish decision |
| `backend/app/services/validation_service.py` | early ingest rejection before persistence |

## Supabase and Postgres publishing

| File | Function | Output |
| --- | --- | --- |
| `backend/app/services/job_persist_service.py` | `upsert_normalized` | sole normalized `INSERT ... ON CONFLICT` into `jobs` |
| `backend/app/routes/admin.py` | admin status update | authenticated manual approval/demotion through the same gate |
| `database/migrations/026_align_public_job_policy.sql` | `jobs_public_read` RLS policy | anon/auth can read only approved recruitment rows and current live deadlines |
| `backend/app/services/job_service.py` | `_base_list_stmt` | API/export uses the same approval, recruitment, completeness, and India-date boundary |

Maintenance scripts such as `demote-publish-gate.py`, `backfill-job-dates.py`,
`scrub-aggregator-from-db.py`, `scrub-noise-titles.py`,
`scrub-tenders-from-db.py`, and `scrub-vacancy-counts.py` update existing rows.
They are operator-only repair paths, not alternate ingest publishers. Any export
they request still goes through `JobPersistService.export_live_jobs_json`.

## Static JSON export

| File | Function | Output |
| --- | --- | --- |
| `backend/app/services/job_persist_service.py` | `export_live_jobs_json` | `live-jobs.json` and `live-jobs-list.json` from the approved `JobService` query |
| `scripts/build-live-jobs-list.mjs` | list projection | compact list snapshot |
| `scripts/build-live-jobs-bootstrap.mjs` | bootstrap projection | first-paint snapshot |
| `scripts/verify-live-jobs-snapshot.mjs` | release gate | rejects unapproved, invalid, duplicate, HTML, or expired live records |
| `scripts/clean-live-jobs-json.py` | repair utility | revalidates an existing snapshot; not a source of new jobs |

Primary export callers are `IngestAgent`, `PdfReaderAgent`, `JobDetailAgent`,
`run-daily-8am-sync.py`, `export-live-jobs-now.py`, and the operator repair
scripts listed above.

## Website display

| File | Responsibility |
| --- | --- |
| `frontend/src/hooks/useLiveJobs.ts` | catalog loading state |
| `frontend/src/lib/liveJobsFetch.ts` | static -> Supabase catalog loading; requires `status=live` and `published_to_site=true` |
| `frontend/src/lib/jobsApi.ts` | API/static/Supabase detail lookup; requires publication approval |
| `frontend/src/utils/liveJobsPipeline.ts` | final client-side safety filtering and adaptation |
| `frontend/src/App.tsx` and `frontend/src/components/*` | homepage, lists, filters, and detail rendering |

Frontend filtering is defense in depth. It is not the publication boundary.

## Sitemap and structured data

| File | Function | Output |
| --- | --- | --- |
| `scripts/build-sitemap.mjs` | reads approved Supabase rows or verified static fallback | sitemap index, static routes, active/archive job sitemaps |
| `scripts/prerender-job-pages.mjs` | builds job HTML | `JobPosting` only for approved, active recruitment rows |
| `frontend/src/utils/jobSeo.ts` | client-side structured data | mirrors active recruitment eligibility |

## Workflow entry points

| Workflow | Publication relevance |
| --- | --- |
| `.github/workflows/supabase-auto-ingest.yml` | canonical scheduled ingest, DB write, audit, export, sitemap commit |
| `.github/workflows/fetch-official-feeds.yml` | RSS/archive JSON only; it does not publish `jobs` |
| `.github/workflows/weekly-enrich.yml` | existing-job detail enrichment; DB writer |
| `.github/workflows/ingest-api.yml` | deprecated manual-only remote trigger |
| `.github/workflows/supabase-auto-ingest-self-hosted.yml` | disabled manual legacy path |

All active workflow writers use the shared `live-jobs-publication` concurrency
group. Details and overlap decisions are in `docs/workflow-audit.md`.

## Ownership rules

1. Source discovery and extraction never approve a record.
2. Normalization produces a sanitized candidate only.
3. Deterministic code owns date parsing, official-domain checks, duplicate
   identity, document classification, confidence, and publication status.
4. `JobPersistService` is the only normalized creation writer.
5. Admin approval cannot bypass `publish_gate.py`.
6. RLS, backend API queries, static export, frontend queries, sitemaps, and
   structured data all enforce the same public predicate.

## Files inspected

`backend/app/agents/*`, `backend/app/parsers/*`, `backend/app/routes/admin.py`,
`backend/app/services/*`, `backend/app/utils/*`, `scripts/*` publication/search
matches, `frontend/src/hooks/useLiveJobs.ts`, `frontend/src/lib/jobsApi.ts`,
`frontend/src/lib/liveJobsFetch.ts`, `frontend/src/utils/liveJobsPipeline.ts`,
`scripts/build-sitemap.mjs`, `scripts/prerender-job-pages.mjs`, all files under
`.github/workflows/`, and migrations `023` through `026`.
