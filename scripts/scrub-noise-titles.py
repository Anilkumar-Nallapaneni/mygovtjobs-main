#!/usr/bin/env python3
"""Mark non-recruitment portal noise as expired (internships, trade fairs, nav pages, etc.).

Uses backend noise_filter rules — same logic as API list + frontend pipeline.

Examples:
  node scripts/run-python.mjs scripts/scrub-noise-titles.py
  node scripts/run-python.mjs scripts/scrub-noise-titles.py --apply --export
"""
from __future__ import annotations

import argparse
import asyncio
import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from sqlalchemy import select

from app.database.session import SessionLocal
from app.models.job import Job
from app.services.noise_filter import (
    is_junk_job_title,
    is_tender_or_procurement,
    looks_like_job_notification,
)

LIVE_JSON = ROOT / "frontend" / "public" / "data" / "live-jobs.json"
SAMPLE_LIMIT = 15


def _is_noise(job: Job) -> bool:
    title = job.title or ""
    url = job.apply_url or ""
    if is_tender_or_procurement(title, url):
        return True
    if is_junk_job_title(title, url):
        return True
    if not looks_like_job_notification(title, url):
        return True
    return False


async def run(*, apply: bool, export: bool) -> dict:
    marked = 0
    samples: list[str] = []
    reasons: Counter[str] = Counter()

    async with SessionLocal() as session:
        rows = (
            await session.execute(
                select(Job).where(Job.status.in_(("live", "expired"))).order_by(Job.updated_at.desc())
            )
        ).scalars().all()

        for job in rows:
            if not _is_noise(job):
                continue
            if job.status == "expired":
                continue
            marked += 1
            if len(samples) < SAMPLE_LIMIT:
                samples.append(f"{job.slug}: {str(job.title or '')[:80]}")
            if is_tender_or_procurement(job.title or "", job.apply_url or ""):
                reasons["tender"] += 1
            elif is_junk_job_title(job.title or "", job.apply_url or ""):
                reasons["junk"] += 1
            else:
                reasons["not_recruitment"] += 1
            if apply:
                job.status = "expired"

        if apply and marked:
            await session.commit()

    exported = 0
    if export and apply:
        from app.services.job_persist_service import JobPersistService

        async with SessionLocal() as session:
            exported = await JobPersistService().export_live_jobs_json(session)

    return {
        "would_mark": marked,
        "samples": samples,
        "reasons": dict(reasons),
        "applied": apply,
        "exported": exported,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Expire non-recruitment noise jobs in Postgres")
    parser.add_argument("--apply", action="store_true", help="Set matching live jobs to expired")
    parser.add_argument("--export", action="store_true", help="Re-export live-jobs.json after --apply")
    args = parser.parse_args()

    result = asyncio.run(run(apply=args.apply, export=args.export))
    print(json.dumps(result, indent=2))
    if not args.apply:
        print(f"\nDry run — {result['would_mark']} live row(s) would be marked expired. Use --apply to commit.")


if __name__ == "__main__":
    main()
