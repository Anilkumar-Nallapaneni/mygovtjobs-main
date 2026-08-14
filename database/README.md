# Database

Supabase Postgres schema for My Govt Jobs.

## Setup order

1. **`supabase_setup.sql`** — all tables, indexes, RLS, demo rows
2. **`migrations/001_add_whatsapp_alert_channel.sql`** — alert channel enum
3. **`migrations/002_supabase_rls_and_grants.sql`** — grants for anon/authenticated
4. **`migrations/003_ensure_expired_jobs_public_read.sql`** — if REST audit shows `expired: 0` but backend has expired rows
5. **`migrations/004_rename_structured_import_source.sql`** — data fix for legacy source code
6. **`migrations/005_jobs_list_index.sql`** — partial index for public job list
7. **`migrations/006_jobs_search_vector.sql`** — full-text search column + GIN index
8. **`migrations/007_alert_subscription_validation.sql`** — stricter INSERT policy on alerts
9. **`migrations/008_remove_demo_seed_jobs.sql`** — remove demo seed rows
10. **`migrations/009_user_profiles.sql`** — Supabase Auth `profiles` table + trigger
11. **`migrations/010_job_details_storage.sql`** — public `job-details` Storage bucket
12. **`migrations/011_user_alerts_and_monetization.sql`** — `subscription_tier`, `is_sponsored`, auth-scoped alert policies
13. **`migrations/012_title_fingerprint.sql`** — near-duplicate title dedupe column + index
14. **`migrations/013_razorpay_payments.sql`** — `payment_orders` for Premium checkout
15. **`migrations/014`–`026`** — source sync, publication gate, completeness, and RLS hardening
16. **`migrations/027_job_review_queue.sql`** — private failed-record quarantine with service-role-only access
17. **`migrations/028_publication_confidence.sql`** — persisted 90-point public gate enforced by RLS
18. **`migrations/029_harden_publication_rls_and_grants.sql`** — child-table publication boundary and least-privilege Data API grants
19. **`migrations/030`–`033`** — control plane, bookmarks, comments, grants
20. **`migrations/034_lock_profiles_subscription_tier.sql`** — clients cannot self-set `subscription_tier`
21. **`migrations/035_sync_runs_one_running.sql`** — at most one `sync_runs` row with `status=running`

**Existing Supabase project (safe, idempotent):**
```bash
npm run db:migrate
```
Skips `supabase_setup.sql` when `jobs` exists and only applies new migration files.

**Brand-new empty project:**
```bash
npm run db:migrate:fresh
```

Or run each file manually in the Supabase SQL Editor.

## Tables

| Table | Access | Purpose |
|-------|--------|---------|
| `sources` | public read | Scraper registry (111 rows) |
| `raw_ingest` | service role only | Staging JSON from scrapers |
| `jobs` | public read live+expired | Main job catalog |
| `job_review_queue` | service role only | Failed or uncertain normalized job candidates |
| `job_posts` | public read | Post-level vacancy breakdown |
| `job_dates` | public read | Important dates per job |
| `alert_subscriptions` | public insert | User alert signup |
| `alert_deliveries` | backend only | Sent alert log |
| `profiles` | authenticated own row | User display name, favourite states, subscription tier |

## RLS summary

- `jobs`: approved recruitments only; live rows also require a current India deadline
- `job_posts`, `job_dates`, `job_updates`: inherit the complete parent job publication gate
- `job_review_queue`: no anon/authenticated grants or policies
- `sources`: public `SELECT`
- `raw_ingest`: no anon policies
- `alert_subscriptions`: public `INSERT`

## Verify

```bash
npm run supabase:test    # REST + all 7 tables
npm run supabase:audit   # row counts
npm run db:test          # backend DATABASE_URL
npm run env:check        # same Supabase ref in frontend/backend env
```

## Connection strings

- **Backend / ingest:** Transaction pooler, port `6543`, prefix `postgresql+asyncpg://`
- **Never** expose pooler password or `service_role` in frontend env
