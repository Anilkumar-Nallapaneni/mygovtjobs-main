#!/usr/bin/env python3
"""Close the publication gaps that do not require downloading PDFs.

Rejects non-recruitment notices, links jobs to registry sources, and
recalculates completeness from fields already stored. Dry-run unless --apply.
Also applies migration 044 (bookmark grant revoke) when --apply is set.
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from sqlalchemy import select, text

from app.database.session import SessionLocal
from app.models.job import Job, JobReviewQueue, Source
from app.services.job_completeness_service import calculate_completeness
from app.services.publish_gate import NON_RECRUITMENT_DOCUMENT_TYPES, india_today, is_corrupt_url
from app.utils.official_hosts import is_official_recruitment_host, looks_like_notification_document

MIGRATION_044 = "migrations/044_harden_bookmark_grants.sql"


def _host(url: str | None) -> str:
    if not url:
        return ""
    try:
        host = (urlparse(str(url)).hostname or "").lower()
    except Exception:
        return ""
    return host[4:] if host.startswith("www.") else host


def _source_indexes(sources: list[Source]) -> tuple[dict[str, str], dict[str, str]]:
    by_code = {source.code: source.id for source in sources if source.code}
    hosts: dict[str, set[str]] = {}
    for source in sources:
        for url in (source.portal_url, source.feed_url):
            host = _host(url)
            if host.count(".") < 2:
                continue
            hosts.setdefault(host, set()).add(source.id)
    unique = {host: next(iter(ids)) for host, ids in hosts.items() if len(ids) == 1}
    return by_code, unique


def _match_source(job: Job, by_code: dict[str, str], hosts: dict[str, str]) -> str | None:
    detail = job.detail if isinstance(job.detail, dict) else {}
    code = str(detail.get("source") or detail.get("source_code") or "").strip()
    if code and code in by_code:
        return by_code[code]
    job_host = _host(job.source_url) or _host(job.apply_url) or _host(job.primary_pdf_url)
    if job_host and job_host in hosts:
        return hosts[job_host]
    suffixes = [
        source_id
        for host, source_id in hosts.items()
        if job_host.endswith("." + host)
    ]
    if len(suffixes) == 1:
        return suffixes[0]
    return None


def _completeness(job: Job) -> int:
    detail = job.detail if isinstance(job.detail, dict) else {}
    score, _missing = calculate_completeness(
        {
            "title": job.title,
            "dept": job.dept,
            "apply_url": job.apply_url,
            "source_url": job.source_url,
            "last_date": job.last_date,
            "qualification": job.qualification,
            "vacancies": job.vacancies,
            "salary": job.salary,
            "age_limit": job.age_limit,
            "application_fee": detail.get("application_fee") or detail.get("fee"),
            "selection_process": detail.get("selection_process"),
            "how_to_apply": detail.get("how_to_apply"),
            "detail": detail,
        }
    )
    return score


async def _apply_bookmark_grants(session) -> str:
    await session.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS schema_migrations (
              filename TEXT PRIMARY KEY,
              applied_at TIMESTAMPTZ DEFAULT NOW()
            )
            """
        )
    )
    existing = (
        await session.execute(
            text("SELECT 1 FROM schema_migrations WHERE filename = :name"),
            {"name": MIGRATION_044},
        )
    ).first()
    if existing:
        return "already-applied"
    await session.execute(text("REVOKE ALL ON TABLE public.bookmarks FROM PUBLIC, anon"))
    await session.execute(
        text(
            "REVOKE UPDATE, REFERENCES, TRIGGER, TRUNCATE "
            "ON TABLE public.bookmarks FROM authenticated"
        )
    )
    await session.execute(
        text("GRANT SELECT, INSERT, DELETE ON TABLE public.bookmarks TO authenticated")
    )
    await session.execute(
        text(
            "INSERT INTO schema_migrations (filename) VALUES (:name) "
            "ON CONFLICT (filename) DO NOTHING"
        ),
        {"name": MIGRATION_044},
    )
    return "applied"


async def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    report = {
        "apply": args.apply,
        "non_recruitment_jobs": 0,
        "review_rows_rejected": 0,
        "expired_past_deadline": 0,
        "apply_urls_repaired": 0,
        "source_ids_linked": 0,
        "completeness_updated": 0,
        "bookmark_grants": "skipped",
        "source_links": {},
    }
    async with SessionLocal() as session:
        sources = list((await session.execute(select(Source))).scalars().all())
        by_code, hosts = _source_indexes(sources)
        id_to_code = {source.id: source.code for source in sources}
        link_counts: Counter[str] = Counter()
        today = india_today()
        jobs = list((await session.execute(select(Job))).scalars().all())
        for job in jobs:
            if job.last_date is not None and job.last_date < today and job.status in ("live", "draft"):
                report["expired_past_deadline"] += 1
                if args.apply:
                    job.status = "expired"
                    job.published_to_site = False
            doc = (job.document_type or "").upper()
            if doc in NON_RECRUITMENT_DOCUMENT_TYPES and (
                job.verification_status != "REJECTED" or job.published_to_site or job.status == "live"
            ):
                report["non_recruitment_jobs"] += 1
                if args.apply:
                    job.verification_status = "REJECTED"
                    job.published_to_site = False
                    if job.status == "live":
                        job.status = "draft"
            pdf = (job.primary_pdf_url or "").strip()
            if (
                job.status == "live"
                and job.apply_url
                and is_corrupt_url(job.apply_url)
                and pdf
                and not is_corrupt_url(pdf)
                and is_official_recruitment_host(pdf)
                and looks_like_notification_document(pdf)
            ):
                report["apply_urls_repaired"] += 1
                if args.apply:
                    job.apply_url = pdf
            if job.source_id is None:
                matched = _match_source(job, by_code, hosts)
                if matched:
                    report["source_ids_linked"] += 1
                    link_counts[id_to_code.get(matched, matched)] += 1
                    if args.apply:
                        job.source_id = matched
            score = _completeness(job)
            if score != int(job.completeness_score or 0):
                report["completeness_updated"] += 1
                if args.apply:
                    job.completeness_score = score

        queue = list(
            (
                await session.execute(
                    select(JobReviewQueue).where(JobReviewQueue.status == "pending")
                )
            ).scalars().all()
        )
        for row in queue:
            errors = " ".join(str(item) for item in (row.validation_errors or []))
            payload = row.normalized_payload if isinstance(row.normalized_payload, dict) else {}
            doc = str(payload.get("document_type") or "").upper()
            if "not classified as recruitment" in errors.lower() or doc in NON_RECRUITMENT_DOCUMENT_TYPES:
                report["review_rows_rejected"] += 1
                if args.apply:
                    row.status = "rejected"
                    row.review_notes = "Rejected: document is not a recruitment notice"
                    row.reviewed_at = datetime.now(timezone.utc)

        report["source_links"] = dict(link_counts.most_common(12))
        if args.apply:
            try:
                report["bookmark_grants"] = await _apply_bookmark_grants(session)
            except Exception as exc:
                report["bookmark_grants"] = f"failed: {type(exc).__name__}"
                await session.rollback()
                print(report)
                return 1
            await session.commit()
        else:
            await session.rollback()

    print(report)
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
