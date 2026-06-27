#!/usr/bin/env python3
"""One-time scrub: remove tender/procurement rows from Postgres (Supabase) and refresh live-jobs.json.

Uses the same rules as app.services.noise_filter (e-tender, DownloadTender URLs, etc.).

Examples:
  # Preview rows that would be removed (default)
  node scripts/run-python.mjs scripts/scrub-tenders-from-db.py

  # Delete from DB and re-export frontend/public/data/live-jobs.json
  node scripts/run-python.mjs scripts/scrub-tenders-from-db.py --apply --export

  # Also drop junk / non-recruitment titles (matches clean-live-jobs-json.py)
  node scripts/run-python.mjs scripts/scrub-tenders-from-db.py --apply --export --strict
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

from app.config import get_settings
from app.database.session import SessionLocal
from app.models.job import Job
from app.services.noise_filter import (
    is_junk_job_title,
    is_tender_or_procurement,
    looks_like_job_notification,
)

LIVE_JSON = ROOT / "frontend" / "public" / "data" / "live-jobs.json"
SAMPLE_LIMIT = 12


def _detail_urls(detail: dict | None) -> list[str]:
    if not isinstance(detail, dict):
        return []
    urls: list[str] = []
    for key in ("notification_url", "link", "source_url", "pdf_url", "pdfUrl"):
        value = detail.get(key)
        if isinstance(value, str) and value.strip():
            urls.append(value.strip())
    for key in ("pdf_urls", "pdfUrls"):
        vals = detail.get(key) or []
        if isinstance(vals, list):
            urls.extend(str(v).strip() for v in vals if isinstance(v, str) and str(v).strip())
    return urls


def _job_probe_urls(job: Job) -> list[str]:
    urls: list[str] = []
    if job.apply_url:
        urls.append(job.apply_url)
    urls.extend(_detail_urls(job.detail))
    # Preserve order, drop duplicates
    seen: set[str] = set()
    out: list[str] = []
    for url in urls:
        if url not in seen:
            seen.add(url)
            out.append(url)
    return out


def classify_job(job: Job, *, strict: bool) -> str | None:
    """Return delete reason, or None if the row should be kept."""
    title = job.title or ""
    apply_url = job.apply_url or ""

    if is_tender_or_procurement(title, apply_url):
        return "tender_or_procurement"
    for url in _job_probe_urls(job):
        if url != apply_url and is_tender_or_procurement(title, url):
            return "tender_url"

    if not strict:
        return None

    if is_junk_job_title(title, apply_url):
        return "junk_title"
    if not looks_like_job_notification(title, apply_url):
        return "not_job_notification"
    return None


def scrub_live_json(*, strict: bool) -> tuple[int, int]:
    """Drop tender (and optionally junk) rows from the static snapshot."""
    if not LIVE_JSON.exists():
        return 0, 0

    payload = json.loads(LIVE_JSON.read_text(encoding="utf-8"))
    items = payload.get("items") or []
    kept = []
    dropped = 0
    for row in items:
        title = row.get("title") or ""
        apply_url = row.get("apply_url") or ""
        detail = row.get("detail") if isinstance(row.get("detail"), dict) else {}
        reason = None
        if is_tender_or_procurement(title, apply_url):
            reason = "tender_or_procurement"
        else:
            for url in _detail_urls(detail):
                if is_tender_or_procurement(title, url):
                    reason = "tender_url"
                    break
        if reason is None and strict:
            if is_junk_job_title(title, apply_url):
                reason = "junk_title"
            elif not looks_like_job_notification(title, apply_url):
                reason = "not_job_notification"
        if reason:
            dropped += 1
            continue
        kept.append(row)

    if dropped:
        payload["items"] = kept
        LIVE_JSON.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return len(kept), dropped


async def scrub_db(*, apply: bool, strict: bool) -> tuple[int, Counter[str], list[tuple[str, str, str]]]:
    reasons: Counter[str] = Counter()
    samples: list[tuple[str, str, str]] = []
    deleted = 0

    async with SessionLocal() as session:
        rows = (await session.execute(select(Job))).scalars().all()
        to_delete: list[Job] = []

        for job in rows:
            reason = classify_job(job, strict=strict)
            if not reason:
                continue
            reasons[reason] += 1
            if len(samples) < SAMPLE_LIMIT:
                samples.append((reason, job.slug or job.id, (job.title or "")[:100]))
            to_delete.append(job)

        if apply:
            for job in to_delete:
                await session.delete(job)
                deleted += 1
            await session.commit()
        else:
            deleted = len(to_delete)

    return deleted, reasons, samples


async def export_json() -> int:
    from app.services.job_persist_service import JobPersistService

    async with SessionLocal() as session:
        return await JobPersistService().export_live_jobs_json(session)


async def main() -> None:
    parser = argparse.ArgumentParser(description="Remove tender/procurement jobs from Postgres (Supabase).")
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Delete matching rows from the database (default is dry-run preview only).",
    )
    parser.add_argument(
        "--export",
        action="store_true",
        help="Re-export frontend/public/data/live-jobs.json from DB after --apply.",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Also remove junk / non-recruitment titles (same rules as clean-live-jobs-json.py).",
    )
    parser.add_argument(
        "--json-only",
        action="store_true",
        help="Only scrub frontend/public/data/live-jobs.json (skip database).",
    )
    args = parser.parse_args()

    if args.export and not args.apply and not args.json_only:
        parser.error("--export requires --apply (or use --json-only for snapshot-only scrub).")

    mode = "APPLY" if args.apply else "DRY-RUN"
    print(f"scrub-tenders-from-db [{mode}] strict={args.strict}")

    if not args.json_only:
        count, reasons, samples = await scrub_db(apply=args.apply, strict=args.strict)
        print(f"\nDatabase: {'deleted' if args.apply else 'would delete'} {count} row(s)")
        if reasons:
            print("Reasons:")
            for reason, n in reasons.most_common():
                print(f"  {reason}: {n}")
        if samples:
            print("\nSample rows:")
            for reason, slug, title in samples:
                print(f"  [{reason}] {slug}")
                print(f"    {title}")

    json_kept, json_dropped = scrub_live_json(strict=args.strict)
    if json_dropped:
        action = "updated" if args.apply or args.json_only else "would update"
        print(f"\nlive-jobs.json: {action} snapshot — kept={json_kept} dropped={json_dropped}")
    elif args.json_only:
        print(f"\nlive-jobs.json: no tender rows found ({json_kept} items)")

    if args.export and args.apply and not args.json_only:
        exported = await export_json()
        print(f"\nRe-exported {exported} jobs -> {get_settings().live_jobs_json_path}")

    if not args.apply and not args.json_only:
        print("\nNo changes written. Re-run with --apply to delete from DB.")
        print("  npm run data:scrub-tenders:apply")


if __name__ == "__main__":
    asyncio.run(main())
