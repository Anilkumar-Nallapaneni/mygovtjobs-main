# GovtJobs Live Data

Standalone agent that scrapes **100+ official India & state government job portals**, collects **live vacancies**, discovers **PDF notifications**, and saves everything as JSON with a built-in viewer.

## What it collects

| Output file | Contents |
|-------------|----------|
| `output/websites.json` | All monitored official portals (UPSC, SSC, every state PSC, banks, railways, police, etc.) |
| `output/live-jobs.json` | All live vacancy listings with links |
| `output/all-pdfs.json` | Every PDF notification link found |
| `output/by-state/*.json` | Jobs grouped state-wise (`all-india.json`, `up.json`, `mh.json`, …) |
| `output/run-log.json` | Scrape run stats & per-source results |

## Quick start (Windows)

```powershell
cd "govtjobs live-data"
pip install -r requirements.txt
python run.py --sync-sources    # load 100+ official sites from parent repo
python run.py --limit 15        # quick test (15 sources)
python run.py                   # full scrape (all sources, ~10–30 min)
python run.py --serve           # open browser viewer
```

Or double-click `run.bat` after installing dependencies.

## Commands

```bash
# Refresh source list from parent mygovtjobs repo
python run.py --sync-sources

# Full India + all states scrape
python run.py

# Single state only
python run.py --state up
python run.py --state mh

# Fast run (no PDF detail-page discovery)
python run.py --skip-pdfs

# Scrape then open viewer
python run.py --serve

# Viewer only (existing data)
python run.py --serve --limit 0
```

## Viewer

After a scrape, run:

```bash
python run.py --serve
```

Opens **http://127.0.0.1:8765/viewer/index.html** with three tabs:

1. **Vacancies** — filter by state, category, search
2. **All PDFs** — every official PDF link
3. **Websites** — all portals with job/PDF counts

## Sources covered

- **All India**: UPSC, SSC, IBPS, RBI, railways (RRB), defence (Army/Navy/IAF), banks, PSUs (ONGC, NTPC, BHEL…), teaching (UGC, KVS, NVS), health (AIIMS, ESIC)
- **Every state**: APPSC, BPSC, MPSC, TNPSC, UPPSC, WBPSC, and 25+ more state PSCs
- **State boards**: UPSSSC, HSSC, RSSB, MPESB, etc.
- **State police**: UP, MH, TN, RJ, MP, KL, KA recruitment portals

Sources are synced from `../scripts/scraper_registry.json` + `../frontend/src/data/officialSites.ts`.

## Architecture

```
govtjobs live-data/
├── agent/
│   ├── live_agent.py      # Main orchestrator
│   ├── html_scraper.py    # Portal HTML link extraction
│   ├── rss_scraper.py     # RSS/Atom feeds
│   ├── pdf_discover.py    # PDF links on detail pages
│   ├── export.py          # JSON output writer
│   └── sync_sources.py    # Source catalog sync
├── config/
│   ├── sources.json       # 100+ official sites (auto-generated)
│   ├── feeds.json         # RSS feed URLs
│   └── states.json        # State code → name map
├── output/                # Generated live data
├── viewer/index.html      # Browser dashboard
└── run.py                 # CLI entry point
```

## Notes

- Only **official** `.gov.in` / `.nic.in` portals — no third-party aggregators.
- Some portals block bots or need JavaScript; those appear as `error` in `websites.json`.
- Re-run daily for fresh vacancies: `python run.py`
