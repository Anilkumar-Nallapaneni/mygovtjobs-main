#!/usr/bin/env python3
"""CLI for GovtJobs Live Agent — all India + state government jobs & PDFs."""

from __future__ import annotations

import argparse
import asyncio
import http.server
import logging
import socketserver
import sys
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from agent.live_agent import GovtJobsLiveAgent  # noqa: E402
from agent.sync_sources import sync_sources  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(
        description="GovtJobs Live Agent — scrape official India & state govt job portals, PDFs, vacancies"
    )
    parser.add_argument("--sync-sources", action="store_true", help="Refresh config/sources.json from parent repo")
    parser.add_argument("--state", help="Filter by state code (e.g. up, mh, all)")
    parser.add_argument("--limit", type=int, help="Max number of sources to scrape (quick test)")
    parser.add_argument("--skip-pdfs", action="store_true", help="Skip PDF discovery on detail pages (faster)")
    parser.add_argument("--concurrency", type=int, default=6, help="Parallel source scrapers (default 6)")
    parser.add_argument("--serve", action="store_true", help="Open viewer after scrape (or serve existing data)")
    parser.add_argument("--port", type=int, default=8765, help="Viewer port (default 8765)")
    parser.add_argument("-v", "--verbose", action="store_true")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )

    if args.sync_sources:
        path = sync_sources()
        print(f"Sources synced → {path}")

    # Scrape unless serve-only (--serve --limit 0) or sync-only
    serve_only = args.serve and args.limit == 0
    sync_only = args.sync_sources and not args.serve and args.limit is None and not args.state
    should_scrape = not serve_only and not sync_only

    if should_scrape:
        agent = GovtJobsLiveAgent(concurrency=args.concurrency, discover_pdfs=not args.skip_pdfs)
        result = asyncio.run(
            agent.run(
                state_filter=args.state,
                source_limit=args.limit,
                skip_pdf_enrich=args.skip_pdfs,
            )
        )
        log = result["run_log"]
        print()
        print("=" * 60)
        print("GovtJobs Live Agent — run complete")
        print("=" * 60)
        print(f"  Sources scraped : {log['sourcesScraped']}")
        print(f"  Sources OK      : {log['sourcesOk']}")
        print(f"  Sources failed  : {log['sourcesFailed']}")
        print(f"  Live jobs       : {log['totalJobs']}")
        print(f"  PDF links       : {log['totalPdfs']}")
        print(f"  Duration        : {log['durationSeconds']}s")
        print(f"  Output folder   : {ROOT / 'output'}")
        print()

    if args.serve:
        serve_viewer(args.port)

    return 0


def serve_viewer(port: int) -> None:
    output_dir = ROOT / "output"

    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *a, **kw):
            super().__init__(*a, directory=str(ROOT), **kw)

        def end_headers(self):
            self.send_header("Access-Control-Allow-Origin", "*")
            super().end_headers()

    url = f"http://127.0.0.1:{port}/viewer/index.html"
    print(f"Viewer: {url}")
    print(f"Data:   {output_dir}")
    webbrowser.open(url)

    with socketserver.TCPServer(("", port), Handler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nStopped.")


if __name__ == "__main__":
    raise SystemExit(main())
