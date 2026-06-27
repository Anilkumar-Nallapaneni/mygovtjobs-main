---
name: pdf-reader-agent
description: >-
  Read official government job notification PDFs for live listings, extract
  vacancies and content_sections, and memorize to Supabase + static JSON.
  Use when asked to read PDFs, memorize job notices, enrich vacancies from PDFs,
  or run PdfReaderAgent.
---

# PDF Reader Agent

Reads official notification PDFs for live/expired jobs and **memorizes** structured content.

## What it does

1. Finds jobs with official PDF links (not aggregator mirrors).
2. Downloads and parses up to 6 PDFs per job (`pypdf` + section extractor).
3. Persists memory to:
   - **Supabase** `jobs.detail.content_sections`, vacancies, dates, qualification
   - **Static** `frontend/public/data/job-details/<slug>.json`
   - **Index** `frontend/public/data/pdf-memory-index.json`
4. Syncs `job_posts` / `job_dates` child rows when sections contain tables.
5. Re-exports `live-jobs.json` after a successful batch.

## Commands (repo root)

```bash
# Default: 50 live jobs missing content_sections
npm run pdf:read

# All live jobs still missing PDF memory
npm run pdf:read:live

# Re-read all jobs with PDFs (live + expired)
npm run pdf:read:all

# Options via Python CLI
npm run pdf:read -- --limit 20 --concurrency 6
npm run pdf:read -- --force --limit 100
```

## Requirements

- `backend/.env` with `DATABASE_URL` (Supabase pooler :6543)
- Optional: `SUPABASE_SERVICE_ROLE_KEY` for Storage upload of detail JSON

## Code

| File | Role |
|------|------|
| `backend/app/agents/pdf_reader_agent.py` | Orchestrator agent |
| `backend/app/services/job_pdf_enrich_service.py` | PDF → DB enrich |
| `backend/app/utils/job_pdf_urls.py` | Official PDF URL discovery |
| `scripts/run-pdf-reader-agent.py` | CLI entry |

## Related

- `npm run enrich:jobs` — lighter metadata backfill (same enrich service)
- `npm run build:job-details` — static-only PDF build from `live-jobs.json` (no DB); **deprecated** — use `pdf:read:live` + `job:details`

## After a full run

Commit updated `live-jobs.json`, `job-details/`, and `pdf-memory-index.json` for static/Vercel production.
