# Release audit

Audit run: 2026-10-06, on the current `New-Idea` worktree, using Node 24.18.0 and npm 12.2.0.

## Local verification

- `npm ci --dry-run` and clean `npm ci`: passed.
- `npm ls --all`: exited 0. The tree lists platform-specific and optional packages as unmet optional dependencies, as expected; no invalid dependency tree was reported.
- `npm run audit:india`: passed all 16 checks, including all 36 public and seeded States/UTs.
- `npm run audit:india-explorer`: passed.
- `npm run type-check`, `npm run lint`, and `npm test`: passed. Results: 90 frontend files / 448 tests; backend 276 passed and 1 skipped; script tests 4 passed.
- `npm run build`: passed, including sitemap generation, strict live-job snapshot validation, Vite, PWA generation, and 11 job-page prerenders.
- `npm run verify:production-seo`: passed for robots, sitemap index, static and job sitemaps, and live-job snapshot.
- `npm run check:performance-budgets`: passed after the build.
- `npm run check:frontend`: passed merge-marker, TS-only, and JSON/XML checks. Its first combined invocation raced the build's `dist` cleanup; the performance check passed on rerun.
- `npm run env:check`: passed frontend/backend Supabase project-ref alignment.
- `npm run go-live:check`: exited 0 and passed configured env, Supabase REST/database, job quality, frontend build, and Vercel env checks. The production `https://api.livegovtjobs.com/health` probe could not connect.
- `npm run db:test`: passed; the configured database answered a read-only jobs count query.
- `npm run supabase:audit`: passed; public REST reads expose the expected live jobs/sources while control tables remain private to anonymous users.
- Migration files are sequential 001–042 with no gaps or duplicate numbers. The live `public.schema_migrations` table records `042_india_explorer_backend.sql` and 041; the live India tables have RLS enabled with verified-only SELECT policies (and no public read on import runs). A read-only query found 36 verified state rows.
- `npm run vercel:env:check`: passed; production Vercel has the required jobs-source and public Supabase variables.

## Findings and limits

- The current build and local configuration checks pass. This does not confirm a Vercel deployment or Search Console indexing.
- The local `VITE_API_URL=http://localhost:8000` is a development setting. The preflight now probes the production API independently; configure the Vercel value as `https://api.livegovtjobs.com` (or the deployed API origin) and redeploy.
- Sentry, Redis, and Turnstile are reported as optional production configuration gaps by the preflight.
- Supabase REST/database checks and read-only live schema/RLS queries were reachable from this machine. This verifies the inspected tables and policies, not every database object or every role's effective permissions.
- The high-confidence tracked-file token scan initially matched binary Node compile-cache files under `.tmp/` and `.stage2-test-tmp/`. Those generated caches were removed and ignored; a repeat scan found no high-confidence private-key/token patterns.
- `npm` emitted an unknown `global-ignore-file` configuration warning from the machine's user npm config. It did not fail project commands.

## Release decision

The repository build is locally verified. Production release readiness remains **PARTIAL** until the production API URL is configured and the live API, deployment, and database migration state are checked in their target environments.
