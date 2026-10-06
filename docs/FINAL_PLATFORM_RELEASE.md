# LiveGovtJobs + EduPath Final Platform Release

This release consolidates the previous merge, database layer, student dashboard, mock-test persistence, Education Admin/CMS, career detail pages, profile-based career targeting, stable question seeding, and education resource seeding.

## Main areas

- Government jobs: existing LiveGovtJobs routes and ingestion/publish workflows remain intact.
- Education: `/education`
- Mock tests: `/education/mock-tests`
- Student dashboard: `/education/dashboard`
- Career details: `/education/careers/:slug`
- Education CMS: `/admin/education`
- Existing job admin: `/admin`

## Education CMS security

The browser only sends `X-Admin-Key` to the existing backend admin API. Never put `SUPABASE_SERVICE_ROLE_KEY` in frontend environment variables.

Set server-side:

```env
ADMIN_API_KEY=<strong-secret>
APP_ENV=production
CORS_ORIGINS=https://livegovtjobs.com,https://www.livegovtjobs.com
```

Frontend:

```env
VITE_API_URL=https://<your-api-domain>
VITE_ENABLE_ADMIN_UI=1
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_SITE_URL=https://livegovtjobs.com
```

## Database

Apply all migrations including:

`database/migrations/039_education_platform.sql`

The migration adds stable `education_questions.external_id` for idempotent question seeding.

## Seed

Use Node 24:

```powershell
npm install
$env:SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
npm run education:seed
```

The service-role key is server-side only and must not be committed.

## Verification

```powershell
npm run type-check
npm run lint
npm run test
npm run build
```

A full production build must be run in a normal network-enabled Node 24 environment because dependency installation/build artifacts are environment-specific.

## Content policy

Only publish education resources you are permitted to distribute. Prefer links to official sources for government syllabi, notifications, textbooks, examination information and scholarship portals. Do not upload copyrighted books, question banks or coaching PDFs without permission.
