# Release audit — 2026-10-06

This package was assembled from the previously supplied LiveGovtJobs India Explorer package plus the production-backend package.

## Verified in this environment
- 241 Python files compiled successfully before release modifications.
- Required India Explorer files and contracts are checked by `npm run audit:india-explorer`.
- Importer has explicit backend package path bootstrapping.
- `scripts/run-python.mjs` supports root and backend virtual environments and sets PYTHONPATH.
- State → district → city/category API and UI routes are included.

## Not claimed as verified here
- Supabase connectivity, credentials, RLS execution against your production project.
- A full npm build with project dependencies, because this workspace does not contain the repository's installed node_modules.
- Live data import, because the authoritative CSV and production database are not available in this workspace.

## Release gate
Do not run `--apply` against production until migration, dry-run, database tests, frontend type-check/build and Vercel preview verification pass on the user's machine.
