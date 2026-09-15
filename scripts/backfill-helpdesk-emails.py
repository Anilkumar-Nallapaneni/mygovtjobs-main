#!/usr/bin/env python3
"""Fill official helpdesk emails on live jobs from their notification PDFs.

  node scripts/run-python.mjs scripts/backfill-helpdesk-emails.py
  node scripts/run-python.mjs scripts/backfill-helpdesk-emails.py --export
"""
from __future__ import annotations

import argparse
import asyncio
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from sqlalchemy import select

from app.database.session import SessionLocal
from app.models.job import Job
from app.parsers.pdf_parser import parse_pdf_url
from app.services.job_persist_service import JobPersistService
from app.utils.contact_extract import extract_official_contacts
from app.utils.slim_detail import slim_detail_for_db


async def main(apply: bool, export: bool, limit: int) -> int:
    updated = 0
    scanned = 0
    async with SessionLocal() as session:
        rows = (
            await session.execute(select(Job).where(Job.status == "live").order_by(Job.updated_at.desc()))
        ).scalars().all()
        if limit > 0:
            rows = rows[:limit]
        for job in rows:
            scanned += 1
            detail = dict(job.detail or {})
            if detail.get("helpdesk_email") or detail.get("helpdesk_emails"):
                continue
            pdf = (
                getattr(job, "primary_pdf_url", None)
                or detail.get("pdf_url")
                or detail.get("primary_pdf_url")
                or (detail.get("pdf_urls") or [None])[0]
            )
            contacts = extract_official_contacts(str(detail.get("summary") or ""))
            if pdf and not contacts.get("helpdesk_email") and not contacts.get("helpdesk_url"):
                try:
                    fields = await parse_pdf_url(str(pdf))
                    contacts = {
                        k: fields[k]
                        for k in ("helpdesk_email", "helpdesk_emails", "helpdesk_url")
                        if fields.get(k)
                    }
                except Exception as exc:
                    print(f"skip {job.slug}: {exc}", flush=True)
                    continue
            if not contacts:
                print(f"— {job.slug}: no official contact", flush=True)
                continue
            if not apply:
                print(
                    f"dry {job.slug}: {contacts.get('helpdesk_email') or contacts.get('helpdesk_url')}",
                    flush=True,
                )
                updated += 1
                continue
            detail.update(contacts)
            job.detail = slim_detail_for_db(detail, status=str(job.status or "live"))
            job.updated_at = datetime.now(timezone.utc)
            updated += 1
            print(f"ok {job.slug}: {contacts.get('helpdesk_email') or contacts.get('helpdesk_url')}", flush=True)
        if apply:
            await session.commit()
            if export:
                count = await JobPersistService().export_live_jobs_json(session)
                print(f"exported {count} live jobs", flush=True)
    print(f"scanned={scanned} updated={updated} apply={apply}", flush=True)
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--export", action="store_true")
    parser.add_argument("--limit", type=int, default=0)
    args = parser.parse_args()
    raise SystemExit(asyncio.run(main(apply=args.apply, export=args.export, limit=args.limit)))
