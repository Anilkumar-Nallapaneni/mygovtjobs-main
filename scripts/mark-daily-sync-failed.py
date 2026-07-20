#!/usr/bin/env python3
"""Mark daily-sync-state + stale sync_runs as failed (GHA cancel/timeout cleanup)."""
from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.database.session import SessionLocal  # noqa: E402
from app.services.daily_sync_service import DailySyncService  # noqa: E402
from app.services.sync_run_service import SyncRunService  # noqa: E402


async def main() -> int:
    reason = (
        os.environ.get("SYNC_FAIL_REASON")
        or "GitHub Actions cancelled or timed out before sync finished"
    )
    DailySyncService().mark_failed(reason)
    print(f"daily-sync-state marked failed: {reason}", flush=True)

    async with SessionLocal() as session:
        n = await SyncRunService().abandon_stale(session, older_than_hours=0)
    print(f"Abandoned {n} running sync_runs row(s)", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
