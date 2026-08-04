#!/usr/bin/env python3
"""Enrich draft RECRUITMENT jobs missing last_date from official PDFs.

Standalone script (does not modify enrich-jobs-metadata.py).

  node scripts/run-python.mjs scripts/enrich-draft-jobs-from-pdf.py --limit 600
"""
from __future__ import annotations

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

from sqlalchemy import select

from app.database.session import SessionLocal
from app.models.job import Job
from app.parsers.notification_parser import NotificationParser
from app.services.job_pdf_enrich_service import enrich_job_from_pdfs

COMMIT_EVERY = 25


def _log(message: str) -> None:
    try:
        print(message, flush=True)
    except UnicodeEncodeError:
        print(message.encode("ascii", "replace").decode("ascii"), flush=True)


def _has_pdf(job: Job) -> bool:
    detail = job.detail if isinstance(job.detail, dict) else {}
    return bool(
        job.primary_pdf_url
        or detail.get("pdf_url")
        or detail.get("pdf_urls")
        or (job.apply_url and ".pdf" in str(job.apply_url).lower())
    )


async def main() -> int:
    argp = argparse.ArgumentParser()
    argp.add_argument("--limit", type=int, default=200)
    args = argp.parse_args()

    parser = NotificationParser()
    updated = 0
    scanned = 0

    async with SessionLocal() as session:
        rows = (
            await session.execute(
                select(Job)
                .where(Job.status == "draft")
                .order_by(Job.published_at.desc())
            )
        ).scalars().all()

        rows = [
            j
            for j in rows
            if j.last_date is None and (j.document_type or "").upper() == "RECRUITMENT"
        ]
        with_pdf = [j for j in rows if _has_pdf(j)]
        without = [j for j in rows if not _has_pdf(j)]
        rows = with_pdf + without

        cap = args.limit if args.limit else len(rows)
        total = min(len(rows), cap)
        _log(f"Enriching up to {total} draft recruitment job(s) missing dates…")

        for job in rows:
            if args.limit and scanned >= args.limit:
                break
            scanned += 1
            title_preview = (job.title or "untitled")[:56]
            _log(f"[{scanned}/{total}] {title_preview}")
            try:
                if await enrich_job_from_pdfs(session, job, parser):
                    updated += 1
            except Exception as exc:
                await session.rollback()
                _log(f"  skip: {exc}")
            if scanned % COMMIT_EVERY == 0:
                await session.commit()
                _log(f"  committed batch — {updated} updated so far")

        await session.commit()

    _log(f"Enriched {updated} draft jobs (scanned {scanned}).")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
