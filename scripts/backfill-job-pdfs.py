#!/usr/bin/env python3
"""Backfill detail.pdf_url for live jobs missing a PDF link. Run from repo root:
  backend\\.venv\\Scripts\\python scripts\\backfill-job-pdfs.py
Optional: --limit 100
"""
import argparse
import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from sqlalchemy import select

from app.database.session import SessionLocal
from app.models.job import Job
from app.parsers.notification_parser import NotificationParser
from app.parsers.pdf_parser import parse_pdf_url
from app.scrapers.pdf_discover import ensure_pdf_urls


def _log(msg: str) -> None:
    """Print safely on Windows consoles (cp1252) and UTF-8 terminals."""
    try:
        print(msg, flush=True)
    except UnicodeEncodeError:
        print(msg.encode("ascii", errors="replace").decode("ascii"), flush=True)


def _has_pdf(job: Job) -> bool:
    detail = job.detail or {}
    if detail.get("pdf_url"):
        return True
    urls = detail.get("pdf_urls") or []
    return bool(urls) or (job.apply_url and ".pdf" in str(job.apply_url).lower())


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=0, help="Max jobs to process (0 = all missing)")
    args = parser.parse_args()

    notif = NotificationParser()
    updated = 0
    scanned = 0

    async with SessionLocal() as session:
        rows = (
            await session.execute(select(Job).where(Job.status == "live").order_by(Job.published_at.desc()))
        ).scalars().all()

        for job in rows:
            if _has_pdf(job):
                continue
            scanned += 1
            if args.limit and scanned > args.limit:
                break

            pdf_urls = await ensure_pdf_urls([], job.apply_url)
            pdf_fields = {}
            if pdf_urls:
                pdf_fields = await parse_pdf_url(pdf_urls[0])

            normalized = notif.parse(
                {
                    "title": job.title,
                    "link": job.apply_url,
                    "pdfUrls": pdf_urls,
                    "source": (job.detail or {}).get("source"),
                },
                pdf_fields=pdf_fields,
            )
            detail = dict(job.detail or {})
            detail["pdf_url"] = normalized.get("detail", {}).get("pdf_url")
            detail["pdf_urls"] = normalized.get("detail", {}).get("pdf_urls") or []
            if detail.get("pdf_url"):
                job.detail = detail
                updated += 1
                _log(f"ok {job.title[:60]} -> {detail['pdf_url'][:70]}")
            else:
                _log(f"-  {job.title[:60]} (no PDF found)")

        await session.commit()

    _log(f"\nDone. scanned={scanned} updated={updated}")


if __name__ == "__main__":
    asyncio.run(main())
