#!/usr/bin/env python3
"""Re-parse job titles + official PDFs to fill vacancies, dates, and full detail sections.

From repo root:
  npm run enrich:jobs              # default: 50 jobs
  npm run enrich:jobs -- --limit 100
  npm run enrich:jobs:all          # all live jobs
"""
import argparse
import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


def _log(message: str) -> None:
    try:
        print(message, flush=True)
    except UnicodeEncodeError:
        print(message.encode("ascii", "replace").decode("ascii"), flush=True)

from sqlalchemy import select

from app.database.session import SessionLocal
from app.models.job import Job
from app.parsers.notification_parser import NotificationParser
from app.services.job_pdf_enrich_service import enrich_job_from_pdfs

COMMIT_EVERY = 25


async def enrich_one_job(session, job: Job, parser: NotificationParser) -> bool:
    return await enrich_job_from_pdfs(session, job, parser)


async def main() -> None:
    argp = argparse.ArgumentParser()
    argp.add_argument("--limit", type=int, default=50, help="Max jobs to enrich (0 = all live)")
    argp.add_argument(
        "--only-missing-sections",
        action="store_true",
        help="Skip jobs that already have detail.content_sections",
    )
    argp.add_argument(
        "--include-expired",
        action="store_true",
        help="Also enrich expired jobs (default: live only)",
    )
    args = argp.parse_args()

    if args.limit < 0:
        raise SystemExit("Invalid --limit: use 0 for all jobs or a positive integer.")

    parser = NotificationParser()
    updated = 0
    scanned = 0

    async with SessionLocal() as session:
        statuses = ("live", "expired") if args.include_expired else ("live",)
        rows = (
            await session.execute(
                select(Job).where(Job.status.in_(statuses)).order_by(Job.published_at.desc())
            )
        ).scalars().all()
        if args.only_missing_sections:
            rows = [j for j in rows if not (j.detail or {}).get("content_sections")]

        cap = args.limit if args.limit else len(rows)
        total = min(len(rows), cap)
        if total == 0:
            _log("No eligible jobs found for metadata enrichment. Nothing to do.")
            return
        _log(f"Enriching up to {total} job(s)…")

        for job in rows:
            if args.limit and scanned >= args.limit:
                break
            scanned += 1
            title_preview = (job.title or "untitled")[:56]
            _log(f"[{scanned}/{total}] {title_preview}")

            try:
                if await enrich_one_job(session, job, parser):
                    updated += 1
            except Exception as exc:
                await session.rollback()
                _log(f"  skip: {exc}")

            if scanned % COMMIT_EVERY == 0:
                await session.commit()
                _log(f"  committed batch — {updated} updated so far")

        await session.commit()

    _log(f"Enriched {updated} jobs (scanned {scanned}).")


if __name__ == "__main__":
    asyncio.run(main())
