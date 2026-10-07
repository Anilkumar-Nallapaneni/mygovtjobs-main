# LiveGovtJobs full code audit — 2026-10-06

## Executive result
The India Explorer architecture is present and routes are wired. The reason state-wise districts are not visible is confirmed: `data/india/lgd-districts.csv` contains zero district rows, while the public API intentionally returns only verified database rows. This is a source-data/import gap, not a missing React route.

## P0 — must fix before claiming complete India coverage
1. Load the current authoritative LGD district dataset and verify all 36 state/UT mappings.
2. Apply/verify migrations 041 and 042 in the production database.
3. Run the district import dry-run, review counts/rejects, then apply.
4. Confirm representative endpoints (`ka`, `up`, `tn`, `dl`, `la`, `an`) return verified districts.
5. Resolve the local Python database SSL health error without disabling TLS verification.

## P1 — truth and data quality
- API directory queries correctly filter `verification_status='verified'`.
- State pages now expose API failure separately from an empty verified dataset.
- Do not use `stateFacts.ts` / `indiaFacts.ts` as proof of current administrative counts unless every displayed fact is source-attributed and dated. Static copy can age.
- Keep source URL, source record ID, verification status and verified timestamp for imported records.
- Do not generate/fill missing district, city, school, hospital, company, hotel, tourism or scheme records.

## P1 — UI/CSS
The India Explorer previously mixed dark-theme variables with hard-coded light cards, producing inconsistent contrast. A final scoped polish layer now uses neutral readable surfaces, consistent borders/shadows, visible focus states, explicit warning/error states and a dark-mode fallback. Existing global site CSS was not destructively rewritten.

## P1 — importer/data model
The importer is safe-by-default (dry-run) and requires a registered source. However, city/place imports currently do not establish district relationships automatically; this should be extended before city-level rollout so district pages can show complete city/place counts.

## Validation performed in this audit
- `audit-india-platform.mjs`: PASS 16/16.
- New `audit-india-data-readiness.mjs`: correctly FAILS because bundled LGD district CSV has 0 data rows.
- Type-check could not be meaningfully executed in the isolated audit copy because dependencies/node_modules were not installed. Run `npm ci` followed by the normal checks locally.

## Release gate
Do not label state/district coverage complete until `npm run audit:india:data` passes and production API sampling confirms district rows for all 36 state/UT units.
