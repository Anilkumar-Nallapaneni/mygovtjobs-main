#!/usr/bin/env python3
"""Persist official openings: RCF AO, PMBI, Prasar Bharati, NTH YP, ISRO IPRC.

Sources are official .gov.in / PSU PDFs only. Does not import FreeJobAlert.
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
        "key": "rcfl-ao-secretarial-2026",
        "title": "RCF Assistant Officer (Secretarial) E0 Grade — Advt 01072026 (10 posts)",
        "dept": "Rashtriya Chemicals and Fertilizers Limited (RCF)",
        "category": "psu",
        "vacancies": 10,
        "qualification": (
            "Graduate and postgraduate from a UGC/AICTE recognised university plus a "
            "recognised secretarial diploma, or a full-time degree in Office Management "
            "and Secretarial Practice, as per Advertisement No. 01072026"
        ),
        "salary": "Rs. 30000-120000 (E0); approx. Rs. 65000 monthly gross",
        "age_limit": "32 years as on 01-07-2026 for UR/EWS (relaxations as per advertisement)",
        "last_date": "2026-09-26",
        "published_at": "2026-09-03",
        "apply_url": "https://www.rcfltd.com/hrrecruitment/recruitment-1",
        "source_url": "https://www.rcfltd.com/files/Secretarial%20advertisement%2003_09_2026.pdf",
        "pdf": "https://www.rcfltd.com/files/Secretarial%20advertisement%2003_09_2026.pdf",
        "how_to_apply": (
            "Apply online via RCF recruitment for Assistant Officer (Secretarial) E0 Grade "
            "from 10-09-2026 08:00 hrs to 26-09-2026 17:00 hrs"
        ),
        "selection_process": "Online test and qualifying skill test as per Advertisement No. 01072026",
        "application_fee": "Rs. 1000 plus GST for UR/OBC/EWS; Nil for SC/ST/ExSM/PwBD/Female/Departmental",
        "state": "All India",
    },
    {
        "key": "pmbi-02-2026",
        "title": "PMBI contractual posts — Pharmacist, Executive and others (Advt 02/2026, 178 posts)",
        "dept": "Pharmaceuticals & Medical Devices Bureau of India (PMBI)",
        "category": "central",
        "vacancies": 178,
        "qualification": "Graduate / B.Pharma / post-wise qualification in Advt. No. 02/2026",
        "salary": "Consolidated pay as per post in Advt. No. 02/2026",
        "age_limit": "Post-wise maximum age as per Advt. No. 02/2026",
        "last_date": "2026-09-24",
        "published_at": "2026-09-03",
        "apply_url": "https://www.pmbi.co.in/index.aspx",
        "source_url": "https://www.pmbi.co.in/vacancies/HR_Advt_No_022026_03092026.pdf",
        "pdf": "https://www.pmbi.co.in/vacancies/HR_Advt_No_022026_03092026.pdf",
        "how_to_apply": (
            "Send hard-copy application with Rs. 100 demand draft to CEO, PMBI, "
            "B-500, Tower B, 5th Floor, World Trade Centre, Nauroji Nagar, New Delhi 110029 "
            "by 24-09-2026 17:00 hrs"
        ),
        "selection_process": "Shortlisting as per vacancy circular Advt. No. 02/2026",
        "application_fee": "Rs. 100 demand draft in favour of Pharmaceuticals & Medical Devices Bureau of India (PMBI)",
        "state": "All India",
    },
    {
        "key": "prasar-bharati-me-2026",
        "title": "Prasar Bharati Marketing Executive — NIA/2026/10/Sales (20 posts)",
        "dept": "Prasar Bharati",
        "category": "central",
        "vacancies": 20,
        "qualification": "MBA / MBA (Marketing) / PG Diploma in Management or Marketing, plus 1 year direct sales",
        "salary": "Rs. 35000-42000 per month; Rs. 35000-50000 in metro cities",
        "age_limit": "Below 35 years as on 07-09-2026",
        "last_date": "2026-09-22",
        "published_at": "2026-09-07",
        "apply_url": "https://prasarbharati.gov.in",
        "source_url": "https://prasarbharati.gov.in/wp-content/uploads/2026/09/NIA-ME-1.pdf",
        "pdf": "https://prasarbharati.gov.in/wp-content/uploads/2026/09/NIA-ME-1.pdf",
        "how_to_apply": (
            "Apply online at https://avedan.prasarbharati.org within 15 days of newspaper "
            "publication of NIA/2026/10/Sales dated 07-09-2026"
        ),
        "selection_process": "Shortlisting of applications; test and/or interview as decided by Prasar Bharati",
        "application_fee": "As per official NIA/2026/10/Sales",
        "state": "All India",
    },
    {
        "key": "nth-yp-2026-27",
        "title": "National Test House Young Professional (Sr/Jr) — NTH(HQ)/YP/ADVT./01/2026-27 (36 posts)",
        "dept": "National Test House (NTH)",
        "category": "central",
        "vacancies": 36,
        "qualification": "BE/B.Tech / M.Sc / MBA or PG Diploma as per discipline in the official advertisement",
        "salary": "Rs. 70000 per month (Sr YP) / Rs. 40000 per month (Jr YP), consolidated",
        "age_limit": "38 years (Sr YP) / 35 years (Jr YP) as on the last date of application",
        "last_date": "2026-09-26",
        "published_at": "2026-09-11",
        "apply_url": "https://nth.gov.in/recruitment-notices",
        "source_url": (
            "https://nth.gov.in/storage/recruitment-notices/"
            "3e4ed89f3c55ca7a5b8b8f575ea69c004afc0e78_37.pdf"
        ),
        "pdf": (
            "https://nth.gov.in/storage/recruitment-notices/"
            "3e4ed89f3c55ca7a5b8b8f575ea69c004afc0e78_37.pdf"
        ),
        "how_to_apply": (
            "Email the prescribed application to the location-wise NTH address in the "
            "advertisement within 15 days of publication in Employment News (12-18 Sep 2026)"
        ),
        "selection_process": "Screening of applications followed by interview of shortlisted candidates",
        "application_fee": "No application fee as per official advertisement",
        "state": "All India",
    },
    {
        "key": "isro-iprc-2026-01",
        "title": "ISRO IPRC Technical Assistant, Technician B, Cook and Fireman — IPRC/RMT/2026/01 (22 posts)",
        "dept": "ISRO Propulsion Complex (IPRC), Mahendragiri",
        "category": "central",
        "vacancies": 22,
        "qualification": "Diploma / ITI / SSLC with trade as per post code in Advertisement No. IPRC/RMT/2026/01",
        "salary": "Level 7 / Level 3 / Level 2 as per post in the official advertisement",
        "age_limit": "18-35 years (post codes 60-68 & 70) / 18-25 years (Fireman A) as on 05-10-2026",
        "last_date": "2026-10-05",
        "published_at": "2026-09-12",
        "apply_url": "https://www.iprc.gov.in/careers.html",
        "source_url": "https://www.iprc.gov.in/files/careers/Advertisement_12092026.pdf",
        "pdf": "https://www.iprc.gov.in/files/careers/Advertisement_12092026.pdf",
        "how_to_apply": "Apply online at https://www.iprc.gov.in from 15-09-2026 10:00 hrs to 05-10-2026 16:00 hrs",
        "selection_process": "Written test and skill test / PET as per post in Advertisement No. IPRC/RMT/2026/01",
        "application_fee": "Rs. 750 (post codes 60-62) / Rs. 500 (other codes); refund rules as per advertisement",
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
