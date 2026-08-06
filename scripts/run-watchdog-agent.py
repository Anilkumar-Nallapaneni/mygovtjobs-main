#!/usr/bin/env python3
"""Run WatchdogAgent — demote bad live jobs."""
from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.agents.watchdog_agent import WatchdogAgent  # noqa: E402


async def main() -> int:
    parser = argparse.ArgumentParser(description="AI Watchdog employee")
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--export", action="store_true")
    parser.add_argument("--limit", type=int, default=0)
    args = parser.parse_args()

    stats = await WatchdogAgent().run(apply=args.apply, export=args.export, limit=args.limit)
    print("\n── WatchdogAgent summary ──")
    print(f"  Scanned:  {stats.get('scanned', 0)}")
    print(f"  OK:       {stats.get('ok', 0)}")
    print(f"  Demoted:  {len(stats.get('demoted') or [])}")
    print(f"  Updated:  {stats.get('rowsUpdated', 0)}")
    print(f"  Apply:    {args.apply}")
    print(f"  Report:   {stats.get('reportPath')}")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
