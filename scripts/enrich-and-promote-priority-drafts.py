#!/usr/bin/env python3
"""Enrich last_date on high-value drafts (NORCET, NRSC, ICRB, etc.) then promote.

1) Parse dates from title / PDF for targeted draft recruitments
2) Run promote-publish-gate on rows that now have a future last_date

Never touches FreeJobAlert — official rows only.
"""

from __future__ import annotations

import argparse
import asyncio
import re
import sys
from datetime import date, datetime, timezone
from pathlib import Path
from uuid import UUID

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from sqlalchemy import or_, select, update  # noqa: E402

from app.database.session import SessionLocal  # noqa: E402
from app.models.job import Job  # noqa: E402
from app.parsers.notification_parser import NotificationParser  # noqa: E402
from app.parsers.pdf_dates import to_iso_date  # noqa: E402
from app.parsers.pdf_enrich import merge_pdf_fields  # noqa: E402
from app.scrapers.pdf_discover import ensure_pdf_urls  # noqa: E402
from app.services.job_persist_service import JobPersistService, _parse_date  # noqa: E402
from app.services.publish_gate import india_today  # noqa: E402

TITLE_PATTERNS = [
    r"NORCET",
    r"NRSC/RMT",
    r"ICRB:01\(A-JPA\)",
    r"ICRB:02\(EMC",
    r"Agniveer",
    r"IBPS-CRP",
    r"Probationary Clerks",
]

# Month-name ranges not always covered by NotificationParser title regexes
_MONTH_RANGE = re.compile(
    r"(?:started|start(?:ing)?|from|between)\s+(?:on\s+)?"
    r"(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*20\d{2})"
    r".{0,40}?"
    r"(?:closed|closes|closing|upto|up to|till|until|to|last date)\s+(?:on\s+)?"
    r"(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*20\d{2})",
    re.I | re.S,
)
_CLOSED_ON = re.compile(
    r"(?:closed|closes|closing|last date|apply by|upto|up to|till|until)\s+(?:on\s+)?"
    r"(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*20\d{2})",
    re.I,
)


def _pdf_urls(job: Job) -> list[str]:
    detail = dict(job.detail or {})
    urls = list(detail.get("pdf_urls") or [])
    if detail.get("pdf_url"):
        urls.insert(0, str(detail["pdf_url"]))
    if job.primary_pdf_url:
        urls.insert(0, str(job.primary_pdf_url))
    if job.apply_url and ".pdf" in str(job.apply_url).lower():
        urls.insert(0, str(job.apply_url))
    # dedupe
    seen: set[str] = set()
    out: list[str] = []
    for u in urls:
        key = u.strip().lower()
        if not key or key in seen:
            continue
        seen.add(key)
        out.append(u.strip())
    return out


def _parse_title_dates(title: str, parser: NotificationParser) -> dict[str, date | None]:
    fields = parser._extract_dates_from_title(title or "")
    published = _parse_date(fields.get("published_date") or fields.get("published_at"))
    last = _parse_date(fields.get("last_date"))

    if not last:
        m = _MONTH_RANGE.search(title or "")
        if m:
            published = published or _parse_date(to_iso_date(m.group(1)))
            last = _parse_date(to_iso_date(m.group(2)))
    if not last:
        m2 = _CLOSED_ON.search(title or "")
        if m2:
            last = _parse_date(to_iso_date(m2.group(1)))

    return {
        "published": published.date() if isinstance(published, datetime) else published,
        "last": last.date() if isinstance(last, datetime) else last,
    }


async def enrich(apply: bool) -> list[str]:
    """Return list of job id strings that now have a future last_date."""
    parser = NotificationParser()
    today = india_today()
    ready: list[str] = []

    async with SessionLocal() as session:
        rows = (
            await session.execute(
                select(Job).where(
                    Job.status == "draft",
                    or_(
                        Job.title.ilike("%NORCET%"),
                        Job.title.ilike("%NRSC/RMT%"),
                        Job.title.ilike("%ICRB%"),
                        Job.title.ilike("%Agniveer%"),
                        Job.title.ilike("%IBPS-CRP%"),
                        Job.title.ilike("%Probationary Clerks%"),
                    ),
                )
            )
        ).scalars().all()

        print(f"Target drafts: {len(rows)}", flush=True)
        for job in rows:
            title = job.title or ""
            dates = _parse_title_dates(title, parser)
            last = dates["last"]
            published = dates["published"]
            note = "title"

            if not last:
                pdfs = await ensure_pdf_urls(_pdf_urls(job), None)
                if pdfs:
                    try:
                        pdf_fields = await merge_pdf_fields(pdfs[:2])
                        last = _parse_date(pdf_fields.get("last_date"))
                        published = published or _parse_date(pdf_fields.get("published_date"))
                        if isinstance(last, datetime):
                            last = last.date()
                        if isinstance(published, datetime):
                            published = published.date()
                        note = "pdf"
                    except Exception as exc:
                        print(f"  PDF fail {job.slug}: {exc}", flush=True)

            if not last:
                print(f"  SKIP (no date) {title[:90]}", flush=True)
                continue

            future = last >= today
            print(
                f"  {'READY' if future else 'PAST '} last={last} via={note} | {title[:90]}",
                flush=True,
            )

            if apply:
                values: dict = {
                    "last_date": last,
                    "updated_at": datetime.now(timezone.utc),
                }
                if published and not job.published_at:
                    values["published_at"] = datetime(
                        published.year, published.month, published.day, tzinfo=timezone.utc
                    )
                # vacancies from title when missing
                vac = parser._extract_from_title(title).get("vacancies")
                if vac and not job.vacancies:
                    values["vacancies"] = vac
                await session.execute(update(Job).where(Job.id == job.id).values(**values))

            if future:
                ready.append(str(job.id))

        if apply:
            await session.commit()

    return ready


async def promote_ids(ids: list[str], apply: bool, export: bool) -> int:
    if not ids:
        print("No future-dated targets to promote.", flush=True)
        return 0

    # Reuse publish-gate validation (same thresholds as promote-publish-gate.py).
    from app.services.document_classifier import classify_document_type
    from app.services.job_completeness_service import calculate_completeness
    from app.services.noise_filter import clean_job_title, clean_plain_text, sanitize_source_text_fields
    from app.services.publish_gate import validate_job_for_publication
    from app.services.dedupe_service import title_fingerprint

    today = india_today()
    promoted = 0
    skipped = []

    async with SessionLocal() as session:
        live_fps = {
            title_fingerprint(clean_job_title(r.title or ""))
            for r in (await session.execute(select(Job).where(Job.status == "live"))).scalars().all()
            if r.title
        }
        uuid_ids = [UUID(i) for i in ids]
        rows = (await session.execute(select(Job).where(Job.id.in_(uuid_ids)))).scalars().all()

        for job in rows:
            title = clean_job_title(job.title or "")
            fp = title_fingerprint(title)
            if fp and fp in live_fps:
                skipped.append((title[:80], "duplicate live"))
                continue
            if not job.last_date:
                skipped.append((title[:80], "still no last_date"))
                continue
            last = job.last_date.date() if isinstance(job.last_date, datetime) else job.last_date
            if last < today:
                skipped.append((title[:80], f"past deadline {last}"))
                continue

            detail = sanitize_source_text_fields(job.detail if isinstance(job.detail, dict) else {})
            dept = clean_plain_text(job.dept) or None
            qualification = clean_plain_text(job.qualification) or None
            url = job.apply_url or getattr(job, "source_url", None) or ""
            summary = str(detail.get("summary") or "")
            doc_type = (job.document_type or "").upper() or classify_document_type(
                title=title, url=url or "", text=summary, dept=dept or ""
            )
            if doc_type in ("UNKNOWN", ""):
                soft = classify_document_type(
                    title=f"{title} recruitment notification",
                    url=url or "",
                    text=summary,
                    dept=dept or "",
                )
                if soft == "RECRUITMENT":
                    doc_type = "RECRUITMENT"

            payload = {
                "title": title,
                "dept": dept,
                "department": dept,
                "organization": dept,
                "apply_url": job.apply_url,
                "source_url": getattr(job, "source_url", None) or detail.get("source_url"),
                "notification_url": detail.get("notification_url") or detail.get("pdf_url"),
                "document_type": "RECRUITMENT" if doc_type in ("RECRUITMENT", "UNKNOWN") else doc_type,
                "verification_status": "VERIFIED",
                "published_at": job.published_at,
                "last_date": job.last_date,
                "vacancies": job.vacancies,
                "qualification": qualification,
                "salary": job.salary,
                "age_limit": job.age_limit,
                "completeness_score": getattr(job, "completeness_score", 0) or 0,
                "detail": detail,
                "pdf_urls": detail.get("pdf_urls") or detail.get("pdfUrls") or [],
                "state": "India",
                "location": "India",
            }
            score, _ = calculate_completeness(payload)
            payload["completeness_score"] = score
            validation = validate_job_for_publication(payload, today=today)
            ok = validation.valid and validation.confidence >= 90.0
            if not ok:
                skipped.append((title[:80], f"gate:{validation.errors[:3]} conf={validation.confidence}"))
                continue

            print(f"  PROMOTE conf={validation.confidence:.0f} | {title[:90]}", flush=True)
            if apply:
                pub_confidence = float(validation.confidence)
                await session.execute(
                    update(Job)
                    .where(Job.id == job.id)
                    .values(
                        title=title,
                        dept=dept,
                        qualification=qualification,
                        detail=detail,
                        document_type="RECRUITMENT",
                        verification_status="VERIFIED",
                        status="live",
                        published_to_site=True,
                        completeness_score=score,
                        publication_confidence=pub_confidence,
                        published_at=job.published_at or datetime.now(timezone.utc),
                        updated_at=datetime.now(timezone.utc),
                    )
                )
                promoted += 1
                if fp:
                    live_fps.add(fp)

        if apply:
            await session.commit()
            if export:
                count = await JobPersistService().export_live_jobs_json(session)
                print(f"Exported {count} live jobs", flush=True)

    print(f"promoted={promoted} skipped={len(skipped)}", flush=True)
    for t, reason in skipped[:20]:
        print(f"  skip: {reason} | {t}", flush=True)
    return promoted


async def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--export", action="store_true")
    args = ap.parse_args()

    print("=== Enrich high-value drafts ===", flush=True)
    ready = await enrich(apply=args.apply)
    print(f"Future-dated ready ids: {len(ready)}", flush=True)

    print("\n=== Promote ===", flush=True)
    await promote_ids(ready, apply=args.apply, export=args.export)
    return 0


if __name__ == "__main__":
    # Allow `from scripts import ...` when needed — keep path clean
    raise SystemExit(asyncio.run(main()))
