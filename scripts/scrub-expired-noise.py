#!/usr/bin/env python3
"""List or delete expired non-recruitment rows (DB cleanup for audit purity).

Targets status=expired only — live jobs are never touched.

Deletion criteria (either matches):
  1. Python noise_filter rules (same as scrub-noise-titles.py)
  2. jobs:audit RECRUIT_RE miss on title and dept (audit-aligned)

Examples:
  node scripts/run-python.mjs scripts/scrub-expired-noise.py
  node scripts/run-python.mjs scripts/scrub-expired-noise.py --apply
"""
from __future__ import annotations

import argparse
import asyncio
import json
import re
import sys
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from sqlalchemy import delete, select

from app.database.session import SessionLocal
from app.models.job import Job
from app.models.job_related import JobDate, JobPost
from app.services.noise_filter import (
    is_junk_job_title,
    is_tender_or_procurement,
    looks_like_job_notification,
)

REPORT_PATH = ROOT / "scripts" / "expired-noise-report.json"
SAMPLE_LIMIT = 25

# Same pattern as scripts/audit-job-quality.mjs
RECRUIT_RE = re.compile(
    r"recruit|vacanc|notif|advert|exam|bharti|apply|post|constable|"
    r"group[\s-]*[i1-4]|cgl|ntpc|psc|ssc|upsc|railway|bank|police|teacher|defence|apprentice",
    re.I,
)


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


def _fails_audit_recruit_re(job: Job) -> bool:
    title = str(job.title or "").strip()
    dept = str(job.dept or "")
    if len(title) < 6:
        return False
    return not RECRUIT_RE.search(title) and not RECRUIT_RE.search(dept)


def _reason(job: Job) -> str:
    if is_tender_or_procurement(job.title or "", job.apply_url or ""):
        return "tender"
    if is_junk_job_title(job.title or "", job.apply_url or ""):
        return "junk"
    if not looks_like_job_notification(job.title or "", job.apply_url or ""):
        return "not_recruitment"
    if _fails_audit_recruit_re(job):
        return "audit_regex_miss"
    return "unknown"


def _should_delete(job: Job) -> bool:
    if str(job.status or "").lower() != "expired":
        return False
    return _is_noise(job) or _fails_audit_recruit_re(job)


async def run(*, apply: bool) -> dict:
    would_delete = 0
    samples: list[dict] = []
    reasons: Counter[str] = Counter()
    ids: list[str] = []

    async with SessionLocal() as session:
        rows = (
            await session.execute(
                select(Job).where(Job.status == "expired").order_by(Job.updated_at.desc())
            )
        ).scalars().all()
        total_expired = len(rows)

        for job in rows:
            if not _should_delete(job):
                continue
            would_delete += 1
            reason = _reason(job)
            reasons[reason] += 1
            ids.append(job.id)
            if len(samples) < SAMPLE_LIMIT:
                samples.append(
                    {
                        "slug": job.slug,
                        "title": str(job.title or "")[:100],
                        "reason": reason,
                    }
                )

        deleted = 0
        if apply and ids:
            # Child rows cascade; explicit delete for clarity on older schemas.
            await session.execute(delete(JobPost).where(JobPost.job_id.in_(ids)))
            await session.execute(delete(JobDate).where(JobDate.job_id.in_(ids)))
            await session.execute(delete(Job).where(Job.id.in_(ids)))
            await session.commit()
            deleted = len(ids)

    return {
        "total_expired": total_expired,
        "would_delete": would_delete,
        "deleted": deleted if apply else 0,
        "reasons": dict(reasons),
        "samples": samples,
        "applied": apply,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Delete expired noise jobs from Postgres")
    parser.add_argument("--apply", action="store_true", help="Permanently delete matching expired rows")
    args = parser.parse_args()

    result = asyncio.run(run(apply=args.apply))
    REPORT_PATH.write_text(
        json.dumps({**result, "at": datetime.now(UTC).isoformat()}, indent=2),
        encoding="utf-8",
    )
    print(json.dumps(result, indent=2))
    print(f"\nReport: {REPORT_PATH}")
    if not args.apply:
        print(f"Dry run — {result['would_delete']} expired row(s) would be deleted. Use --apply to commit.")
    else:
        print(f"Deleted {result['deleted']} expired noise row(s).")


if __name__ == "__main__":
    main()
