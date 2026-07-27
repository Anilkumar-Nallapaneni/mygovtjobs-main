# Live Integration Audit - 2026-07-28

## Verdict

The frontend, GitHub repository, Vercel project, and Supabase project are
connected. The stack is degraded because the production Vercel deployment is
still serving an older four-job snapshot, the verified catalog contains only
one public job, and the Render/API/DNS connection does not exist yet.

## GitHub

- Repository: `Anilkumar-Nallapaneni/mygovtjobs-main` (private)
- Default branch: `main`
- Audit branch: `fix/data-quality-and-publishing`
- GitHub CLI authentication: valid
- Actions: enabled; default workflow token permission is read-only
- Scheduled uptime and ingest runs: operating
- Latest `main` CI result: failed only at the strict minimum-live threshold
- Dependabot vulnerability alerts: enabled during this audit
- Branch protection: unavailable for this private repository on the current
  GitHub plan
- `ALLOW_AUTO_INGEST`: set to `false` until the audit branch is merged, so the
  old exporter cannot overwrite the corrected static snapshot

## Supabase

- Project reference: `lqihbxujvvvzagrfoorf`
- REST API: reachable with the frontend anonymous key
- Transaction pooler: connected on port 6543
- Database: Postgres 17.6
- Database rows: 3,181 total jobs, 1 public job, 21 pending review records
- All public-schema tables have RLS enabled
- Public jobs require approval, recruitment type, verification, completeness,
  confidence >= 90, and a valid India deadline for live records
- `job_review_queue` and ingest/internal tables deny anonymous reads
- Migration `029_harden_publication_rls_and_grants.sql` was applied during this
  audit. It makes job child tables inherit the full parent publication gate and
  reduces anonymous/authenticated grants to the operations used by the app.
- No public-schema extensions or anonymous executable security-definer
  functions were found

Checks that require Supabase dashboard or Management API access and remain
manual: platform Security/Performance Advisors, Auth password protection,
Auth SMTP configuration, and point-in-time recovery/backups.

## Vercel

- Account: `anilkumar-nallapaneni`
- Project: `anilkumar-nallapanenis-projects/mygovtjobs-main`
- Project ID: `prj_zQZWatsgqdQKOwd2GLZ3uyVsH3rj`
- Root directory: repository root
- Node.js: 24.x
- Build: `npm run build`
- Output: `frontend/dist`
- Install: `npm ci`
- Production domains: `www.livegovtjobs.com`, `livegovtjobs.com`,
  `www.govtjobs.me`, and `govtjobs.me`
- Production environment contains site, jobs-source, Supabase, API, GA4, and
  Google verification variables
- Latest production deployment: Ready
- Audit-branch preview: Ready and serves exactly 1 approved job
- Current production: HTTP 200 but serves the older 4-job snapshot
- HTTPS, HSTS, frame denial, MIME sniffing protection, referrer policy, and
  static JSON cache policy are active
- No production runtime errors were returned by Vercel logs

Content Security Policy is not configured. Add it only after inventorying all
Supabase, analytics, Turnstile, maps, image, and API origins; an incomplete CSP
would break runtime features.

## Render And API

- `render.yaml` correctly describes the `mygovtjobs-api` Docker web service
- The production Docker image builds successfully
- The image starts successfully with production settings
- Container `/health`: HTTP 200 with database connected
- Container `/api/jobs`: HTTP 200 and returns the approved public job
- Container admin endpoint without a key: HTTP 401
- No Render API key, service ID, or `onrender.com` service URL is configured
- `api.livegovtjobs.com` has no DNS record and is unreachable
- Vercel currently has `VITE_API_URL`, but that target cannot work until Render
  and DNS are provisioned

## Dependency And Security Notes

- Python `pip check`: clean
- Production npm audit: two moderate React Router advisories
- Full development/build audit: 14 transitive findings (11 high, 2 moderate,
  1 low). The high findings are the same `brace-expansion` denial-of-service
  advisory repeated through ESLint and Workbox dependency paths; the low
  finding is the Vite development-server `esbuild` advisory.
- GitHub currently groups the default-branch findings into five Dependabot
  alerts (1 high, 3 moderate, and 1 low).
- The available npm fix requires the breaking React Router 7 upgrade. A tested
  clean upstream upgrade is not available in the current dependency set.
- The remaining development-tool fixes also require breaking ESLint/PWA
  dependency changes. `npm audit fix` was tested and removed because it left
  the findings in place while creating unrelated lockfile churn.
- GitHub Actions permits all actions and does not require SHA pinning. Pinning
  should be introduced as a separate workflow-hardening change after testing.

## Required Connection Order

1. Review and merge the audit pull request into `main`.
2. Confirm the automatic Vercel production deployment serves the one approved
   record and the new active/archive sitemap split.
3. Create the Render Blueprint service from `render.yaml`.
4. Add Render secrets: `DATABASE_URL`, `SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY`, and `ADMIN_API_KEY`.
5. Verify the Render service URL at `/health` and `/api/jobs`.
6. Add `api.livegovtjobs.com` as the Render custom domain and create the DNS
   record requested by Render.
7. Verify CORS, admin authentication, report submission, alerts, and API health
   through the custom domain.
8. Keep `ALLOW_AUTO_INGEST=false` until `main` contains the confidence-aware
   publisher. Re-enable it only after a manual workflow run passes.
9. Grow the verified catalog to at least 50 records without lowering the
   publication threshold, then require the strict production check for release.
