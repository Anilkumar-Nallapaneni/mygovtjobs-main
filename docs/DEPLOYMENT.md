# Deployment

## Requirements

- Node.js 24.x (`.nvmrc` is authoritative); npm workspace install from the repository root.
- Root workspace contains `frontend/`; root `package-lock.json` must stay in sync with both package manifests.
- Supabase project for live job and directory data; deployed FastAPI service for database-backed API routes.

## Local setup

```powershell
npm ci
npm run dev
```

Create `frontend/.env.local` and `backend/.env` from their `.env.example` files. Use only the Supabase anon key in frontend variables. Keep the service role key and database credentials in the backend environment. Set the database URL to the Supabase transaction pooler as described in [README.md](../README.md).

## Verification and Vercel

Run the release checks from the root:

```powershell
npm run audit:india
npm run type-check
npm run lint
npm test
npm run build
npm run go-live:check
```

Vercel uses the root `vercel.json`, installs with `npm ci`, builds with `npm run build`, and serves `frontend/dist`. Configure `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and the deployed API URL in Vercel. The local API URL (`http://localhost:8000`) must not be used for production.

## Database changes

Apply `database/supabase_setup.sql` once, then migrations in ascending sequence. Review each migration before applying it to production; never reset production data. Use `npm run env:check` and `npm run go-live:check` for configured connection checks. Keep service-role credentials out of frontend builds and source control.

Further operational steps: [GO_LIVE.md](GO_LIVE.md), [DEPLOY_VERCEL_SUPABASE.md](DEPLOY_VERCEL_SUPABASE.md), and [DEPLOY_RAILWAY_RENDER.md](DEPLOY_RAILWAY_RENDER.md).
