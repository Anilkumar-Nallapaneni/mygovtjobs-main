#!/usr/bin/env python3
"""Run JobDetailAgent — publish PDF/notification content to job detail UI."""
from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.agents.job_detail_agent import JobDetailAgent  # noqa: E402


async def main() -> int:
    parser = argparse.ArgumentParser(description="Build job detail pages from PDF/notification")
    parser.add_argument("--limit", type=int, default=0, help="Max jobs (0 = no cap)")
    parser.add_argument("--include-expired", action="store_true")
    parser.add_argument("--only-missing-sections", action="store_true", default=True)
    parser.add_argument("--force", action="store_true", help="Rebuild even if sections exist")
    parser.add_argument("--concurrency", type=int, default=4)
    args = parser.parse_args()

    agent = JobDetailAgent()
    stats = await agent.run(
        limit=args.limit,
        live_only=not args.include_expired,
        only_missing_sections=not args.force,
        concurrency=args.concurrency,
    )

    print("\n── JobDetailAgent summary ──")
    print(f"  Scanned:  {stats.get('scanned', 0)}")
    print(f"  Updated:  {stats.get('updated', 0)}")
    print(f"  Skipped:  {stats.get('skipped', 0)}")
    print(f"  Failed:   {stats.get('failed', 0)}")
    by = stats.get("by_source") or {}
    print(f"  Sources:  pdf={by.get('pdf', 0)} notification={by.get('notification', 0)} listing={by.get('listing', 0)}")
    return 0 if stats.get("failed", 0) == 0 else 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
