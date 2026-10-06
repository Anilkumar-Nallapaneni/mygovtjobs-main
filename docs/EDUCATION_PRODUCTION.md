# Education production setup

## 1. Requirements
- Node 24 (the repository declares `>=24 <25` and `.nvmrc` is `24`).
- A Supabase project using the same project already used by LiveGovtJobs.

## 2. Apply database migration
Run:
`database/migrations/039_education_platform.sql`

Do this in Supabase SQL Editor or through the project's migration workflow.

## 3. Seed the existing EduPath catalogue
From the repository root:
```powershell
$env:SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVER_ONLY_SERVICE_ROLE_KEY"
npm install
npm run education:seed
```
Never put `SUPABASE_SERVICE_ROLE_KEY` into `frontend/.env` or browser code.

## 4. Configure frontend
Copy `.env.example` to the appropriate local environment file and set only browser-safe values, including:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SITE_URL`
- any existing LiveGovtJobs API/PWA variables required by your deployment

## 5. Verify
```powershell
npm run type-check
npm run lint
npm run test
npm run build
```

## 6. User flow
- Existing LiveGovtJobs account remains the identity.
- `/education` reads the static catalogue and, when the education tables contain published rows, overlays database-managed career/test data.
- `/education/dashboard` stores education preferences in `profiles` and reads the user's saved test attempts.
- `/education/mock-tests` uses the same education test catalogue.
- `/jobs` remains the government-job destination.

## 7. Production content rules
- Official/copyrighted material is linked to its authoritative source.
- EduPath-generated PDFs must be explicitly labelled as original.
- Catalogue-only books must not be exposed as downloadable copies.
- Education records should have a source and verification timestamp before being promoted as verified.
