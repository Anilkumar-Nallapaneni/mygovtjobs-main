#!/usr/bin/env python3
"""Export live-jobs.json from DB after a partial daily sync (ingest already completed)."""
from __future__ import annotations

import asyncio
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.database.session import SessionLocal  # noqa: E402
from app.services.daily_sync_service import DailySyncService  # noqa: E402
from app.services.job_persist_service import JobPersistService  # noqa: E402
from app.services.supabase_audit_service import SupabaseAuditService  # noqa: E402


async def main() -> int:
    scraped = int(sys.argv[1]) if len(sys.argv) > 1 else 154
    async with SessionLocal() as session:
        count = await JobPersistService().export_live_jobs_json(session)
        audit = await SupabaseAuditService().table_counts(session)
        for k, v in audit.items():
            print(f"  {k}: {v}", flush=True)
    persist = JobPersistService()
    block = DailySyncService().daily_sync_json_block(job_count=count, sources_scraped=scraped)
    persist.patch_live_jobs_daily_sync(block)
    print(f"Exported {count} jobs to live-jobs.json", flush=True)
    # Keep hero vacancy totals honest after every export (result/cutoff noise).
    scrub = subprocess.run(
        [sys.executable, str(ROOT / "scripts" / "scrub-vacancy-counts.py")],
        cwd=str(ROOT),
        check=False,
    )
    if scrub.returncode != 0:
        print("warn: vacancy scrub after export failed", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
