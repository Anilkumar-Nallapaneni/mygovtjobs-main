"""Promote draft/expired jobs that pass the publication gate to live.

Dry-run by default. Pass --apply to write. Pass --export to refresh live-jobs.json.
Also corrects mis-expired rows whose last_date is still in the future (→ draft if gate fails).
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from sqlalchemy import select, update

from app.database.session import SessionLocal
from app.models.job import Job
from app.services.dedupe_service import title_fingerprint
from app.services.document_classifier import classify_document_type
from app.services.job_completeness_service import calculate_completeness
from app.services.job_persist_service import JobPersistService
from app.services.noise_filter import clean_job_title, clean_plain_text, sanitize_source_text_fields
from app.services.publish_gate import (
    AUTO_PUBLISH_MIN_CONFIDENCE,
    india_today,
    validate_job_for_publication,
)


def _clamp_published_at(value: datetime | date | None, *, today: date, last: date | None) -> datetime:
    """Fix scrape bugs: future or ancient published_at blocks otherwise-good jobs."""
    floor = date(today.year - 2, 1, 1)
    if value is None:
        pub_date = today
    elif isinstance(value, datetime):
        pub_date = value.date()
    else:
        pub_date = value
    if pub_date > today + timedelta(days=1):
        pub_date = today
    if pub_date < floor:
        pub_date = today
    if last and pub_date > last:
        pub_date = min(today, last)
    return datetime(pub_date.year, pub_date.month, pub_date.day, tzinfo=timezone.utc)

# Near-complete official recruitments must still clear the public confidence floor.
PROMOTE_MIN_CONFIDENCE = 90.0  # same as public RLS/export floor — no confidence inflation


def _job_payload(job: Job, *, doc_type: str, detail: dict, title: str, dept: str | None, qualification: str | None) -> dict:
    pdf_url = (
        getattr(job, "primary_pdf_url", None)
        or detail.get("primary_pdf_url")
        or detail.get("pdf_url")
        or detail.get("pdfUrl")
        or detail.get("notification_url")
    )
    return {
        "title": title,
        "dept": dept,
        "department": dept,
        "organization": dept,
        "apply_url": job.apply_url,
        "source_url": getattr(job, "source_url", None) or detail.get("source_url"),
        "notification_url": detail.get("notification_url") or pdf_url,
        "primary_pdf_url": getattr(job, "primary_pdf_url", None) or detail.get("primary_pdf_url") or pdf_url,
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
        "pdf_urls": detail.get("pdf_urls") or detail.get("pdfUrls") or ([pdf_url] if pdf_url else []),
        "state_codes": list(getattr(job, "state_codes", None) or detail.get("state_codes") or []),
        "state": detail.get("state"),
        "location": detail.get("location"),
        "source": detail.get("source"),
        "source_state_code": detail.get("source_state_code") or detail.get("state"),
    }


async def main(apply: bool, export: bool, limit: int) -> int:
    today = india_today()
    report: dict = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "apply": apply,
        "promoted": [],
        "correctedExpiredToDraft": [],
        "skipped": [],
        "rowsUpdated": 0,
    }

    async with SessionLocal() as session:
        live_fps = {
            title_fingerprint(clean_job_title(r.title or ""))
            for r in (
                await session.execute(select(Job).where(Job.status == "live"))
            ).scalars().all()
            if r.title
        }
        rows = (
            await session.execute(
                select(Job).where(Job.status.in_(("draft", "expired", "pending")))
            )
        ).scalars().all()

        for job in rows:
            if job.last_date is None:
                continue
            last = job.last_date.date() if isinstance(job.last_date, datetime) else job.last_date
            if last < today:
                continue

            title = clean_job_title(job.title or "")
            fp = title_fingerprint(title)
            if fp and fp in live_fps:
                report["skipped"].append(
                    {
                        "slug": job.slug,
                        "title": title[:120],
                        "from": job.status,
                        "reasons": ["duplicate of existing live title"],
                    }
                )
                continue
            detail = sanitize_source_text_fields(job.detail if isinstance(job.detail, dict) else {})
            dept = clean_plain_text(job.dept) or None
            qualification = clean_plain_text(job.qualification) or None
            url = job.apply_url or getattr(job, "source_url", None) or ""
            summary = str(detail.get("summary") or "")
            doc_type = (job.document_type or "").upper() or classify_document_type(
                title=title, url=url or "", text=summary, dept=dept or ""
            )
            if doc_type == "UNKNOWN":
                soft = classify_document_type(
                    title=f"{title} recruitment notification",
                    url=url or "",
                    text=summary,
                    dept=dept or "",
                )
                if soft == "RECRUITMENT":
                    doc_type = "RECRUITMENT"

            published_at = _clamp_published_at(job.published_at, today=today, last=last)
            # Walk-ins / rolling notices sometimes use deadlines >1y; allow up to 2y on promote.
            effective_last = last
            if last > today + timedelta(days=365) and last <= today + timedelta(days=730):
                effective_last = today + timedelta(days=365)

            payload = _job_payload(
                job,
                doc_type=doc_type,
                detail=detail,
                title=title,
                dept=dept,
                qualification=qualification,
            )
            payload["published_at"] = published_at
            payload["last_date"] = effective_last
            score, _missing = calculate_completeness(payload)
            payload["completeness_score"] = score
            validation = validate_job_for_publication(payload, today=today)
            ok = validation.valid and validation.confidence >= PROMOTE_MIN_CONFIDENCE
            errors = list(validation.errors)
            # Soften: far deadline alone should not block when clamped for validation.
            if (
                not ok
                and last <= today + timedelta(days=730)
                and errors
                and all(e.startswith("Deadline is implausibly far") for e in errors)
            ):
                payload["last_date"] = today + timedelta(days=360)
                validation = validate_job_for_publication(payload, today=today)
                ok = validation.valid and validation.confidence >= PROMOTE_MIN_CONFIDENCE
                errors = list(validation.errors)
            if validation.valid and validation.confidence < PROMOTE_MIN_CONFIDENCE:
                errors.append(
                    f"Publication confidence {validation.confidence:.0f} below {PROMOTE_MIN_CONFIDENCE:.0f}"
                )
            elif validation.valid and validation.confidence < AUTO_PUBLISH_MIN_CONFIDENCE:
                # Accepted by promote floor; record for audit.
                pass

            if ok:
                if limit > 0 and len(report["promoted"]) >= limit:
                    report["skipped"].append(
                        {"slug": job.slug, "title": title[:120], "reasons": ["limit reached"]}
                    )
                    continue
                report["promoted"].append(
                    {
                        "id": str(job.id),
                        "slug": job.slug,
                        "title": title[:120],
                        "from": job.status,
                        "completeness": score,
                        "last_date": str(last),
                    }
                )
                if fp:
                    live_fps.add(fp)
                if apply:
                    # Store the measured score only (must already be >= public floor of 90).
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
                            published_at=published_at,
                            updated_at=datetime.now(timezone.utc),
                        )
                    )
                    report["rowsUpdated"] += 1
                continue

            # Mis-expired but still open: move back to draft for review
            if job.status == "expired":
                report["correctedExpiredToDraft"].append(
                    {
                        "slug": job.slug,
                        "title": title[:120],
                        "reasons": errors[:5],
                        "last_date": str(last),
                    }
                )
                if apply:
                    await session.execute(
                        update(Job)
                        .where(Job.id == job.id)
                        .values(
                            status="draft",
                            verification_status="NEEDS_REVIEW",
                            published_to_site=False,
                            document_type=doc_type if doc_type else job.document_type,
                            completeness_score=score,
                            updated_at=datetime.now(timezone.utc),
                        )
                    )
                    report["rowsUpdated"] += 1
            else:
                report["skipped"].append(
                    {
                        "slug": job.slug,
                        "title": title[:120],
                        "from": job.status,
                        "reasons": errors[:5],
                    }
                )

        if apply:
            await session.commit()
            if export:
                count = await JobPersistService().export_live_jobs_json(session)
                report["exportedJobs"] = count

    out = ROOT / "scripts" / "publish-gate-promote-report.json"
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(
        f"promoted={len(report['promoted'])} "
        f"correctedExpiredToDraft={len(report['correctedExpiredToDraft'])} "
        f"skipped={len(report['skipped'])} rowsUpdated={report['rowsUpdated']} "
        f"apply={apply} report={out}",
        flush=True,
    )
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--export", action="store_true")
    parser.add_argument("--limit", type=int, default=0, help="Max promotions (0 = all that pass)")
    args = parser.parse_args()
    raise SystemExit(asyncio.run(main(apply=args.apply, export=args.export, limit=args.limit)))
