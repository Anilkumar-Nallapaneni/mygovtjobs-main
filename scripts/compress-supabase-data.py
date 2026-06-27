#!/usr/bin/env python3
"""Compress Supabase Postgres data — slim jobs.detail, purge raw_ingest staging rows.

Heavy PDF content_sections (~12 MB) are moved to Storage (when --upload-storage) then
removed from jobs.detail. List queries and DB size drop sharply; detail pages use Storage.

Examples:
  node scripts/run-python.mjs scripts/compress-supabase-data.py
  node scripts/run-python.mjs scripts/compress-supabase-data.py --apply
  node scripts/run-python.mjs scripts/compress-supabase-data.py --apply --upload-storage
"""
from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from sqlalchemy import delete, func, select, text

from app.database.session import SessionLocal, engine
from app.models.job import Job, RawIngest
from app.utils.job_details_storage import upload_job_detail_json
from app.utils.slim_detail import detail_json_bytes, slim_detail_for_db

REPORT_PATH = ROOT / "scripts" / "compress-supabase-report.json"


def _job_storage_payload(job: Job) -> dict:
    detail = dict(job.detail or {})
    return {
        "id": str(job.id),
        "slug": job.slug,
        "title": job.title,
        "dept": job.dept,
        "category": job.category,
        "state_codes": list(job.state_codes or []),
        "vacancies": job.vacancies or 0,
        "qualification": job.qualification,
        "salary": job.salary,
        "age_limit": job.age_limit,
        "last_date": job.last_date.isoformat() if job.last_date else None,
        "apply_url": job.apply_url,
        "status": job.status,
        "published_at": job.published_at.isoformat() if job.published_at else None,
        "detail": detail,
    }


async def _table_bytes(session, table: str) -> int:
    row = (
        await session.execute(
            text(
                """
                SELECT COALESCE(pg_total_relation_size(c.oid), 0)::bigint AS bytes
                FROM pg_class c
                JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE n.nspname = 'public' AND c.relname = :table
                """
            ),
            {"table": table},
        )
    ).one()
    return int(row.bytes)


async def run(
    *,
    apply: bool,
    upload_storage: bool,
    purge_raw: bool,
    vacuum: bool,
) -> dict:
    stats = {
        "apply": apply,
        "upload_storage": upload_storage,
        "purge_raw": purge_raw,
        "jobs_total": 0,
        "jobs_with_sections": 0,
        "jobs_updated": 0,
        "bytes_before": 0,
        "bytes_after": 0,
        "bytes_saved": 0,
        "storage_uploads": 0,
        "storage_upload_failures": 0,
        "raw_ingest_deleted": 0,
        "table_bytes_before": {},
        "table_bytes_after": {},
    }

    async with SessionLocal() as session:
        stats["table_bytes_before"]["jobs"] = await _table_bytes(session, "jobs")
        stats["table_bytes_before"]["raw_ingest"] = await _table_bytes(session, "raw_ingest")

        rows = (await session.execute(select(Job).order_by(Job.updated_at.desc()))).scalars().all()
        stats["jobs_total"] = len(rows)

        for job in rows:
            detail = dict(job.detail or {})
            if detail.get("content_sections"):
                stats["jobs_with_sections"] += 1
            stats["bytes_before"] += detail_json_bytes(detail)

            slim = slim_detail_for_db(detail, status=str(job.status or "live"))
            stats["bytes_after"] += detail_json_bytes(slim)

            if slim == detail:
                continue

            stats["jobs_updated"] += 1
            if not apply:
                continue

            if upload_storage and detail.get("content_sections") and job.slug:
                payload = _job_storage_payload(job)
                if upload_job_detail_json(str(job.slug), payload):
                    stats["storage_uploads"] += 1
                else:
                    stats["storage_upload_failures"] += 1

            job.detail = slim

        stats["bytes_saved"] = stats["bytes_before"] - stats["bytes_after"]

        if purge_raw:
            raw_count = (
                await session.execute(select(func.count()).select_from(RawIngest))
            ).scalar_one()
            stats["raw_ingest_deleted"] = int(raw_count or 0)
            if apply and stats["raw_ingest_deleted"]:
                await session.execute(delete(RawIngest))

        if apply:
            await session.commit()

        if apply and vacuum:
            # VACUUM cannot run inside a transaction — use autocommit connection.
            async with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
                await conn.execute(text("VACUUM ANALYZE jobs"))
                if purge_raw and stats["raw_ingest_deleted"]:
                    await conn.execute(text("VACUUM ANALYZE raw_ingest"))

        if apply:
            async with SessionLocal() as session2:
                stats["table_bytes_after"]["jobs"] = await _table_bytes(session2, "jobs")
                stats["table_bytes_after"]["raw_ingest"] = await _table_bytes(session2, "raw_ingest")
        else:
            stats["table_bytes_after"] = dict(stats["table_bytes_before"])

    REPORT_PATH.write_text(json.dumps(stats, indent=2), encoding="utf-8")
    return stats


def _fmt_mb(n: int) -> str:
    return f"{n / 1024 / 1024:.2f} MB"


def main() -> None:
    parser = argparse.ArgumentParser(description="Compress Supabase jobs.detail and purge staging rows")
    parser.add_argument("--apply", action="store_true", help="Write changes (default: dry run)")
    parser.add_argument(
        "--upload-storage",
        action="store_true",
        help="Upload full detail JSON to job-details bucket before stripping sections",
    )
    parser.add_argument(
        "--purge-raw",
        action="store_true",
        default=True,
        help="Delete raw_ingest staging rows (default: on)",
    )
    parser.add_argument("--no-purge-raw", action="store_false", dest="purge_raw")
    parser.add_argument("--vacuum", action="store_true", default=True, help="Run VACUUM ANALYZE after apply")
    parser.add_argument("--no-vacuum", action="store_false", dest="vacuum")
    args = parser.parse_args()

    stats = asyncio.run(
        run(
            apply=args.apply,
            upload_storage=args.upload_storage,
            purge_raw=args.purge_raw,
            vacuum=args.vacuum,
        )
    )

    mode = "APPLY" if args.apply else "DRY RUN"
    print(f"\n-- Supabase compress ({mode}) --")
    print(f"  jobs: {stats['jobs_total']} total, {stats['jobs_with_sections']} with content_sections")
    print(f"  detail JSON: {_fmt_mb(stats['bytes_before'])} → {_fmt_mb(stats['bytes_after'])} (save {_fmt_mb(stats['bytes_saved'])})")
    print(f"  rows to update: {stats['jobs_updated']}")
    if args.upload_storage:
        print(f"  storage uploads: {stats['storage_uploads']} ok, {stats['storage_upload_failures']} failed")
    if stats["purge_raw"]:
        print(f"  raw_ingest rows to delete: {stats['raw_ingest_deleted']}")
    tb = stats["table_bytes_before"].get("jobs", 0)
    ta = stats["table_bytes_after"].get("jobs", tb)
    if args.apply and ta != tb:
        print(f"  jobs table on disk: {_fmt_mb(tb)} → {_fmt_mb(ta)}")
    print(f"  report: {REPORT_PATH.relative_to(ROOT)}")
    if not args.apply:
        print("\n  Re-run with --apply to write changes.")
        if stats["jobs_with_sections"]:
            print("  Recommended: --apply --upload-storage (keeps full detail in Storage bucket)")


if __name__ == "__main__":
    main()
