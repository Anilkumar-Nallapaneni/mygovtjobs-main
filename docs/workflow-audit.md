# GitHub workflow audit

## Inventory

| Workflow | Trigger | Reads | Writes | Overlap and decision |
| --- | --- | --- | --- | --- |
| `ci.yml` | push to `main`, pull request | repository and committed snapshot | build/test artifacts only | Keep. Read-only CI; its own cancel-stale concurrency is correct. |
| `supabase-auto-ingest.yml` | daily schedule, manual | official sources, Postgres, Supabase | `jobs`, ingest metadata, alerts, live snapshots, org index, sitemaps, Git commit | Keep as the canonical daily publisher. Scheduled execution remains frozen unless `ALLOW_AUTO_INGEST=true`. |
| `fetch-official-feeds.yml` | every four hours, manual | official RSS and archive portals | official feed/archive JSON and Git commit | Keep. It does not own `jobs`, but shares the repository write lock because it pushes generated data. |
| `weekly-enrich.yml` | Sunday, manual | existing jobs and official PDFs | existing job detail/PDF metadata and regenerated snapshots | Keep. It is enrichment, not a second creation pipeline; serialize with the daily publisher. |
| `uptime-check.yml` | every 30 minutes, manual | production homepage/API/sync state | none | Keep as production health. |
| `weekly-portal-audit.yml` | Sunday, manual | official portal URLs and up to 80 job links | uploaded report artifact only; link probe may update DB link-health fields | Keep. Serialize because link-health can update `jobs`; no generated-data Git push. |
| `ingest-api.yml` | manual only | hosted API | hosted API can launch ingest | Keep deprecated/manual. No schedule, so it cannot overlap automatically. Add shared writer concurrency. |
| `supabase-auto-ingest-self-hosted.yml` | manual only, job `if: false` | legacy local runner | disabled | Keep disabled for recovery history; no execution path exists. |
| `notify-on-failure.yml` | reusable workflow call | workflow metadata | external notification only | Keep. It is support infrastructure, not publication. |

## Database and generated-file ownership

| Resource | Owner | Other permitted writers |
| --- | --- | --- |
| normalized `jobs` creation | `supabase-auto-ingest.yml` through `JobPersistService` | manual `ingest-api.yml` only |
| existing job PDF/detail enrichment | `weekly-enrich.yml` | daily ingest may update the same record through the canonical upsert |
| job link-health fields | `weekly-portal-audit.yml` | none scheduled |
| `live-jobs*.json`, org index, sitemap | `supabase-auto-ingest.yml` | `weekly-enrich.yml` can regenerate locally but currently does not commit |
| official RSS/archive JSON | `fetch-official-feeds.yml` | none |

## Concurrency policy

Every workflow that can mutate `jobs` or push generated publication data uses:

```yaml
concurrency:
  group: live-jobs-publication
  cancel-in-progress: false
```

This is a repository-wide lock across daily ingest, feed commits, weekly
enrichment, link-health updates, and the manual API trigger. Read-only CI and
uptime checks retain independent concurrency behavior.

## Schedule decisions

No schedule was deleted. The two legacy ingest routes are already manual-only,
and the self-hosted job is additionally disabled. The official-feed schedule is
not a duplicate job publisher; it owns different generated files. The weekly
enrichment schedule updates existing records rather than creating an alternate
approval route.

Automatic database writers remain protected by the repository variable
`ALLOW_AUTO_INGEST`. Re-enable only after strict snapshot, live-data audit, and
production verification pass at the desired minimum catalog size.
