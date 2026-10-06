# India Explorer implementation

## What is included

- `/india` — interactive India state/UT explorer using the existing SVG map engine.
- `/india/:stateId` — reusable state explorer with map, highlights, crops, industries, tourism, cities and all platform categories.
- `/india-map` — compatibility redirect to `/india`.
- `/india/:stateId/:category` — category-aware URL foundation; the shared state explorer remains visible so category pages can be expanded without duplicating layout.
- 36 real state/UT entries are used; the existing synthetic `ne` map entry is excluded from the public explorer.
- Reusable category cards and a single responsive stylesheet.
- Existing jobs, education, exams, results, scholarships and schemes are preserved and linked into the explorer.
- Existing India SVG and per-state SVG assets are reused; no new map dependency is required.
- State-level starter metadata covers agriculture, industries, tourism and cities. It is deliberately treated as presentation seed data, not as an authoritative statistical database.

## Data architecture for the next backend migration

The UI is ready to consume geographic entities using:

`states -> districts -> cities -> localities -> places`

Recommended future tables:

- `india_states`
- `india_districts`
- `india_cities`
- `india_localities`
- `india_places`
- `india_schools`
- `india_colleges`
- `india_universities`
- `india_companies`
- `india_industries`
- `india_agriculture`
- `india_tourism`
- `india_temples`
- `india_hotels`
- `india_hospitals`
- `india_transport`
- `india_sources`

Every factual record should eventually carry `source_url`, `source_name`, `verified_at`, `verification_status`, `latitude`, `longitude`, `state_id`, `district_id`, and `city_id` where applicable.

## Verification commands

From `frontend`:

```bash
npm ci
npm run type-check
npm run lint
npm test
npm run build
```

If `npm run build` fails because the live-jobs snapshot is stale, run the repository's existing snapshot/pipeline commands first; that is unrelated to the India Explorer UI.
