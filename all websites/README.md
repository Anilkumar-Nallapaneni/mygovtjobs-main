# All Websites Agent

Catalog **every government job website** across India — official portals and unofficial aggregators (Sarkari Result, etc.).

## What it collects

| Source | Type | Description |
|--------|------|-------------|
| `frontend/src/data/officialSites.ts` | Official | 100+ curated UPSC, SSC, PSC, PSU, bank, police portals |
| `scripts/scraper_registry.json` | Official | Enabled HTML/RSS scrapers |
| `scripts/official-sources.json` | Official | RSS/Atom feeds |
| `data/unofficial-portals.json` | Unofficial | Job aggregators (Sarkari Result, …) |

## Run

From repo root:

```bash
npm run websites:discover
```

With URL health checks (slower):

```bash
npm run websites:discover:probe
```

Direct Python:

```bash
node scripts/run-python.mjs "all websites/run.py"
node scripts/run-python.mjs "all websites/run.py" --probe --probe-limit 50
```

## Output (`all websites/output/`)

| File | Contents |
|------|----------|
| `all-websites.json` | Master index — all unique websites |
| `summary.json` | Counts by type, state, category |
| `domains.json` | Unique domains only |
| `by-type/official.json` | Official portals only |
| `by-type/unofficial.json` | Aggregator portals |
| `by-state/{code}.json` | Websites tagged per state/UT |
| `probe-results.json` | HTTP status when `--probe` is used |

## Notes

- **Official** = `.gov.in`, `.nic.in`, PSU/bank career portals (same rules as `official_hosts.py`).
- **Unofficial** aggregators are saved for **reference and coverage mapping** — production apply links still use official sources only.
