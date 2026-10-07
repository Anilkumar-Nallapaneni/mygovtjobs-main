# India district visibility audit — 2026-10-06

## Root cause
The State Explorer and `/api/india/states/{state_id}/districts` route are wired correctly, but `data/india/lgd-districts.csv` in this release is empty (0 data rows). The API deliberately returns only `verification_status='verified'` district rows. Therefore a state can correctly render **0 districts** until an authoritative district dataset is imported into the production database.

This is a data-readiness issue, not a map click/routing issue. The UI must not fill the gap with generated district names.

## Truth policy
- Administrative hierarchy: use Local Government Directory (LGD) as the primary operational source.
- Keep `source_url`, source record ID, verification status and verification time.
- Do not label static/legacy counts as current official counts.
- Do not publish fabricated schools, hospitals, companies, hotels, tourism places or other directory entities.
- A missing source must render an explicit “not loaded / not verified” state.

## Required production sequence
1. Apply migrations `041_india_explorer.sql` and `042_india_explorer_backend.sql`.
2. Obtain/export the current district dataset from the official LGD source.
3. Normalize it to `state_id,name,source_record_id,source_url` using the 36 internal state IDs.
4. Dry-run: `npm run india:import -- districts data/india/lgd-districts.csv --source "Local Government Directory (LGD)"`.
5. Review rejects/counts and state mapping.
6. Apply: append `--apply` only after verification.
7. Run `npm run audit:india` and `npm run audit:india:data`.
8. Test `/api/india/states/ka/districts` (and representative states/UTs) before production deployment.

## UI changes in this release
State pages now distinguish an API failure from an empty verified dataset. Empty states explicitly explain that no unverified district names will be substituted. India Explorer styling was normalized to cleaner light surfaces with a controlled dark-mode fallback, stronger focus states and clearer data-trust messages.
