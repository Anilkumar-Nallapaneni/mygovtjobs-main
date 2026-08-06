#!/usr/bin/env python3
"""Run full AI employee workforce: QA (state-wise) → publish → watchdog."""
from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.agents.ai_employees import run_ai_employees  # noqa: E402


async def main() -> int:
    parser = argparse.ArgumentParser(description="AI employees daily run")
    parser.add_argument("--apply", action="store_true", help="Write DB changes")
    parser.add_argument("--publish", action="store_true", help="Promote gate-passing drafts")
    parser.add_argument("--watchdog", action="store_true", help="Demote bad live jobs")
    parser.add_argument("--export", action="store_true", help="Refresh live-jobs.json after publish/watchdog")
    parser.add_argument(
        "--buckets",
        default="",
        help="Comma-separated buckets (default: all state buckets)",
    )
    parser.add_argument("--limit", type=int, default=0, help="Limit promotions / watchdog scan")
    parser.add_argument("--no-llm", action="store_true")
    args = parser.parse_args()

    buckets = [b.strip() for b in args.buckets.split(",") if b.strip()] or None
    report = await run_ai_employees(
        apply=args.apply,
        publish=args.publish,
        watchdog=args.watchdog,
        export=args.export,
        buckets=buckets,
        limit=args.limit,
        use_llm=False if args.no_llm else None,
    )

    print("\n── AI Employees summary ──")
    totals = report.get("totals") or {}
    print(f"  Scanned:     {totals.get('scanned', 0)}")
    print(f"  Approved:    {totals.get('approved', 0)}")
    print(f"  Needs fix:   {totals.get('needs_fix', 0)}")
    print(f"  Rejected:    {totals.get('rejected', 0)}")
    print(f"  Rows updated:{totals.get('rowsUpdated', 0)}")
    for name, stats in (report.get("buckets") or {}).items():
        print(
            f"  [{name}] scanned={stats.get('scanned', 0)} "
            f"approved={stats.get('approved', 0)} "
            f"needs_fix={stats.get('needs_fix', 0)} "
            f"rejected={stats.get('rejected', 0)}"
        )
    if report.get("publishResult"):
        print(f"  Publish:     rc={report['publishResult'].get('returncode')}")
        print(f"               {(report['publishResult'].get('stdout') or '').strip()[-300:]}")
    if report.get("watchdogResult"):
        wd = report["watchdogResult"]
        print(f"  Watchdog:    ok={wd.get('ok')} demoted={wd.get('demoted')}")
    print(f"  Apply:       {args.apply}")
    print(f"  Report:      {report.get('reportPath')}")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
