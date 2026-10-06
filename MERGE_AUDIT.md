# LiveGovtJobs + EduPath Merge Audit

Date: 2026-09-30

## Decision

The two applications should run as **one React/Vite application**, with the LiveGovtJobs application as the production base.

### Why LiveGovtJobs is the base

The LiveGovtJobs repository already contains:
- production React/Vite frontend
- React Router
- Supabase integration
- job ingestion/sync pipelines
- official-source health tooling
- SEO/sitemap/prerender tooling
- PWA
- authentication/account/bookmarks
- alerts and notifications
- admin routes
- testing and CI workflows
- job detail pages and state/qualification/organization/category discovery

EduPath is valuable primarily for:
- career-path datasets
- education-stage pathways
- exam/career relationships
- syllabus/study-content catalogue
- original mock-test question data
- education resource policy
- PDF guide generation concept

Running two independent frontends would duplicate routing, dependencies, branding, authentication and deployment. The merge therefore uses one frontend and one router.

## File-level integration

### Copied from EduPath

`frontend/src/data/education/`
- `careerPaths.ts`
- `careerPathFamilies.ts`
- `originalMocks.ts`
- `studyContent.ts`
- `stageStudySubjects.ts`
- `collegeSyllabi.js/.d.ts`
- `collegeSyllabiExtra.js`
- `interSyllabi.js/.d.ts`
- `degreeExamGuides.js/.d.ts`
- `officialSources.js/.d.ts`
- `resourceRegistry.ts`

They are isolated under `education/` to avoid collisions with existing government-job data.

### New integrated UI

`frontend/src/pages/EducationHubPage.tsx`
- Overview
- career stages
- career pathways
- pathway detail
- exam discovery
- interactive mock tests
- official resource links
- study-subject catalogue
- LiveGovtJobs cross-link

`frontend/src/styles/education-hub.css`
- responsive visual system
- desktop/tablet/mobile layouts
- dark education hero
- cards, filters, test workspace, roadmap and official-resource cards

### Modified

`frontend/src/components/AppRoutes.tsx`
- `/education`
- `/education/mock-tests`
- `/career`

`frontend/src/components/layout/Navbar.tsx`
- adds `Career & Education` entry to the desktop utility navigation

## Deliberately NOT merged

EduPath's standalone `server/index.js` was not copied into the government-job server. It is a separate Express/PDF service and would create two backend contracts on the same deployment.

The next backend phase should move EduPath PDF generation into a single API endpoint/function and store metadata in Supabase.

EduPath's Radix UI component library was also not copied. The integrated page uses the existing LiveGovtJobs frontend stack to avoid adding dozens of duplicate UI dependencies.

## Current product architecture

LiveGovtJobs remains the government-job engine:

`/jobs`
`/state/*`
`/qualification/*`
`/profession/*`
`/org/*`
`/results`
`/admit-cards`
`/answer-keys`
`/exam/*`
`/scholarships`
`/alerts`
`/account`
`/admin`

EduPath becomes the education layer:

`/education`
`/education/mock-tests`
`/career`

## Important production gaps

1. Education data is currently frontend/static data. Move it into Supabase tables.
2. Mock-test attempts are not yet persisted to the user's account.
3. EduPath PDF generation is not yet exposed through the unified LiveGovtJobs backend.
4. Education authentication should reuse the existing LiveGovtJobs account/Supabase identity.
5. College/scholarship data needs source verification and a database update process.
6. Official resources should be periodically health-checked.
7. SEO metadata should be added for each education route.
8. A unified student dashboard should be built after database migration.
9. The current government-job domain should keep its job-first homepage; education is a connected product area.
10. Before deployment, run type-check, lint, tests and a production build in a normal network-enabled environment.

## Competitive feature audit

FreeJobAlert emphasizes job notifications, closing-soon jobs, education filters, state jobs and results/admit cards. Testbook emphasizes large exam-test libraries, live tests, multilingual practice and performance analysis. Careers360 emphasizes exams, colleges, courses, counselling, predictors and education data. The merged application can differentiate by connecting these journeys:

`Career discovery -> exam preparation -> education resource -> government-job eligibility -> verified job listing`

Sources:
- FreeJobAlert: https://www.freejobalert.com/
- Testbook: https://testbook.com/
- Careers360: https://www.careers360.com/

## V2 hardening added 2026-09-30
- Added `database/migrations/039_education_platform.sql` for shared education data, mock-test attempts, resources, colleges, scholarships and education profile fields.
- Added `frontend/src/lib/educationApi.ts` with Supabase-backed education profile, career, mock-test and attempt access. Static EduPath data remains the safe fallback until data is seeded.
- Added `frontend/src/pages/EducationDashboardPage.tsx` at `/education/dashboard` so the existing LiveGovtJobs Supabase identity can carry education preferences and test history.
- Added responsive `frontend/src/styles/education-dashboard.css`.
- Updated `useAuth` to read/write education profile fields.

### Remaining external setup (not possible to complete inside a source ZIP)
- Run the new Supabase migration against your actual project.
- Seed verified education records; the included static data remains a fallback and is not automatically claimed as verified database content.
- Configure real production environment variables and deploy.
- Run `npm install`, `npm run type-check`, `npm run lint`, `npm run test`, and `npm run build` in a normal network-enabled development environment.

## V2.1 mock-test persistence
- Signed-in mock-test submissions now persist `education_test_attempts` and `education_attempt_answers` through `educationApi.ts`.
- Anonymous practice remains available; it simply does not create a user attempt.
