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

## Official LGD district XLSX pipeline

The 2026-10-07 download is retained unchanged under `raw/lgd/2026-10-07/`.
Its sibling `.metadata.json` records the provider, download date, worksheet,
SHA-256, district total and State/UT total. The explicit `lgd-state-mapping.json`
maps each exact LGD state name/code to the existing 36 canonical state IDs.
There is no fuzzy name matching and no generated district data.

From the repository root:

```powershell
npm run india:normalize:lgd
npm run india:validate:lgd
npm run india:import:lgd -- --district-file data/india/normalized/lgd-districts.csv --dry-run --report docs/audits/lgd-districts-dry-run.json
```

The normalizer checks the actual worksheet header after any title rows. Excel
numeric codes are represented as integer strings; text codes and all source
names are preserved. CSV headers support UTF-8 BOM and surrounding whitespace.
The validator reconciles every normalized record, identifier and provenance
field to the XLSX. Future snapshots can have different district counts; the
normalizer reports the change from the previously normalized snapshot rather
than enforcing 784 forever. A new download can use `--source-file` and
`--download-date` with both normalization and validation. The importer accepts
either that XLSX directly or a normalized CSV with `--source-file` pointing at
its authoritative XLSX.

Dry-run uses a PostgreSQL **READ ONLY** transaction and executes no INSERT,
UPDATE, DELETE, snapshot logging, or commits. It calculates insert/update/no-change
counts from existing records. It fails if database comparison is unavailable
(counts are reported as unknown), states are missing, or identity/source conflicts
exist. The pre-migration planner reads optional columns through `to_jsonb`.

Migration `043_india_lgd_district_identity.sql` is additive and is not applied
by normalization, validation, dry-run, tests against Supabase, or website builds.
It adds unique LGD district codes and provenance to existing district UUIDs,
plus a private source snapshot history table. Production application requires
separate approval. After approval only, the proposed commands are:

```powershell
npm run db:migrate -- --from 043 --migrations-only
npm run india:import:lgd -- --district-file data/india/normalized/lgd-districts.csv --source-file data/india/raw/lgd/2026-10-07/All_Districtof_India_2026-10-07_17-55-02.xlsx --apply
npm run build:sitemap
```

Apply replans inside a table lock before making changes. UPSERT is keyed by LGD
code, keeps existing UUIDs/relationships, blocks unrelated verified sources,
older snapshots and conflicting names/slugs, and keeps immutable source snapshot
history. It never deletes districts absent from a later snapshot. Such boundary
changes require explicit review. Existing generic CSV and education CLI modes
remain available; official LGD imports should use the dedicated `lgd-districts`
mode to enforce source reconciliation and stable external identity.

Public API paths are unchanged and return verified records with UUIDs plus LGD
codes/provenance. The UI uses the API rather than bundling the CSV in React.
State name slugs such as `/india/karnataka` resolve to the existing `ka` ID and
canonical `/india/ka` route. District sitemap URLs are generated only from
verified persisted database UUIDs; before the approved import the district
sitemap remains empty.
