#!/usr/bin/env python3
"""Deliver new job alerts to email / Telegram subscribers.

From repo root:
  npm run alerts:deliver
  npm run alerts:deliver -- --lookback 72
"""
import argparse
import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.workers.alert_delivery_worker import run_alert_delivery  # noqa: E402


async def main() -> int:
    argp = argparse.ArgumentParser()
    argp.add_argument("--lookback", type=int, default=None, help="Hours of jobs to scan (default from env)")
    args = argp.parse_args()

    stats = await run_alert_delivery(lookback_hours=args.lookback)
    print(
        f"Alert delivery: jobs={stats['jobs']} subs={stats['subscriptions']} "
        f"sent={stats['sent']} skipped={stats['skipped']}",
        flush=True,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
