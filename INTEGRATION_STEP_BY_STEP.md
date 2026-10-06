# Exact implementation sequence

## Phase 1 — Run the merged UI

From `mygovtjobs-main-main`:

```powershell
npm install
npm run dev
```

Open:

```text
http://localhost:5173/education
```

Also test:

```text
/education/mock-tests
/career
/jobs
/results
/admin
```

## Phase 2 — Verify

```powershell
npm run type-check
npm run lint
npm run test
npm run build
```

Fix any environment-specific package/Node issues before production.

## Phase 3 — Supabase education schema

Create these tables:

```text
education_careers
education_career_steps
education_exams
education_resources
education_subjects
education_chapters
education_mock_tests
education_questions
education_attempts
education_attempt_answers
education_colleges
education_courses
education_scholarships
```

Use the existing Supabase project rather than creating a second authentication system.

## Phase 4 — Admin

Extend the existing `/admin` operations area with:
- Career editor
- Exam editor
- Resource verification
- Mock-test/question editor
- College editor
- Scholarship editor

## Phase 5 — Student profile

Reuse the existing account identity and add:
- education stage
- board/stream
- target exams
- target careers
- saved careers
- test history

## Phase 6 — Unified recommendations

For a student:

```text
qualification + stream + interests
        ↓
career pathways
        ↓
entrance/competitive exams
        ↓
mock tests
        ↓
government jobs matching qualification
```

## Phase 7 — Real resource service

Every resource must be one of:

```text
official
edupath-generated
external
catalogue-only
```

Never present a missing/copyrighted PDF as a downloadable official file.

## Phase 8 — Unified PDF API

Move the EduPath PDF generator into the existing backend/API architecture. Add authentication/rate limits and store generated-document metadata.

## Phase 9 — SEO

Create canonical pages such as:

```text
/education/career-after-10th
/education/career-after-12th
/education/exams/jee-main
/education/exams/neet
/education/mock-tests
```

Generate sitemap entries and structured metadata.

## Phase 10 — Domain launch

Recommended first launch:

```text
https://www.livegovtjobs.com/
https://www.livegovtjobs.com/education/
```

Do not move or delete existing job URLs. Preserve existing SEO URLs and add education as a new product area.

Later, if a separate education `.com` is purchased, it can point to the same application with a dedicated brand/route strategy.
