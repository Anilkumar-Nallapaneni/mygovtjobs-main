#!/usr/bin/env python3
"""Enrich draft RECRUITMENT jobs missing last_date from official PDFs.

Standalone script (does not modify enrich-jobs-metadata.py).

  node scripts/run-python.mjs scripts/enrich-draft-jobs-from-pdf.py --limit 600
  node scripts/run-python.mjs scripts/enrich-draft-jobs-from-pdf.py --source upsc --source ssc --limit 200
"""
from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

reconfigure = getattr(sys.stdout, "reconfigure", None)
if callable(reconfigure):
    try:
        reconfigure(encoding="utf-8", errors="replace")
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
    argp.add_argument(
        "--source",
        action="append",
        default=[],
        help="Restrict to detail.source / source_key (repeatable), e.g. --source upsc --source ssc",
    )
    argp.add_argument(
        "--include-unknown-doc",
        action="store_true",
        help="Also enrich UNKNOWN document_type drafts (default: RECRUITMENT only)",
    )
    argp.add_argument(
        "--category",
        action="append",
        default=[],
        help="Restrict to jobs.category (repeatable), e.g. --category upsc --category ssc",
    )
    args = argp.parse_args()
    wanted = {s.strip().lower() for s in args.source if s.strip()}
    wanted_cats = {c.strip().lower() for c in args.category if c.strip()}

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

        def _source_key(job: Job) -> str:
            detail = job.detail if isinstance(job.detail, dict) else {}
            return str(detail.get("source") or detail.get("source_key") or "").strip().lower()

        allowed_docs = {"RECRUITMENT"}
        if args.include_unknown_doc:
            allowed_docs.add("UNKNOWN")

        rows = [
            j
            for j in rows
            if j.last_date is None
            and (j.document_type or "").upper() in allowed_docs
            and (not wanted or _source_key(j) in wanted)
            and (not wanted_cats or (j.category or "").strip().lower() in wanted_cats)
        ]
        with_pdf = [j for j in rows if _has_pdf(j)]
        without = [j for j in rows if not _has_pdf(j)]
        rows = with_pdf + without

        cap = args.limit if args.limit else len(rows)
        total = min(len(rows), cap)
        src_label = ",".join(sorted(wanted)) if wanted else "all"
        cat_label = ",".join(sorted(wanted_cats)) if wanted_cats else "all"
        _log(
            f"Enriching up to {total} draft job(s) missing dates "
            f"(sources={src_label}, categories={cat_label}, candidates={len(rows)}, with_pdf={len(with_pdf)})…"
        )

        for job in rows:
            if args.limit and scanned >= args.limit:
                break
            scanned += 1
            title_preview = (job.title or "untitled")[:56]
            _log(f"[{scanned}/{total}] [{_source_key(job) or '?'}] {title_preview}")
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
