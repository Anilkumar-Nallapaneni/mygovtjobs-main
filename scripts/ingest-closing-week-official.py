#!/usr/bin/env python3
"""Enrich and promote closing-this-week official recruitments already in DB.

Does not import FreeJobAlert. Uses official PDFs already attached to drafts
(ISRO ICRB Scientist/Engineer SC, SSC JE 2026) then runs the publish gate.
"""
from __future__ import annotations

import argparse
import asyncio
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from sqlalchemy import select, update  # noqa: E402

from app.database.session import SessionLocal  # noqa: E402
from app.models.job import Job  # noqa: E402
from app.services.dedupe_service import content_hash, title_fingerprint  # noqa: E402
from app.services.job_completeness_service import calculate_completeness  # noqa: E402
from app.services.job_persist_service import JobPersistService  # noqa: E402
from app.services.noise_filter import (  # noqa: E402
    clean_job_title,
    clean_plain_text,
    sanitize_source_text_fields,
)
from app.services.publish_gate import india_today, validate_job_for_publication  # noqa: E402

# Fields taken from the official notification PDFs / career pages (not aggregators).
TARGET_SLUGS = (
    "isro-indian-space-research-organisation-inviting-applications-for-the-post-of-sc-b5ae0c29",
    "staff-selection-commission-ssc-notice-of-junior-engineer-examination-2026-2026-h-adfb1951",
)

# ISRO ICRB:03(EMC):2026 bilingual advertisement table: BE001 99 + BE002 52 + BE003 21.
ISRO_OVERLAY = {
    "qualification": (
        "BE/B.Tech or equivalent in Electronics & Communication, Mechanical or "
        "Computer Science Engineering with minimum 65% marks or CGPA 6.84/10"
    ),
    "salary": "Level 10 of Pay Matrix",
    "age_limit": "28 years as on 16-09-2026",
    "vacancies": 172,
    "how_to_apply": "Apply online at https://www.isro.gov.in/ICRB_Recruitment13.html",
    "selection_process": "Written test / CBT and interview as per the official advertisement",
}

SSC_JE_OVERLAY = {
    "how_to_apply": "Apply online at https://ssc.gov.in",
    "salary": "Pay as per 7th Central Pay Commission (see official notice)",
}

IOCL_PDF = "https://iocl.com/admin/img/UploadedFiles/LatestJobOpening/Files/1d167fc3d4b14cb394ac728aff0d32e9.pdf"


def _pdf_urls(job: Job) -> list[str]:
    detail = dict(job.detail or {})
    urls: list[str] = []
    for u in (
        job.primary_pdf_url,
        detail.get("primary_pdf_url"),
        detail.get("pdf_url"),
        detail.get("pdfUrl"),
        detail.get("notification_url"),
        job.apply_url if job.apply_url and ".pdf" in str(job.apply_url).lower() else None,
    ):
        if isinstance(u, str) and u.strip():
            urls.append(u.strip())
    for item in detail.get("pdf_urls") or detail.get("pdfUrls") or []:
        if isinstance(item, str) and item.strip():
            urls.append(item.strip())
    seen: set[str] = set()
    out: list[str] = []
    for u in urls:
        key = u.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(u)
    return out


def _apply_overlay(job: Job, overlay: dict) -> None:
    detail = dict(job.detail or {})
    if overlay.get("qualification"):
        job.qualification = overlay["qualification"][:500]
    if overlay.get("salary"):
        job.salary = overlay["salary"][:128]
    if overlay.get("age_limit"):
        job.age_limit = overlay["age_limit"][:128]
    if overlay.get("vacancies"):
        job.vacancies = int(overlay["vacancies"])
    for key in ("how_to_apply", "selection_process", "application_fee"):
        if overlay.get(key):
            detail[key] = overlay[key]
    job.detail = detail
    job.document_type = "RECRUITMENT"


async def enrich(apply: bool) -> list[str]:
    ready: list[str] = []
    today = india_today()
    async with SessionLocal() as session:
        rows = (await session.execute(select(Job).where(Job.slug.in_(TARGET_SLUGS)))).scalars().all()
        print(f"matched drafts/rows={len(rows)}", flush=True)
        for job in rows:
            title = (job.title or "")[:120]
            overlay = ISRO_OVERLAY if "isro" in (job.slug or "") else SSC_JE_OVERLAY
            print(f"\n-- {job.status} {title}", flush=True)
            print(f"   before last={job.last_date} vac={job.vacancies} score={job.completeness_score}", flush=True)
            _apply_overlay(job, overlay)
            payload = {
                "title": job.title,
                "dept": job.dept,
                "department": job.dept,
                "apply_url": job.apply_url,
                "source_url": job.source_url or job.apply_url,
                "last_date": job.last_date,
                "vacancies": job.vacancies,
                "qualification": job.qualification,
                "salary": job.salary,
                "age_limit": job.age_limit,
                "detail": job.detail,
            }
            score, missing = calculate_completeness(payload)
            job.completeness_score = score
            last = job.last_date
            if hasattr(last, "date") and last is not None:
                last = last.date()
            print(f"   after vac={job.vacancies} score={score} missing={missing[:6]} last={last}", flush=True)
            if last and last >= today:
                ready.append(str(job.id))
            if apply:
                await session.merge(job)
        if apply:
            await session.commit()
            print("enrich committed", flush=True)
    return ready


async def persist_iocl(apply: bool) -> str | None:
    """Insert/update IOCL experienced-professionals notice from the official PDF."""
    pdf = IOCL_PDF
    normalized = {
        "title": "Recruitment of Experienced Professionals — Production Manager and Senior Manager (PBR)",
        "dept": "Indian Oil Corporation Limited (IOCL)",
        "category": "psu",
        "vacancies": 3,
        "qualification": "As per official advertisement IOCL/CO-HR/RECTT/2026/02",
        "salary": "Rs. 80000 - 240000",
        "age_limit": "As per official advertisement",
        "last_date": "2026-09-17",
        "apply_url": "https://iocl.com/latest-job-opening",
        "source_url": "https://iocl.com/latest-job-opening",
        "published_at": "2026-09-03",
        "document_type": "RECRUITMENT",
        "verification_status": "VERIFIED",
        "state": "All India",
        "detail": {
            "source": "iocl",
            "pdf_url": pdf,
            "primary_pdf_url": pdf,
            "pdf_urls": [pdf],
            "notification_url": pdf,
            "how_to_apply": "Apply online at https://iocl.com/latest-job-opening",
            "selection_process": "Document verification / personal interview as per official advertisement",
        },
    }
    digest = content_hash(
        title=normalized["title"],
        apply_url=normalized["apply_url"],
        last_date=normalized["last_date"],
    )
    normalized["content_hash"] = digest
    if not apply:
        payload = {
            **normalized,
            "department": normalized["dept"],
            "primary_pdf_url": pdf,
        }
        score, missing = calculate_completeness(payload)
        validation = validate_job_for_publication({**payload, "completeness_score": score})
        print(
            f"IOCL dry-run score={score} missing={missing[:6]} "
            f"valid={validation.valid} conf={validation.confidence} errors={validation.errors[:4]}",
            flush=True,
        )
        return None
    async with SessionLocal() as session:
        job = await JobPersistService().upsert_normalized(session, normalized, commit=True)
        if job:
            job.qualification = "As per official advertisement IOCL/CO-HR/RECTT/2026/02"
            job.salary = "Rs. 80000 - 240000"
            job.age_limit = "As per official advertisement"
            await session.commit()
            print(f"IOCL saved slug={job.slug} status={job.status} score={job.completeness_score}", flush=True)
            return str(job.id)
        print("IOCL persist returned None", flush=True)
        return None


async def promote(ids: list[str], apply: bool, export: bool) -> None:
    today = india_today()
    promoted = 0
    skipped: list[tuple[str, str]] = []
    async with SessionLocal() as session:
        live_fps = {
            title_fingerprint(clean_job_title(r.title or ""))
            for r in (await session.execute(select(Job).where(Job.status == "live"))).scalars().all()
            if r.title
        }
        rows = (await session.execute(select(Job).where(Job.id.in_(ids)))).scalars().all() if ids else []
        for job in rows:
            title = clean_job_title(job.title or "")
            fp = title_fingerprint(title)
            if fp and fp in live_fps:
                skipped.append((title[:80], "duplicate live"))
                continue
            last = job.last_date
            if hasattr(last, "date") and last is not None:
                last = last.date()
            if not last or last < today:
                skipped.append((title[:80], f"bad last_date {last}"))
                continue
            detail = sanitize_source_text_fields(job.detail if isinstance(job.detail, dict) else {})
            overlay = ISRO_OVERLAY if "isro" in (job.slug or "") else (
                SSC_JE_OVERLAY if "junior-engineer-examination-2026" in (job.slug or "") else {}
            )
            if overlay:
                if overlay.get("qualification"):
                    job.qualification = overlay["qualification"]
                if overlay.get("salary"):
                    job.salary = overlay["salary"]
                if overlay.get("age_limit"):
                    job.age_limit = overlay["age_limit"]
                if overlay.get("vacancies"):
                    job.vacancies = int(overlay["vacancies"])
                for key in ("how_to_apply", "selection_process", "application_fee"):
                    if overlay.get(key):
                        detail[key] = overlay[key]
            dept = clean_plain_text(job.dept) or (job.dept or "").strip() or None
            pdf_url = job.primary_pdf_url or detail.get("primary_pdf_url") or detail.get("pdf_url")
            payload = {
                "title": title,
                "dept": dept,
                "department": dept,
                "organization": dept,
                "apply_url": job.apply_url,
                "source_url": job.source_url or job.apply_url or pdf_url,
                "notification_url": detail.get("notification_url") or pdf_url,
                "primary_pdf_url": pdf_url,
                "document_type": "RECRUITMENT",
                "verification_status": "VERIFIED",
                "published_at": job.published_at,
                "last_date": last,
                "vacancies": job.vacancies,
                "qualification": clean_plain_text(job.qualification) or None,
                "salary": job.salary,
                "age_limit": job.age_limit,
                "detail": detail,
                "pdf_urls": _pdf_urls(job),
                "state": "India",
                "location": "India",
            }
            score, _ = calculate_completeness(payload)
            payload["completeness_score"] = score
            validation = validate_job_for_publication(payload, today=today)
            ok = validation.valid and validation.confidence >= 90.0
            if not ok:
                skipped.append(
                    (title[:80], f"gate:{validation.errors[:4]} conf={validation.confidence} score={score}")
                )
                continue
            print(f"PROMOTE conf={validation.confidence:.0f} score={score} | {title[:90]}", flush=True)
            if apply:
                await session.execute(
                    update(Job)
                    .where(Job.id == job.id)
                    .values(
                        title=title,
                        dept=dept,
                        qualification=payload["qualification"],
                        detail=detail,
                        document_type="RECRUITMENT",
                        verification_status="VERIFIED",
                        status="live",
                        published_to_site=True,
                        completeness_score=score,
                        publication_confidence=float(validation.confidence),
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
                print(f"exported={count}", flush=True)
    print(f"promoted={promoted} skipped={len(skipped)}", flush=True)
    for t, reason in skipped:
        print(f"  skip: {reason} | {t}", flush=True)


async def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--export", action="store_true")
    args = ap.parse_args()
    ready = await enrich(apply=args.apply)
    iocl_id = await persist_iocl(apply=args.apply)
    if iocl_id:
        ready.append(iocl_id)
    print(f"\nready_ids={len(ready)}", flush=True)
    await promote(ready, apply=args.apply, export=args.export)
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
