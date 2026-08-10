# GitHub workflow audit

## Inventory

| Workflow | Trigger | Reads | Writes | Overlap and decision |
| --- | --- | --- | --- | --- |
| `ci.yml` | push to `main`, pull request | repository and committed snapshot | build/test artifacts only | Keep. Read-only CI. |
| `canonical-daily-pipeline.yml` | daily schedule, manual | official sources, Postgres, Supabase | `jobs`, ingest metadata, alerts, live snapshots, org index, sitemaps, Git commit | **Canonical daily publisher.** Gated by `ALLOW_CANONICAL_PIPELINE=true`. |
| `catalog-recovery-export.yml` | manual only | Postgres / publish gate | gated `live-jobs*.json` + sitemap commit | Fast recovery (demote/promote/export/verify) without full scrape. |
| `fetch-official-feeds.yml` | every four hours, manual | official RSS and archive portals | official feed/archive JSON and Git commit | Keep. Must **not** overwrite publish-gated `live-jobs.json`. |
| `weekly-enrich.yml` | Sunday, manual | existing jobs and official PDFs | existing job detail/PDF metadata | Keep. Enrichment only; serialize with the daily publisher. |
| `uptime-check.yml` | every 30 minutes, manual | production homepage/API/sync state | none | Keep as production health. |
| `weekly-portal-audit.yml` | Sunday, manual | official portal URLs and job links | uploaded report artifact; may update link-health | Keep. Serialize because link-health can update `jobs`. |
| `notify-on-failure.yml` | reusable workflow call | workflow metadata | external notification only | Keep. |

Legacy workflows `supabase-auto-ingest.yml`, `supabase-auto-ingest-self-hosted.yml`, and `ingest-api.yml` were removed (hard-disabled / superseded).

## Database and generated-file ownership

| Resource | Owner | Other permitted writers |
| --- | --- | --- |
| normalized `jobs` creation | `canonical-daily-pipeline.yml` through `JobPersistService` | manual recovery / local sync |
| existing job PDF/detail enrichment | `weekly-enrich.yml` | daily ingest may upsert the same record |
| job link-health fields | `weekly-portal-audit.yml` | none scheduled |
| `live-jobs*.json`, org index, sitemap | `canonical-daily-pipeline.yml` / `catalog-recovery-export.yml` | weekly enrich may regenerate locally |
| official RSS/archive JSON | `fetch-official-feeds.yml` | none |

## Concurrency policy

Every workflow that can mutate `jobs` or push generated publication data uses:

```yaml
concurrency:
  group: live-jobs-publication
  cancel-in-progress: false
```

## Gate variables

| Variable | Role |
| --- | --- |
| `ALLOW_CANONICAL_PIPELINE` | Enables scheduled canonical daily writer |
| `ALLOW_WEEKLY_ENRICH` | Enables weekly PDF/detail enrich |
| `ALLOW_RSS_REFRESH` | Enables 4h official feed commits |

`ALLOW_AUTO_INGEST` is legacy / unused.
