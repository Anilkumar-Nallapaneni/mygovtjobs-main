#!/usr/bin/env python3
"""Run PdfReaderAgent — read official PDFs and memorize structured job content.

From repo root:
  npm run pdf:read              # 50 live jobs missing content_sections
  npm run pdf:read:live         # all live jobs missing sections
  npm run pdf:read:all          # live + expired, re-read all with PDFs
"""
from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from app.agents.pdf_reader_agent import PdfReaderAgent  # noqa: E402


def _log(message: str) -> None:
    try:
        print(message, flush=True)
    except UnicodeEncodeError:
        print(message.encode("ascii", "replace").decode("ascii"), flush=True)


async def main() -> int:
    parser = argparse.ArgumentParser(description="Read job PDFs and memorize content")
    parser.add_argument("--limit", type=int, default=50, help="Max jobs (0 = no cap)")
    parser.add_argument("--live-only", action="store_true", default=True)
    parser.add_argument("--include-expired", action="store_true", help="Also process expired jobs")
    parser.add_argument(
        "--only-missing",
        action="store_true",
        default=True,
        help="Skip jobs that already have detail.content_sections",
    )
    parser.add_argument("--force", action="store_true", help="Re-read PDFs even if already memorized")
    parser.add_argument("--concurrency", type=int, default=4, help="Parallel PDF fetches")
    parser.add_argument("--no-static", action="store_true", help="Skip job-details/*.json writes")
    parser.add_argument("--no-export", action="store_true", help="Skip live-jobs.json export")
    args = parser.parse_args()

    if args.limit < 0:
        _log("Invalid --limit: use 0 for all jobs or a positive integer.")
        return 2
    if args.concurrency < 1:
        _log("Invalid --concurrency: must be at least 1.")
        return 2

    live_only = not args.include_expired
    agent = PdfReaderAgent()
    stats = await agent.run(
        limit=args.limit,
        live_only=live_only,
        only_missing=not args.force,
        concurrency=args.concurrency,
        write_static=not args.no_static,
        export_live_json=not args.no_export,
    )

    _log("\n── PdfReaderAgent summary ──")
    _log(f"  Scanned:           {stats.get('scanned', 0)}")
    _log(f"  Memorized:         {stats.get('memorized', 0)}")
    _log(f"  Skipped (no PDF):  {stats.get('skipped_no_pdf', 0)}")
    _log(f"  Skipped (exists):  {stats.get('skipped_existing', 0)}")
    _log(f"  Failed:            {stats.get('failed', 0)}")
    _log(f"  Memory index:      {agent.memory_index_path}")
    if stats.get("scanned", 0) == 0:
        _log("No eligible jobs found for PDF reading. Nothing to do.")
        return 0
    if stats.get("failed", 0):
        _log("PdfReaderAgent reported failures. Re-run with a smaller --limit or inspect prior log lines for the first failing job.")
    return 0 if stats.get("failed", 0) == 0 else 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
