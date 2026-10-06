# India Explorer V2 — State → District → City → Category

## Product contract
- India landing: 36 states/UTs, verified overview, map and search.
- State: verified state profile, district list, city count and all common categories.
- District: verified district profile, cities and the same category set.
- Categories: jobs, education, agriculture, industries, companies, tourism, temples/heritage, hotels, hospitals, transport, schemes and GK.
- Public directory records are source-attributed and verification-gated.
- No nationwide placeholder records are generated. If a dataset has not been imported, the UI says so.

## Important implementation boundary
Jobs use the existing LiveGovtJobs job service at state level. A district job view is only meaningful after a reliable district-to-job location mapping exists; this release does not fabricate that mapping. Directory categories support district/city filters directly.

## Data pipeline
1. Apply migrations 041 and 042.
2. Import authoritative LGD district data.
3. Import authoritative city/local directory data.
4. Import verified schools/colleges/hospitals/hotels/etc. with source attribution.
5. Run dry-run audits.
6. Apply imports.
7. Run frontend/backend tests and preview deployment.

## Importer
The importer now makes `backend` importable both directly and through `scripts/run-python.mjs`, and the runner can use either root `.venv` or `backend/.venv`.
