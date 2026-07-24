#!/usr/bin/env python3
"""Backfill salary/qualification/address from already-memorized PDF summaries (no re-download).

  npm run pdf:backfill-fields
  node scripts/run-python.mjs scripts/backfill-fields-from-summary.py --limit 500
"""
from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from sqlalchemy import select

from app.database.session import SessionLocal
from app.models.job import Job
from app.parsers.pdf_parser import extract_fields, is_weak_field
from app.services.noise_filter import sanitize_json_for_postgres, strip_postgres_control_chars
from app.utils.slim_detail import slim_detail_for_db


async def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=500)
    parser.add_argument("--live-only", action="store_true", default=True)
    args = parser.parse_args()

    updated = 0
    scanned = 0
    async with SessionLocal() as session:
        q = select(Job).order_by(Job.published_at.desc())
        if args.live_only:
            q = q.where(Job.status == "live")
        rows = (await session.execute(q)).scalars().all()
        for job in rows:
            detail = dict(job.detail or {})
            summary = str(detail.get("summary") or "").strip()
            if len(summary) < 80:
                continue
            needs = (
                is_weak_field(job.qualification)
                or is_weak_field(job.salary)
                or is_weak_field(detail.get("streetAddress") or detail.get("street_address"))
                or is_weak_field(detail.get("postalCode") or detail.get("pincode"))
            )
            if not needs:
                continue
            scanned += 1
            if args.limit and scanned > args.limit:
                break
            fields = extract_fields(summary)
            changed = False
            if fields.get("qualification") and is_weak_field(job.qualification):
                job.qualification = strip_postgres_control_chars(fields["qualification"])
                changed = True
            if fields.get("salary") and is_weak_field(job.salary):
                job.salary = strip_postgres_control_chars(fields["salary"])
                changed = True
            for key in ("streetAddress", "street_address", "postalCode", "postal_code", "pincode"):
                if fields.get(key) and is_weak_field(detail.get(key)):
                    detail[key] = strip_postgres_control_chars(str(fields[key]))
                    changed = True
            if fields.get("streetAddress") or fields.get("street_address"):
                street = fields.get("streetAddress") or fields.get("street_address")
                detail["streetAddress"] = street
                detail["street_address"] = street
            if fields.get("postalCode") or fields.get("pincode"):
                pin = fields.get("postalCode") or fields.get("pincode")
                detail["postalCode"] = pin
                detail["postal_code"] = pin
                detail["pincode"] = pin
            if changed:
                job.detail = sanitize_json_for_postgres(
                    slim_detail_for_db(detail, status=str(job.status or "live"))
                )
                # Preserve memorized_at / street keys after slim
                slim = dict(job.detail or {})
                for key in ("memorized_at", "streetAddress", "street_address", "postalCode", "postal_code", "pincode"):
                    if detail.get(key):
                        slim[key] = detail[key]
                job.detail = sanitize_json_for_postgres(slim)
                updated += 1
        await session.commit()

    print(f"Backfill from summary: scanned={scanned} updated={updated}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
