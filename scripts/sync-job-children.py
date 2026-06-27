#!/usr/bin/env python3
"""Backfill job_posts / job_dates + detail.post_name from existing content_sections."""
import argparse
import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from sqlalchemy import select

from app.database.session import SessionLocal
from app.models.job import Job
from app.services.job_child_service import sync_job_children

COMMIT_EVERY = 50


async def main() -> None:
    argp = argparse.ArgumentParser()
    argp.add_argument("--limit", type=int, default=0, help="Max jobs (0 = all with content_sections)")
    args = argp.parse_args()

    updated = 0
    scanned = 0

    async with SessionLocal() as session:
        rows = (
            await session.execute(select(Job).where(Job.status.in_(("live", "expired"))))
        ).scalars().all()

        for job in rows:
            if not (job.detail or {}).get("content_sections"):
                continue
            if args.limit and scanned >= args.limit:
                break
            scanned += 1
            if await sync_job_children(session, job):
                updated += 1
            if scanned % COMMIT_EVERY == 0:
                await session.commit()
                print(f"  committed — {updated} updated", flush=True)

        await session.commit()

    print(f"Synced children for {updated}/{scanned} jobs with content_sections.", flush=True)


if __name__ == "__main__":
    asyncio.run(main())
