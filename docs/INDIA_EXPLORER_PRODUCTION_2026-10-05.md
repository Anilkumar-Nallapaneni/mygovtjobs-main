# India Explorer — production backend package

## What this release adds

- FastAPI `/api/india/*` endpoints backed by PostgreSQL/Supabase.
- State master data with source attribution and verification status.
- District and city tables ready for LGD/Survey of India ingestion.
- Directory places for schools, colleges, universities, companies, tourism, temples, hotels, hospitals and transport.
- Agriculture, industry and fact tables.
- Source registry and import-run audit table.
- Public search across verified India directory records.
- Frontend hooks for real API state/category data with safe fallback.
- Import templates and a dry-run-first importer.
- Existing education college records can be synchronized into the India Explorer when they are already verified/published.

## Important data policy

This package does not invent directory records. A record becomes public only when it is source-attributed and marked verified. Historical Census datasets must not be treated as current district boundaries without reconciliation against the current LGD/Survey of India source.

## Database migration

Apply migrations in order, then `042_india_explorer_backend.sql`.

Recommended production sequence:

1. Backup Supabase database.
2. Apply migration in staging.
3. Run `SELECT * FROM india_sources ORDER BY name;`.
4. Run `SELECT count(*) FROM india_states WHERE verification_status='verified';` — expected baseline: 36.
5. Import current districts from LGD/Survey of India using a dry run.
6. Import cities and directory records only after source validation.
7. Run frontend and backend tests.
8. Deploy API preview.
9. Deploy frontend preview and test `/india`, `/india/:stateId`, `/india/:stateId/:category`.
10. Promote to production.

## Import commands

Dry run:

`npm run india:import -- districts data/india/templates/districts.csv --source "Local Government Directory (LGD)"`

Apply:

`npm run india:import -- districts data/india/lgd-districts.csv --source "Local Government Directory (LGD)" --apply`

Sync already-verified education colleges:

`npm run india:sync:education -- --apply`

## API endpoints

- `GET /api/india/overview`
- `GET /api/india/states`
- `GET /api/india/states/{stateId}`
- `GET /api/india/states/{stateId}/districts`
- `GET /api/india/states/{stateId}/categories/{category}`
- `GET /api/india/search?q=...`

## Production environment

Frontend:

`VITE_API_URL=https://YOUR-BACKEND-DOMAIN`

Backend:

- `APP_ENV=production`
- `DATABASE_URL=<Supabase transaction-pooler URL>`
- `SUPABASE_URL=<Supabase URL>`
- `SUPABASE_SERVICE_ROLE_KEY=<service role key>`
- `CORS_ORIGINS=https://www.livegovtjobs.com,https://livegovtjobs.com,https://www.govtjobs.me,https://govtjobs.me`
- `ADMIN_API_KEY=<long random secret>`

Never expose `SUPABASE_SERVICE_ROLE_KEY` or `ADMIN_API_KEY` to Vite/frontend environment variables.
