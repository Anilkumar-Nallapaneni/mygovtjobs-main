#!/usr/bin/env python3
"""
Three-agent live jobs pipeline (repo root):

  Agent 1 — IngestAgent      new live jobs from official scrapers
  Agent 2 — PdfReaderAgent   read PDFs, extract summary/vacancies
  Agent 3 — JobDetailAgent   publish detail UI (PDF > notification > listing)

Usage:
  npm run pipeline:live              # all 3 agents (skip ingest if ran today)
  npm run pipeline:live:full         # force daily sync + PDF + details
  npm run pipeline:details           # agent 3 only (after pdf:read)
"""
from __future__ import annotations

import argparse
import asyncio
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

NPM = "npm.cmd" if sys.platform == "win32" else "npm"


def run_npm(script: str, *extra: str) -> int:
    cmd = [NPM, "run", script, *extra]
    print(f"\n=== npm run {script} {' '.join(extra)} ===", flush=True)
    return subprocess.run(cmd, cwd=ROOT).returncode


async def run_agents(
    *,
    skip_ingest: bool,
    skip_pdf: bool,
    skip_details: bool,
    force_sync: bool,
    pdf_limit: int,
    detail_limit: int,
) -> int:
    code = 0

    if not skip_ingest:
        # --force-sync: one forced daily:sync (do not run twice)
        extra = ["--", "--force"] if force_sync else []
        code = run_npm("daily:sync", *extra)
        if code != 0 and not force_sync:
            print("Ingest step returned non-zero; continuing to PDF/details…", flush=True)

    if not skip_pdf:
        pdf_args: list[str] = []
        if pdf_limit > 0:
            pdf_args = ["--", "--limit", str(pdf_limit)]
        else:
            pdf_args = ["--", "--limit", "0", "--only-missing"]
        c = run_npm("pdf:read", *pdf_args)
        code = code or c

    if not skip_details:
        # Rebuild placeholders / missing sections (treat stub Overview as missing).
        detail_args: list[str] = ["--", "--force"]
        if detail_limit > 0:
            detail_args.extend(["--limit", str(detail_limit)])
        c = run_npm("job:details", *detail_args)
        code = code or c

        # Keep list/bootstrap in sync with full live-jobs.json after detail publish.
        c2 = run_npm("clean:live-jobs")
        code = code or c2

    print("\n=== Pipeline complete ===", flush=True)
    return code


def main() -> int:
    parser = argparse.ArgumentParser(description="Run ingest → PDF → job detail pipeline")
    parser.add_argument("--skip-ingest", action="store_true")
    parser.add_argument("--skip-pdf", action="store_true")
    parser.add_argument("--skip-details", action="store_true")
    parser.add_argument("--force-sync", action="store_true", help="Force daily sync even if ran today")
    parser.add_argument("--pdf-limit", type=int, default=0)
    parser.add_argument("--detail-limit", type=int, default=0)
    args = parser.parse_args()

    return asyncio.run(
        run_agents(
            skip_ingest=args.skip_ingest,
            skip_pdf=args.skip_pdf,
            skip_details=args.skip_details,
            force_sync=args.force_sync,
            pdf_limit=args.pdf_limit,
            detail_limit=args.detail_limit,
        )
    )


if __name__ == "__main__":
    raise SystemExit(main())
