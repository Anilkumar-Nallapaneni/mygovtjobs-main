# India Explorer data pipeline

This directory is intentionally source-first. Do not add invented directory records.

## Official/primary sources

- Local Government Directory (LGD): https://lgdirectory.gov.in/
- Open Government Data Platform India: https://data.gov.in/
- Survey of India administrative boundaries: https://onlinemaps.surveyofindia.gov.in/
- Census of India location-code directory: https://censusindia.gov.in/nada/index.php/catalog/42648
- Census of India data tables: https://censusindia.gov.in/census.website/node/91

## Import policy

1. Download/export a dataset from the source.
2. Preserve the source URL and source record ID.
3. Normalize state IDs to the LiveGovtJobs `india_states.id` values.
4. Run a dry-run import first.
5. Review rejected rows.
6. Use `--apply` only after validation.
7. Every public record must be verified/source-attributed.

See `scripts/india/import_directory.py`.
