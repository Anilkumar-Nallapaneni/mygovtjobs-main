# GitHub Actions + Supabase — keep vs disable

Last audited: 2026-08-04

## Authoritative schedule (after this cleanup)

| Workflow | Frequency | Status | Role |
|----------|-----------|--------|------|
| CI | PR + push | **KEEP** | Code quality |
| Canonical daily pipeline | Daily 08:00 IST | **KEEP** (needs push + `ALLOW_CANONICAL_PIPELINE=true`) | Sole daily DB + snapshot writer |
| Fetch official RSS | Every 4h | **KEEP** | Urgent notification freshness |
| Weekly PDF enrich | Sunday | **KEEP** | PDF + job-detail backfill |
| Weekly portal audit | Sunday | **KEEP** | Broken official-link probe |
| Uptime and freshness | Every 30m | **KEEP** | Production health |
| Notify on workflow failure | On failure | **KEEP** | Ops alert |

## Disabled / legacy

| Workflow | Why |
|----------|-----|
| Supabase auto ingest | Same cron as canonical; dual writer risk. Hard-disabled (`if: false`, schedule removed). |
| Supabase ingest (self-hosted PC) | Already `if: false`; no maintained runner. |
| Scheduled API ingest | Deprecated hosted API trigger; hard-disabled. |

## Repository variables

| Variable | Value | Purpose |
|----------|-------|---------|
| `ALLOW_CANONICAL_PIPELINE` | `true` | Enables canonical daily writer |
| `ALLOW_AUTO_INGEST` | `false` | Legacy gate (unused by cleaned workflows) |
| `ALLOW_RSS_REFRESH` | `true` | Enables 4h RSS schedule |
| `ALLOW_WEEKLY_ENRICH` | `true` | Enables Sunday PDF enrich |

## Required GitHub secrets

| Secret | Required? |
|--------|-----------|
| `DATABASE_URL` | **Yes** |
| `VITE_SUPABASE_URL` | **Yes** |
| `VITE_SUPABASE_ANON_KEY` | **Yes** |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** |
| `SUPABASE_PROJECT_REF` | Yes (or pooler builder) |
| `SUPABASE_POOLER_HOST` / `SUPABASE_DB_REGION` | Optional if `DATABASE_URL` set |
| `RESEND_API_KEY` | Optional (alerts) |
| `ALERT_FROM_EMAIL` / `ALERT_SITE_URL` | Optional (alerts) |
| `TELEGRAM_BOT_TOKEN` | Optional |
| `NOTIFY_EMAIL` / `SLACK_WEBHOOK_URL` | Optional (failure notify) |
| `ADMIN_API_KEY` | Optional until admin ops API used in CI |
| `MYGOVTJOBS_API_URL` | Not needed while API ingest is disabled |

## Supabase project (`lqihbxujvvvzagrfoorf`)

- Status: ACTIVE_HEALTHY (ap-southeast-1)
- Tables with RLS: all core tables OK
- Ops tables present: `pipeline_runs`, `recruitments`, `recruitment_events`, `source_health`, `job_review_queue`
- Live catalog pressure: few `live` rows vs many `draft` + pending review — publication gate is working but inventory is thin
- `payment_orders` empty — leave monetization dormant
- Advisors: no critical security issues; INFO on service-only tables without anon policies (expected)

## Operator rule

Never run local `pipeline:daily` and a GitHub daily writer at the same wall-clock time — both use the same advisory lock / `DAILY_SYNC_ENFORCE_ONCE`, but snapshot commits can still race.
