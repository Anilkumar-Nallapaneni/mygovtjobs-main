#!/usr/bin/env python3
"""Persist official openings: HUDCO lateral, RCFL MT + apprentice, PFRDA Grade A, MECL.

Sources are official PSU/regulator PDFs only. Does not import FreeJobAlert.
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
from app.utils.official_hosts import is_official_recruitment_host, looks_like_notification_document  # noqa: E402

OPENINGS: list[dict] = [
    {
        "key": "hudco-lateral-2026",
        "title": "HUDCO lateral recruitment — DGM, AGM and Senior Manager (8 posts)",
        "dept": "Housing and Urban Development Corporation Limited (HUDCO)",
        "category": "psu",
        "vacancies": 8,
        "qualification": (
            "Bachelor’s degree in engineering / CA / CMA / two-year PG as per post "
            "in the official HUDCO detailed advertisement"
        ),
        "salary": "Rs. 60000-220000 (E-3 to E-5 as per post)",
        "age_limit": "35 to 45 years as on 01-08-2026 (post-wise)",
        "last_date": "2026-09-16",
        "published_at": "2026-08-27",
        "apply_url": "https://hudco.org.in/careers",
        "source_url": "https://hudco.org.in/writereaddata/Detailed-Advertisement.pdf",
        "pdf": "https://hudco.org.in/writereaddata/Detailed-Advertisement.pdf",
        "how_to_apply": "Apply online at https://hudco.org.in/careers by 16-09-2026 18:00 hrs",
        "selection_process": "Shortlisting and personal interview as per official advertisement",
        "application_fee": "Rs. 1500 for UR/EWS/OBC-NCL (inclusive of taxes)",
        "state": "All India",
    },
    {
        "key": "rcfl-mt-2026",
        "title": "RCF Management Trainee in various disciplines — Advt 16022026",
        "dept": "Rashtriya Chemicals and Fertilizers Limited (RCF)",
        "category": "psu",
        "qualification": (
            "Full-time B.E./B.Tech or equivalent in the relevant discipline as per "
            "Advertisement No. 16022026"
        ),
        "salary": "Rs. 60000 per month stipend during one-year training",
        "age_limit": "27 years as on 01-02-2026 for UR/EWS (relaxations as per advertisement)",
        "last_date": "2026-09-20",
        "published_at": "2026-08-08",
        "apply_url": "https://www.rcfltd.com/hrrecruitment/recruitment-1",
        "source_url": "https://rcfltd.com/files/MT%202026.pdf",
        "pdf": "https://rcfltd.com/files/MT%202026.pdf",
        "how_to_apply": (
            "Apply online via RCF recruitment (Advt 16022026); last date extended to "
            "20-09-2026 17:00 hrs on the official recruitment page"
        ),
        "selection_process": "Online test and personal interview as per Advertisement No. 16022026",
        "application_fee": "Rs. 1000 plus GST for UR/OBC/EWS; Nil for SC/ST/ExSM/PwBD/Female",
        "state": "All India",
    },
    {
        "key": "rcfl-apprentice-2026",
        "title": "RCF Graduate / Technician / Trade Apprentice 2026-27 (326 posts)",
        "dept": "Rashtriya Chemicals and Fertilizers Limited (RCF)",
        "category": "psu",
        "vacancies": 326,
        "qualification": "Graduate / Diploma / ITI as per trade in the official apprentice advertisement",
        "salary": "Stipend as per Apprentices Act / BOAT WR guidelines",
        "age_limit": "As per official apprentice advertisement (as on 01-09-2026)",
        "last_date": "2026-09-20",
        "published_at": "2026-09-04",
        "apply_url": "https://www.rcfltd.com/hrrecruitment/recruitment-1",
        "source_url": "https://www.rcfltd.com/files/Apprentice%20Advt%202026-27(%20new).pdf",
        "pdf": "https://www.rcfltd.com/files/Apprentice%20Advt%202026-27(%20new).pdf",
        "how_to_apply": "Apply online via RCF Recruitment — Engagement of Apprentices 2026-27 by 20-09-2026 17:00 hrs",
        "selection_process": "Engagement under the Apprentices Act, 1961 as per official advertisement",
        "application_fee": "No application fee as per official advertisement",
        "state": "All India",
    },
    {
        "key": "pfrda-grade-a-2026",
        "title": "PFRDA Officer Grade A (Assistant Manager) 2026 — Advt 03/2026",
        "dept": "Pension Fund Regulatory and Development Authority (PFRDA)",
        "category": "central",
        "vacancies": 30,
        "qualification": "As per official Advertisement No. 03/2026 (stream-wise)",
        "salary": "Rs. 62500-126100 (Grade A)",
        "age_limit": "30 years as on 31-07-2026",
        "last_date": "2026-09-24",
        "published_at": "2026-09-03",
        "apply_url": "https://www.pfrda.org.in",
        "source_url": (
            "https://pfrda.org.in/documents/33652/212847/"
            "Recruitment+of+Officer+Grade+A+%28Assistant+Manager%29-2026.pdf"
        ),
        "pdf": (
            "https://pfrda.org.in/documents/33652/212847/"
            "Recruitment+of+Officer+Grade+A+%28Assistant+Manager%29-2026.pdf"
        ),
        "how_to_apply": "Apply online at https://www.pfrda.org.in from 03-09-2026 to 24-09-2026",
        "selection_process": "Phase I and Phase II online examinations followed by interview",
        "application_fee": "Rs. 1000 for UR/EWS/OBC (inclusive of GST); exempted for SC/ST/PwBD/Ex-servicemen",
        "state": "All India",
    },
    {
        "key": "mecl-03-2026",
        "title": "MECL non-executive posts — Technician, Assistant and others (Advt 03/Rectt./2026)",
        "dept": "Mineral Exploration and Consultancy Limited (MECL)",
        "category": "psu",
        "qualification": "ITI / Diploma / Graduate as per post in Advertisement No. 03/Rectt./2026",
        "salary": "Rs. 20200-49300 (W-4) as per post",
        "age_limit": "30 years as per official advertisement (post-wise)",
        "last_date": "2026-10-11",
        "published_at": "2026-09-12",
        "apply_url": "https://www.mecl.co.in/Careers.aspx",
        "source_url": "https://www.mecl.co.in/writereaddata/meclpdf/Final_Advt_03R26.pdf",
        "pdf": "https://www.mecl.co.in/writereaddata/meclpdf/Final_Advt_03R26.pdf",
        "how_to_apply": "Apply online via MECL Careers from 12-09-2026 to 11-10-2026",
        "selection_process": "Written examination / skill or trade test and document verification as per official advertisement",
        "application_fee": "Rs. 500 for General/OBC/EWS",
        "state": "All India",
    },
]


def _normalized(opening: dict) -> dict:
    pdf = opening["pdf"]
    payload = {
        "title": opening["title"],
        "dept": opening["dept"],
        "category": opening["category"],
        "qualification": opening["qualification"],
        "salary": opening["salary"],
        "age_limit": opening["age_limit"],
        "last_date": opening["last_date"],
        "published_at": opening["published_at"],
        "apply_url": opening["apply_url"],
        "source_url": opening["source_url"],
        "document_type": "RECRUITMENT",
        "verification_status": "VERIFIED",
        "state": opening["state"],
        "detail": {
            "source": opening["key"],
            "pdf_url": pdf,
            "primary_pdf_url": pdf,
            "pdf_urls": [pdf],
            "notification_url": pdf,
            "how_to_apply": opening["how_to_apply"],
            "selection_process": opening["selection_process"],
            "application_fee": opening["application_fee"],
        },
    }
    if opening.get("vacancies"):
        payload["vacancies"] = opening["vacancies"]
    return payload


def _pdf_urls(job: Job) -> list[str]:
    detail = dict(job.detail or {})
    urls: list[str] = []
    for u in (
        job.primary_pdf_url,
        detail.get("primary_pdf_url"),
        detail.get("pdf_url"),
        detail.get("notification_url"),
    ):
        if isinstance(u, str) and u.strip():
            urls.append(u.strip())
    for item in detail.get("pdf_urls") or []:
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


def _gate_payload(opening: dict) -> dict:
    pdf = opening["pdf"]
    normalized = _normalized(opening)
    return {
        **normalized,
        "department": opening["dept"],
        "organization": opening["dept"],
        "primary_pdf_url": pdf,
        "notification_url": pdf,
        "document_type": "RECRUITMENT",
        "verification_status": "VERIFIED",
        "how_to_apply": opening["how_to_apply"],
        "selection_process": opening["selection_process"],
        "application_fee": opening["application_fee"],
    }


async def persist_openings(apply: bool) -> list[str]:
    ids: list[str] = []
    for opening in OPENINGS:
        pdf = opening["pdf"]
        print(f"\n== {opening['key']}", flush=True)
        print(
            f"   official={is_official_recruitment_host(pdf)} "
            f"pdfish={looks_like_notification_document(pdf)}",
            flush=True,
        )
        payload = _gate_payload(opening)
        score, missing = calculate_completeness(payload)
        validation = validate_job_for_publication({**payload, "completeness_score": score})
        print(
            f"   score={score} missing={missing[:6]} valid={validation.valid} "
            f"conf={validation.confidence} errors={validation.errors[:4]}",
            flush=True,
        )
        if not apply:
            continue
        normalized = _normalized(opening)
        digest = content_hash(
            title=normalized["title"],
            apply_url=normalized["apply_url"],
            last_date=normalized["last_date"],
        )
        normalized["content_hash"] = digest
        async with SessionLocal() as session:
            job = await JobPersistService().upsert_normalized(session, normalized, commit=True)
            if not job:
                print("   persist returned None", flush=True)
                continue
            job.qualification = opening["qualification"][:500]
            job.salary = opening["salary"][:128]
            job.age_limit = opening["age_limit"][:128]
            if opening.get("vacancies"):
                job.vacancies = int(opening["vacancies"])
            detail = dict(job.detail or {})
            detail["how_to_apply"] = opening["how_to_apply"]
            detail["selection_process"] = opening["selection_process"]
            detail["application_fee"] = opening["application_fee"]
            detail["primary_pdf_url"] = pdf
            detail["pdf_url"] = pdf
            detail["pdf_urls"] = [pdf]
            detail["notification_url"] = pdf
            job.detail = detail
            job.document_type = "RECRUITMENT"
            await session.commit()
            print(
                f"   saved slug={job.slug} status={job.status} score={job.completeness_score} id={job.id}",
                flush=True,
            )
            ids.append(str(job.id))
    return ids


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
                "how_to_apply": detail.get("how_to_apply"),
                "selection_process": detail.get("selection_process"),
                "application_fee": detail.get("application_fee"),
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
    ids = await persist_openings(apply=args.apply)
    print(f"\nready_ids={len(ids)}", flush=True)
    if ids:
        await promote(ids, apply=args.apply, export=args.export)
    elif not args.apply:
        print("dry-run only (pass --apply --export to persist)", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
