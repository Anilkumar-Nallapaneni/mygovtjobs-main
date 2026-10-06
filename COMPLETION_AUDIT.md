# LiveGovtJobs + EduPath — Completion Audit

## What is included
- Existing LiveGovtJobs production-oriented job, results, alerts, account, admin, SEO and PWA codebase retained.
- EduPath career pathways, education hub, mock-test catalogue and official-resource policy integrated into the same React/Vite application.
- `/education`, `/education/mock-tests`, `/career`, `/education/dashboard` routes.
- Shared Supabase identity: education profile fields are stored on the existing `profiles` row.
- Supabase education schema migration `database/migrations/039_education_platform.sql`.
- Supabase service layer with safe static-data fallback.
- Responsive student education dashboard.
- Real attempt-storage schema with row-level security.
- College, scholarship, resource, career, exam and question/test tables ready for verified content.
- Existing government-job functionality remains in the same application and deployment.

## What cannot be completed by packaging source code alone
1. A Supabase project must run the migration.
2. Production education data must be reviewed/seeded and source-verified.
3. Production secrets must be supplied through the deployment platform.
4. External APIs/payment/email/analytics require the owner's credentials and settings.
5. A production build must be executed in a normal network-enabled environment after dependency installation.

## Recommended verification commands
```powershell
npm install
npm run type-check
npm run lint
npm run test
npm run build
```

## Critical launch checks
- Existing job URLs return 200 and are not redirected unnecessarily.
- `/education` and `/education/dashboard` render on desktop and mobile.
- Supabase migration has been applied.
- RLS policies are enabled and tested.
- No service-role key is exposed to Vite/client code.
- Official resources open at authoritative sources.
- Copyrighted books/exam papers are not redistributed.
- Sitemap and canonical metadata include the new public education pages.
- Analytics and error monitoring are configured.

## Data seeding
After applying migration 039, an operator can seed the existing EduPath career/mock-test catalogue with:
```powershell
$env:SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVER_ONLY_KEY"
npm run education:seed
```
The service-role key is server-only and must never be placed in `frontend/.env` or shipped to the browser.

## V2.1 test persistence
The mock-test UI now writes a completed attempt and per-question answers for signed-in users through the education API. Anonymous users can still practice without persistence.
