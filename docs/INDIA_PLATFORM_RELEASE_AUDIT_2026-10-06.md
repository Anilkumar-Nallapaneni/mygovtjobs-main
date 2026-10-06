# India Platform Release Audit — 2026-10-06

## Scope

This release turns the India Explorer into a location-first layer of LiveGovtJobs:

`India -> State/UT -> District -> City -> Category`

Jobs are one category and do not control whether a State/UT or District appears.

## Public geography rule

The National Portal of India currently lists 28 States and 8 Union Territories. The code therefore exposes exactly 36 public units. A legacy `NE States` SVG geometry remains available only for map compatibility and is excluded from the public directory.

## Data trust rule

Do not publish invented schools, colleges, hospitals, hotels, companies, tourism locations, agriculture facts, industries or district facts. Directory records require a source and verified status. Current administrative hierarchy should come from the Local Government Directory (LGD); Open Government Data and Survey of India may be used where their dataset scope and date are appropriate.

## Implemented

- 36-state/UT public master.
- State cards visible independently of jobs.
- District glance/search on the India page.
- State -> district -> city navigation.
- Common category cards at State and District level.
- Live job counts are enrichment, not a visibility gate.
- Global verified district endpoint.
- Source-attributed database fields.
- India Explorer state URLs included in sitemap generation.
- Verified district sitemap generation when Supabase data is available.
- Importer Python path/dependency fixes.
- Static India platform audit command: `npm run audit:india`.

## Validation

- All backend Python files compile: PASS.
- Sitemap generator syntax: PASS.
- India platform static audit: PASS.
- Clean `npm ci` could not complete inside the isolated execution window; therefore a full TypeScript/Vite production build must still be run on the user's Windows machine before deployment.

## Release gate

Do not deploy until these commands pass locally:

```powershell
npm ci
npm run audit:india
npm run type-check
npm run lint
npm run test
npm run build
```

Then apply the database migration, import authoritative geography, run the API, test `/india`, several state pages and district pages, and deploy to a Vercel preview before production.
