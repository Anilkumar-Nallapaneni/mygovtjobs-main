#!/usr/bin/env python3
"""Fast pass: set last_date / published_at on drafts from titles (no PDF download).

  node scripts/run-python.mjs scripts/enrich-draft-dates-from-titles.py --apply
"""
from __future__ import annotations

import argparse
import asyncio
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from sqlalchemy import select, update

from app.database.session import SessionLocal
from app.models.job import Job
from app.parsers.notification_parser import NotificationParser
from app.services.job_persist_service import _parse_date
from app.services.noise_filter import is_junk_job_title
from app.services.publish_gate import india_today

# Title-parsed dates past this are almost always OCR / range bugs (e.g. 2029–2030).
MAX_DEADLINE_DAYS = 365
_SKIP_NON_APPLY_TITLE = re.compile(
    r"list of candidates|provisionally (?:qualified|eligible|in-?eligible)|"
    r"short[\s-]?listed|\bresult\b|\badmit card\b|answer key|score ?card|merit list|"
    r"examination program|postponement|postpone|symposium|bids are invited|"
    r"call for nominations|certificate course",
    re.I,
)


async def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument(
        "--category",
        action="append",
        default=[],
        help="Restrict to jobs.category (repeatable), e.g. --category upsc --category ssc",
    )
    args = ap.parse_args()
    wanted = {c.strip().lower() for c in args.category if c.strip()}

    parser = NotificationParser()
    today = india_today()
    far = today + timedelta(days=MAX_DEADLINE_DAYS)
    updated = 0
    scanned = 0
    skipped_far = 0
    skipped_junk = 0

    async with SessionLocal() as session:
        q = select(Job).where(Job.status == "draft", Job.last_date.is_(None)).order_by(Job.published_at.desc())
        rows = (await session.execute(q)).scalars().all()
        if wanted:
            rows = [j for j in rows if (j.category or "").strip().lower() in wanted]

        for job in rows:
            if args.limit and scanned >= args.limit:
                break
            scanned += 1
            title = job.title or ""
            if is_junk_job_title(title, job.apply_url or job.source_url):
                skipped_junk += 1
                continue
            if _SKIP_NON_APPLY_TITLE.search(title):
                skipped_junk += 1
                continue
            fields = parser._extract_dates_from_title(title)
            last = _parse_date(fields.get("last_date"))
            published = _parse_date(fields.get("published_date") or fields.get("published_at"))
            if isinstance(last, datetime):
                last = last.date()
            if isinstance(published, datetime):
                published = published.date()
            if not last:
                continue
            if last < today:
                continue
            if last > far:
                skipped_far += 1
                continue

            print(f"  date last={last} | {title[:90]}", flush=True)
            if args.apply:
                values: dict = {
                    "last_date": last,
                    "updated_at": datetime.now(timezone.utc),
                }
                if published and not job.published_at:
                    values["published_at"] = datetime(
                        published.year, published.month, published.day, tzinfo=timezone.utc
                    )
                vac = parser._extract_from_title(title).get("vacancies")
                if vac and not job.vacancies:
                    values["vacancies"] = vac
                await session.execute(update(Job).where(Job.id == job.id).values(**values))
            updated += 1

        if args.apply:
            await session.commit()

    print(
        f"title-dates updated={updated} scanned={scanned} skipped_junk={skipped_junk} "
        f"skipped_far={skipped_far} apply={args.apply} categories={sorted(wanted) or 'all'}",
        flush=True,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
