# LiveGovtJobs V3 Codebase Audit

Audit date: 2026-10-02. This report is based on repository source, configuration, migrations, and existing tests. A local review does not prove that production credentials, scheduled workflows, or external services are working.

## A. Existing functionality

- React 18, Vite, TypeScript, i18next frontend in `frontend/`; FastAPI, SQLAlchemy async, and asyncpg backend in `backend/`.
- Supabase Postgres schema and ordered SQL migrations in `database/`; static Vite deployment configured at the repository root for Vercel.
- Official-source scraper registry and ingestion pipeline: scraper → parser/PDF enrichment → validation/classification → persistence/deduplication → export in `backend/app/agents/ingest_agent.py` and `backend/app/services/`.
- Raw fetched payload persistence in `raw_ingest`; source registry synchronization and a separate `source_health` table exist.
- Job publication checks cover official host/PDF, deadline, document type, verification, completeness, duplicates, state classification, and noisy notices (`publish_gate.py`). New auto-publication depends on backend configuration.
- Backend jobs/search routes use database filtering, pagination, ETags, and recruitment/publication filters. Search-vector migration and list indexes exist.
- Static job JSON, sitemap generation, job detail/PDF agents, publication review queue, admin routes, rate limiting, alerts, bookmarks/comments, and subscription billing code exist.
- Education data/pages and related database work exist. Frontend and backend have job, ingestion, publication, education, and billing tests; CI workflow files exist.

## B. Working functionality verified from source

- The scraper agent rejects disabled or unsupported source definitions, attempts to persist raw rows, normalizes candidates, records per-source outcomes, and exports the public catalog (`ingest_agent.py`).
- Persistence calculates a deterministic content hash, classifies and scores candidates, applies a publication gate, preserves an existing public gate on some upserts, and queues non-public candidates for review (`job_persist_service.py`).
- Backend list and detail queries apply a public recruitment policy and sanitize detail/official PDF URLs (`job_service.py`, `job_sql_filters.py`).
- Database RLS/publication gates and policies are represented in SQL migrations. CI and local test/build commands are defined.
- Existing tests include publication gate, persistence, search/filter, sitemap, and job export coverage. Their presence is not proof of a live database run.

## C. Partially implemented functionality

- Provenance is recorded as `source_url` and `source_domain`; a `source_type` column exists but is not consistently populated, and jobs did not have a foreign key to `sources`. The relational gap is addressed by the first Phase 1 change in migration 040.
- `source_health` records health/counts, while the source registry itself has fewer operational fields than the proposed registry (for example fetch frequency and explicit health state are not on `sources`).
- Search currently supports query, state, category, limit/offset pagination; the proposed broader server-side filter set and cursor pagination are not demonstrated by the inspected job endpoint.
- SEO and sitemap generation exist, but the full proposed index taxonomy and schema coverage need route-by-route verification.
- Existing billing is subscription-oriented (`payment_orders`/Razorpay); the generic orders, booking, refund, and payout architecture is not established by the inspected files.
- Education exists, but a complete mock-test attempt/evaluation system was not found in the inspected architecture.

## D. Missing functionality relative to the prompt

- Relational source provenance for newly ingested jobs was absent before this audit; migration 040 and persistence now add it. Historical records are left nullable because URL-to-registry mapping is not reliable enough to fabricate.
- The proposed mentor marketplace, mentor services/availability, safe booking flow, generic commerce ledger, mentor payouts, marketplace admin, and associated end-to-end paths were not found in the inspected route/model/migration sets.
- The complete proposed mock-test engine and full education/course commerce capabilities were not established from source review.
- Full source fetch-run/document/error tables and the proposed complete operational source monitoring surface were not established; current `raw_ingest`, source registry, health records, and review queue provide partial foundations.

## E. Duplicate functionality

- The repository has multiple scrape/sync entry points and several audit/export/scrub scripts. They appear to serve distinct batch or operational workflows; no deletion is recommended without tracing workflow usage.
- Sitemap outputs/build paths include static public sitemap files and a build script. Their ownership and synchronization should be consolidated only after checking CI and Vercel output behavior.

## F. Security issues and controls

- Positive controls visible in source: backend admin/ingest key convention, rate-limit and admin-audit middleware, environment-based secrets, publication RLS/grant hardening migrations, and a report-only CSP setting noted in `AGENTS.md`.
- A complete security assessment (including deployed RLS behavior, authentication/IDOR, webhook signature behavior, SSRF, upload handling, and rate-limit behavior under load) cannot be concluded from this local source pass. Payment code should receive a dedicated review before commerce expansion.
- The migration runner executes files from `database/migrations` in sequence and is documented as idempotent; migration 040 adds a nullable FK and index without guessing legacy mappings.

## G. SEO issues

- Static sitemap assets and `scripts/build-sitemap.mjs` exist. Existing SEO utilities and structured data tests exist.
- The prompt's full sitemap index taxonomy, canonical/metadata coverage for every landing page, JSON-LD validity per page, and robots exclusion behavior need production-output verification; they are not claimed complete here.

## H. Performance issues

- Backend filtering, indexes, ETags, and static catalog loading are present. API limit is capped at 1000, while the product guide notes the homepage uses static data.
- Offset pagination plus a Python safety filter can under-fill a page when SQL prefiltering and Python filtering disagree; verify total semantics and fetch behavior before broadening search.
- Query plans, bundle budgets, image delivery, and production response times were not measured in this audit.

## I. Database issues

- The schema has jobs/source/raw ingestion, related job tables, publication metadata, source health, review queue, RLS, indexes, and 039 education migration.
- `database/README.md` previously stopped its migration guide at 036 although migrations 037–039 exist; the guide now records 037–040.
- Existing job source URLs were protected by uniqueness in migration 017/023. Source IDs were absent from jobs and are now nullable FK values for newly mapped ingestion rows.
- No live database migration was run; database credentials and production migration state were not inspected.

## J. Production deployment issues

- The repo contains Vercel and GitHub Actions configuration and scripts for environment checks, production checks, and daily ingestion.
- Actual Vercel deployment, GitHub secret availability, workflow success, Supabase connectivity, and current live data freshness require external credentials and were not verified.
- Documentation has historical drift in migration count/order and some data-count claims; continue correcting docs as implementation milestones are completed.

## K. Recommended implementation order

1. Preserve the official-source job pipeline and add source-registry traceability (started in this milestone).
2. Validate the full pipeline with focused tests and review data-quality edge cases before changing ingestion policy.
3. Review schema/RLS and search/pagination semantics, then verify sitemap/SEO output.
4. Stabilize education/mock tests.
5. Add marketplace schema and features incrementally: profiles, services, availability, booking, payments, courses/products, reviews, dashboards, notifications, and analytics.
6. Complete production/security verification and documentation using configured external services.

## First implementation milestone — Phase 1

- **Implemented:** `jobs.source_id` as a nullable FK to `sources.id`, with `ON DELETE SET NULL` and a partial index (migration 040); persistence resolves the registered source code and stores that FK on inserts/upserts; ORM model updated.
- **Reason:** retain a direct, queryable link from a job to the scraper registry entry. Existing rows remain nullable rather than assigning unverifiable sources.
- **Validation status:** 25 focused backend tests passed (`test_job_persist_service.py`, `test_publish_gate.py`); backend `compileall` passed; `git diff --check` passed. Full CI and applying the migration to a live Supabase database are not part of this local verification.
