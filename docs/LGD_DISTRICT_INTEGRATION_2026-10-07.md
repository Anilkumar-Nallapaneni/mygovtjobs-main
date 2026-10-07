# Official LGD district integration — 2026-10-07

Implementation, source validation and dry-run are complete. **STOPPED before production migration/import.**
The supplied XLSX was not modified. No production database writes were made.
No district/place records were invented, supplemented, renamed or deleted from the source.

## 1. Files changed

Only the following files were created/edited for this integration (including the
previously requested importer fix). Pre-existing unrelated working-tree changes
were preserved. The supplied raw XLSX is an input, not a changed file.

| Area | Files |
| --- | --- |
| Import pipeline | `scripts/india/import_directory.py`; `scripts/india/normalize_lgd_districts.py`; `scripts/india/validate_lgd_districts.py`; `scripts/india/lgd_district_import.py` |
| Source artifacts | `data/india/lgd-state-mapping.json`; `data/india/normalized/lgd-districts.csv`; `data/india/raw/lgd/2026-10-07/All_Districtof_India_2026-10-07_17-55-02.metadata.json`; `data/india/README.md` |
| Backend/schema | `backend/app/routes/india.py`; `database/migrations/043_india_lgd_district_identity.sql` |
| Backend tests | `backend/tests/test_lgd_districts.py`; `backend/tests/test_lgd_postgres.py` |
| Frontend | `frontend/src/lib/indiaApi.ts`; `frontend/src/hooks/useIndiaExplorer.ts`; `frontend/src/data/india/indiaExplorer.ts`; `frontend/src/pages/IndiaExplorerPage.tsx`; `frontend/src/pages/StateExplorerPage.tsx`; `frontend/src/pages/DistrictExplorerPage.tsx`; `frontend/src/components/india/IndiaDataSources.tsx`; `frontend/src/tests/pages/IndiaExplorer.lgd.test.tsx` |
| Sitemap/audit/commands | `scripts/build-sitemap.mjs`; `scripts/lib/india-district-sitemap.mjs`; `scripts/lib/india-district-sitemap.test.mjs`; `scripts/audit-india-data-readiness.mjs`; `package.json` |
| Reports | `docs/audits/lgd-districts-dry-run.json`; this report |

`backend/tests/test_india_importer.py` and all other existing tests were left unchanged.
Neither the existing 041/042 migrations nor the canonical state IDs were rewritten.
Build output was checked against a backup of pre-build catalog/sitemap artifacts;
their content was unchanged, so no unrelated restoration or edits were necessary.

## 2. Source XLSX SHA-256

Source: `data/india/raw/lgd/2026-10-07/All_Districtof_India_2026-10-07_17-55-02.xlsx`

```text
387ce8805f54b68baaeda1dbc40751927e8eb981f2b48548ffeaf833a6881d68
```

Calculated before processing and checked again after implementation/testing.
The source metadata identifies the Ministry of Panchayati Raj, Government of
India, the official LGD XLSX download, download date, original filename,
worksheet and observed snapshot statistics.

## 3–8. Observed source and validation results

| Measure | Observed result |
| --- | ---: |
| Source district records detected | 784 |
| Valid records | 784 |
| Rejected records | 0 |
| State/UT coverage | 36/36 |
| Unique LGD district codes | 784 |
| Duplicate LGD district codes | 0 |
| Duplicate normalized districts | 0 |
| Unknown state mappings | 0 |

The worksheet `allDistrictofIndia` has 786 populated rows: one title, one real
header, and 784 district rows. All critical fields are populated. Source district
and state names are preserved verbatim. Excel numeric code values such as
`35.0` are represented as integer identifier strings (`35`), while text
identifiers retain their original form, including leading zeros.

The mapping explicitly checks both the LGD state code and exact state name,
and validates its 36 IDs against `frontend/src/data/states.ts`, excluding the
legacy map-only `ne` geometry. Unknown, missing or duplicate mappings fail.

The total 784 is asserted only for this dated snapshot's regression test.
Production validation does not hard-code a permanent district total. Re-running
normalization reports district-count changes and added/removed LGD codes against
the previous normalized snapshot, without automatically deleting database rows.

## 9. Normalized CSV

`data/india/normalized/lgd-districts.csv`

Contains the requested state/district LGD identifiers, authoritative names,
Census codes, explicit canonical state ID, source/provider/date/filename/checksum,
and `verified=true`. The validator reconstructs the expected rows from the
original workbook and checks all normalized fields by LGD district code.
Fabricated, missing, altered or incorrectly attributed records fail validation.

The parser uses Python's standard-library ZIP/XML support; no workbook authoring
or third-party spreadsheet runtime is required, and the source is never saved.
CSV readers support UTF-8 BOM. Header detection and normalization handle header
whitespace without silently altering district names.

## 10. Dry-run results

Both XLSX input and normalized CSV input were exercised against the configured
live database using read-only transactions. They returned the same results:

| Measure | Result |
| --- | ---: |
| Existing database district records seen | 0 |
| Prospective inserts | 784 |
| Prospective updates | 0 |
| Prospective unchanged | 0 |
| Identity/source/name/slug conflicts | 0 |
| Database writes | **0** |
| Migration 043 required | **Yes** |
| Dry-run result | **PASS** |

Machine-readable report: `docs/audits/lgd-districts-dry-run.json`.

The database transaction starts with `SET TRANSACTION ISOLATION LEVEL REPEATABLE
READ, READ ONLY`. It performs source/state/schema/district reads and rolls back;
it never attempts DML, snapshot logging, import-run writes or a commit. Validation
and source reconciliation occur before `SessionLocal()`. Database-unavailable
errors fail the command and leave prospective counts unknown instead of assuming
an empty database.

## 11. Database migration changes

New additive migration: `043_india_lgd_district_identity.sql` — **not applied to production**.

It adds nullable LGD state/district codes, Census codes and JSON provenance to
existing `india_districts`, with a unique index on `lgd_district_code`. Existing
UUIDs and city/place foreign keys remain intact. A private, RLS-enabled source
snapshot table stores the checksum, metadata and normalized source records to
preserve import history. No existing table is truncated/dropped or data deleted.

The explicitly selected apply mode replans under a district-table write lock,
refuses unresolved conflicts or older source snapshots, and uses controlled
`ON CONFLICT (lgd_district_code) DO UPDATE`. Unchanged district rows are skipped.
Unclaimed pending records can retain their UUID when their exact name/state
matches; independently verified records from another source are blocked for review.

Existing API endpoints and verified-only filters are retained. District responses
include the database UUID, source record ID/name, LGD codes and provenance.
Optional new columns are read through `to_jsonb` so the API remains compatible
while migration 043 is pending.

State-name routes such as `/india/karnataka` resolve to `ka` without adding IDs.
Canonical links remain `/india/ka` and `/india/ka/district/<UUID>`. The UI renders
backend data, LGD attribution, and explicit empty/error states. Unavailable
district pages receive `noindex,follow`. The district sitemap only accepts
verified persisted district UUIDs and canonical states from database reads;
it never turns the normalized CSV into indexable URLs before import. The build
produced an empty `districts.xml`, consistent with the current empty database.

## 12–13. Tests/commands executed and exact final results

| Executed command | Final result |
| --- | --- |
| `node scripts/run-python.mjs scripts/india/normalize_lgd_districts.py` | PASS; 784 rows normalized, 36 States/UTs |
| `npm run india:validate:lgd` | PASS; exact XLSX/CSV/provenance reconciliation |
| `node scripts/run-python.mjs -m pytest backend/tests/test_lgd_districts.py -q` | PASS; 33 passed |
| `node scripts/run-python.mjs -m pytest backend/tests/test_lgd_postgres.py -q` | PASS; 2 passed against ephemeral local PostgreSQL 18 |
| `npm run test:backend` | PASS; 315 passed, 1 skipped, 1 warning |
| `npm run type-check` | PASS; exit 0 |
| `npm run lint` | PASS; exit 0, zero lint warnings |
| `npm run test` | PASS; 91 frontend test files / 455 tests; 315 backend tests passed / 1 skipped; 7 script tests passed |
| `npm run build` | PASS; TypeScript, sitemap, catalog validation, Vite/PWA and prerender completed |
| `npm run audit:india` | PASS; 16 checks |
| `npm run audit:india:data` | PASS; 7 source readiness checks; explicitly does not certify production import |
| `npm run test:scripts` | PASS; 7 passed |
| `npm run test --prefix frontend -- --run src/tests/pages/IndiaExplorer.lgd.test.tsx` | PASS; 7 passed |
| CSV dry-run (command below) | PASS; 784 inserts / 0 updates / 0 unchanged / 0 writes |
| XLSX dry-run (command below) | PASS; same counts, 0 writes |
| `git diff --check` | PASS; exit 0 |

Commands used for dry-runs:

```powershell
node scripts/run-python.mjs scripts/india/import_directory.py lgd-districts --district-file data/india/normalized/lgd-districts.csv --dry-run --report docs/audits/lgd-districts-dry-run.json
npm run india:import:lgd -- --district-file data/india/raw/lgd/2026-10-07/All_Districtof_India_2026-10-07_17-55-02.xlsx --dry-run
```

Coverage includes title/header detection, the 784-row snapshot, 36-unit mapping,
code uniqueness, empty workbook, missing columns, duplicate codes/districts,
unknown/missing/duplicate state mappings, BOM/header whitespace, altered source
values/provenance, validation before sessions, zero-write dry-run, conflict guards,
UPSERT idempotence, real SQL UUID/foreign-key preservation, verified-only API
responses, state filtering, provenance, frontend rendering/empty/error states,
canonical route behavior, and verified-only sitemap generation.

Actual migration/UPSERT/API SQL was tested in automatically started/stopped
temporary PostgreSQL clusters bound to `127.0.0.1`, with fixed test-only connection
URLs. Production settings were never used for test writes.

Earlier development runs: the first local PostgreSQL fixture attempt **FAIL**ed
with two setup timeouts because Windows inherited subprocess capture pipes;
file-backed process output fixed this, and the next local SQL run and full backend
runs **PASS**ed. The first lint run **FAIL**ed on a missing `node:process` test
import; that import was added, and lint then **PASS**ed. No existing test was
modified or weakened. No failures remain in the final required command runs.

Existing test/build output still includes a FastAPI/Starlette deprecation warning,
Happy DOM teardown AbortError messages (Vitest reports all tests passed), and
npm's `global-ignore-file` configuration warning. These do not change the exit-0
results above. The one backend skip was already present before this integration.

## 14. Proposed production commands — NOT EXECUTED

After explicit approval, apply migration 043 first:

```powershell
npm run db:migrate -- --from 043 --migrations-only
```

Then the exact proposed production import command is:

```powershell
npm run india:import:lgd -- --district-file data/india/normalized/lgd-districts.csv --source-file data/india/raw/lgd/2026-10-07/All_Districtof_India_2026-10-07_17-55-02.xlsx --apply
```

After a successful approved import, generate verified district sitemap URLs:

```powershell
npm run build:sitemap
```

No production migration, `--apply` import, deployment or publication was executed.

Implementation references: [PostgreSQL ON CONFLICT](https://www.postgresql.org/docs/current/sql-insert.html),
[Supabase table access and RLS](https://supabase.com/docs/guides/database/tables).
The Supabase changelog and relevant current PostgreSQL upgrade notice were checked;
the migration does not introduce ltree, pgcrypto encryption, btree_gist indexes or
custom operators covered by the [upgrade notice](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes).
