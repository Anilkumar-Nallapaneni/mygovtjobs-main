# Website Health Agent — reference

Symptom → check → fix. Used by Agent 4 after `npm run health:website`.

## Production URLs

| Surface | URL |
|---------|-----|
| Site | https://www.livegovtjobs.com |
| API health | https://api.livegovtjobs.com/health |
| Sitemap | https://www.livegovtjobs.com/sitemap.xml |
| Live jobs JSON | https://www.livegovtjobs.com/data/live-jobs.json |
| Sync state | https://www.livegovtjobs.com/data/daily-sync-state.json |

## Code

| Symptom | Check | Fix |
|---------|-------|-----|
| `.js` under `frontend/src` | `npm run check:frontend` | Convert to `.ts`/`.tsx` |
| Type errors | `npm run type-check` | Fix reported symbols |
| Lint CI fail (`max-warnings 0`) | `npm run lint` | Fix warnings; do not raise max |
| Unit test fail | `npm run test` | Fix tests or regen fixtures carefully |
| Build fail | `npm run build` | Fix Vite/TS errors; check env at build time |

## Env / secrets

| Symptom | Check | Fix |
|---------|-------|-----|
| Supabase ref mismatch | `npm run env:check` | Align frontend + backend project ref |
| Pooler wrong port | `npm run diagnose:database-url` | Use Transaction pooler **6543** |
| Admin default key | go-live check | `npm run admin:key:generate` |
| Vercel jobs source static | `npm run vercel:env:check` | `VITE_JOBS_SOURCE=supabase` + `vercel:env:push:live` |
| service_role in `VITE_*` | inspect env | **Never** put service_role in frontend |

## Supabase / data

| Symptom | Check | Fix |
|---------|-------|-----|
| REST auth fail | `npm run supabase:test` | Fix anon URL/key in `frontend/.env.local` |
| Empty jobs table | `npm run supabase:audit` | `npm run sync:production` (or `daily:sync`) |
| Low quality / aggregators | `npm run jobs:audit:strict` | `npm run data:scrub` / `data:scrub-noise` (dry-run first) |
| Stale snapshot | `npm run verify:live-jobs` | Re-export after sync; `clean:live-jobs` |
| Missing PDF memory | `npm run audit:missing-pdfs` | `pdf:backfill` → `pdf:read:live` → `job:details` |
| RLS / perf warnings | MCP `get_advisors` | Apply recommended policies/indexes carefully |

## API

| Symptom | Check | Fix |
|---------|-------|-----|
| `/health` not connected | probe API_HEALTH_URL | Set `DATABASE_URL` on API host; restart |
| 503 on `/api/jobs` | backend logs | Pooler URL + migrations `npm run db:migrate` |
| Admin 401 | curl with header | `X-Admin-Key` = `ADMIN_API_KEY` |

Local API:

```bash
ALLOW_INSECURE_ADMIN=1 APP_ENV=development npm run api:dev
```

## Vercel

| Symptom | Check | Fix |
|---------|-------|-----|
| Bad deploy | MCP deployment logs | Fix build; ensure root `vercel.json` |
| Old jobs on prod | runtime + `vercel:env:check` | Push env + redeploy; confirm Supabase source |
| Blank page | runtime errors MCP | Check client errors / missing env at build |
| Wrong project config | `vercel.json` location | Deploy from **repo root** only |

```bash
npm run vercel:env:push:live
npm run vercel:deploy
```

## GitHub Actions

| Workflow | Role |
|----------|------|
| `ci.yml` | PR checks |
| `supabase-auto-ingest.yml` | Daily `sync:production` |
| `fetch-official-feeds.yml` | `sync:quick` (~4h) |
| `uptime-check.yml` | Every 30m site/API probe |
| `weekly-enrich.yml` | PDF + job details CI |
| `weekly-portal-audit.yml` | Official sites audit |

```bash
gh run list --limit 15
gh run view <run-id> --log-failed
```

Secrets: `npm run github:secrets:push` (needs local env files).

## Analytics

| Symptom | Check | Fix |
|---------|-------|-----|
| No GA traffic | `VITE_GA_MEASUREMENT_ID` locally + Vercel | Add `G-` ID; redeploy (Vite inlines at build) |
| SPA pageviews missing | `frontend/src/lib/analytics.ts` | Ensure route changes call page view |
| Vercel Analytics | `@vercel/analytics` dependency | Confirm Analytics enabled in Vercel project |

## Live site

```bash
SITE_URL=https://www.livegovtjobs.com npm run health:website:full
```

| Symptom | Fix |
|---------|-----|
| Homepage ≠ 200 | Vercel deploy / DNS / domain |
| Sitemap missing | `npm run build:sitemap` then deploy |
| JSON empty on CDN | Re-run sync + commit/export snapshot path used in deploy |
| Sync age > 72h | Check `supabase-auto-ingest` workflow + uptime job |

## Modes

| Mode | Command | Use when |
|------|---------|----------|
| Fast | `npm run health:website` | Frequent / after small fixes |
| Code | `npm run health:website:code` | Before PR |
| Full | `npm run health:website:full` | Pre-release / "site is down" |
| JSON | `npm run health:website -- --json` | Piping to other tools |

## Related agents

| # | Agent | Command |
|---|-------|---------|
| 1 | Ingest | `npm run daily:sync` |
| 2 | PDF reader | `npm run pdf:read:live` |
| 3 | Job details | `npm run job:details` |
| 4 | **Website health** | `npm run health:website:full` |

Pipeline: `npm run pipeline:live:full` (agents 1–3). Health is separate and should run after pipeline or deploy.
