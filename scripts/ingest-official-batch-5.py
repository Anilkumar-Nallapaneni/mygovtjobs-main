#!/usr/bin/env python3
"""Persist remaining official PSU PDFs: RFCL, SECI, Exim Bank, CONCOR.

Sources are official PSU PDFs only. Does not import FreeJobAlert.
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
        "key": "rfcl-rectt-01-2026",
        "title": "RFCL experienced professionals — Rectt/01/2026 (40 posts)",
        "dept": "Ramagundam Fertilizers and Chemicals Limited (RFCL)",
        "category": "psu",
        "vacancies": 40,
        "qualification": (
            "Engineering degree / post-wise qualification in Chemical, Mechanical and "
            "other disciplines as per Advertisement No. Rectt/01/2026"
        ),
        "salary": "IDA E-1 to E-4 scales as per Rectt/01/2026 (e.g. Rs. 40000-140000 at E-1)",
        "age_limit": "Post-wise upper age as on the last date in Advertisement No. Rectt/01/2026",
        "last_date": "2026-09-24",
        "published_at": "2026-08-26",
        "apply_url": "https://www.rfcl.co.in",
        "source_url": "https://www.rfcl.co.in/upload/Detailed%20Advt%2001_2026.pdf",
        "pdf": "https://www.rfcl.co.in/upload/Detailed%20Advt%2001_2026.pdf",
        "how_to_apply": (
            "Apply online at https://www.rfcl.co.in Careers from 26-08-2026 08:00 hrs "
            "to 24-09-2026 17:00 hrs, then send the printed form with documents to "
            "DGM (HR), RFCL, Noida by 01-10-2026 (08-10-2026 for far-flung areas)"
        ),
        "selection_process": "Scrutiny of applications and personal interview; CBT if applications are large",
        "application_fee": "Rs. 700 (E-1 to E-4) / Rs. 1000 (E-5 and above); Nil for SC/ST/PwBD/ExSM/Departmental",
        "state": "All India",
    },
    {
        "key": "seci-3-2026",
        "title": "SECI experienced professionals — Notification 3/2026 (28 posts)",
        "dept": "Solar Energy Corporation of India Limited (SECI)",
        "category": "psu",
        "vacancies": 28,
        "qualification": (
            "Graduate / B.Tech / LLB as per post in Notification No. 3/2026 "
            "(9 regular + 19 fixed-term posts)"
        ),
        "salary": "IDA E-8 to E-1 regular scales; FTE consolidated CTC as per Notification 3/2026",
        "age_limit": "28-55 years post-wise as on the closing date in Notification No. 3/2026",
        "last_date": "2026-09-23",
        "published_at": "2026-08-24",
        "apply_url": "https://www.seci.co.in",
        "source_url": "https://www.seci.co.in/uploads/careers/Final_notification_3-2026_24th_August1.pdf",
        "pdf": "https://www.seci.co.in/uploads/careers/Final_notification_3-2026_24th_August1.pdf",
        "how_to_apply": (
            "Register online on the SECI website from 25-08-2026 11:00 hrs to "
            "23-09-2026 17:00 hrs as per Notification No. 3/2026"
        ),
        "selection_process": "Shortlisting and interview as per SECI Notification No. 3/2026",
        "application_fee": "Rs. 1000 for regular executive posts; Rs. 500 for fixed-term executive posts",
        "state": "All India",
    },
    {
        "key": "exim-srd-2026-04",
        "title": "Exim Bank SRD Deputy Manager and Manager — HRM/DM & M/SRD/2026-27/04 (8 posts)",
        "dept": "Export-Import Bank of India",
        "category": "psu",
        "vacancies": 8,
        "qualification": (
            "Graduation with minimum 50% aggregate marks for Deputy Manager (6) and "
            "Manager (2) as per Advt. HRM/DM & M/SRD/2026-27/04"
        ),
        "salary": "JM-I Rs. 48480-85920 (DM CTC ~Rs. 18 lakh); MM-II Rs. 64820-93960 (Manager CTC ~Rs. 20 lakh)",
        "age_limit": "Maximum age as on 31-08-2026 as per Advt. HRM/DM & M/SRD/2026-27/04",
        "last_date": "2026-10-10",
        "published_at": "2026-09-15",
        "apply_url": "https://www.eximbankindia.in/careers",
        "source_url": (
            "https://www.eximbankindia.in/sites/default/files/2026-09/"
            "Detailed%20SRD%20Advertisement%20for%20Website.pdf"
        ),
        "pdf": (
            "https://www.eximbankindia.in/sites/default/files/2026-09/"
            "Detailed%20SRD%20Advertisement%20for%20Website.pdf"
        ),
        "how_to_apply": (
            "Apply online via the Exim Bank careers link from 15-09-2026 to 10-10-2026; "
            "registration completes only after fee payment"
        ),
        "selection_process": "Written examination (70%) and interview (30%); tentative written exam November 2026",
        "application_fee": "Online examination fee / intimation charges as per Advt. HRM/DM & M/SRD/2026-27/04",
        "state": "All India",
    },
    {
        "key": "concor-mt-ao-2026",
        "title": "CONCOR Management Trainee and Accounts Officer — 18 Aug 2026 (77 posts)",
        "dept": "Container Corporation of India Limited (CONCOR)",
        "category": "psu",
        "vacancies": 77,
        "qualification": (
            "MBA / CA / CMA / engineering or post-wise qualification for Management "
            "Trainee (45) and Accounts Officer (32) in the 18 August 2026 detailed advertisement"
        ),
        "salary": "IDA Rs. 50000-160000 (MT) / Accounts Officer scale as per CONCOR detailed advertisement",
        "age_limit": "Post-wise upper age as in the CONCOR detailed advertisement dated 18-08-2026",
        "last_date": "2026-09-30",
        "published_at": "2026-08-18",
        "apply_url": "https://www.concorindia.co.in",
        "source_url": (
            "https://cms.concorindia.co.in:8000/uploads/cms/pdf/"
            "Asf6Xc3Mnw5BWdp_FinalAdvertisement-18thAug2026(Published).pdf"
        ),
        "pdf": (
            "https://cms.concorindia.co.in:8000/uploads/cms/pdf/"
            "Asf6Xc3Mnw5BWdp_FinalAdvertisement-18thAug2026(Published).pdf"
        ),
        "how_to_apply": (
            "Apply online via CONCOR HR & Career on https://www.concorindia.co.in "
            "by 30-09-2026 23:55 hrs"
        ),
        "selection_process": "As per CONCOR detailed advertisement dated 18 August 2026",
        "application_fee": "Rs. 750 (Management Trainee) / Rs. 500 (Accounts Officer); relaxations as per advertisement",
        "state": "All India",
    },
    {
        "key": "bcpl-ne-06-2026",
        "title": "BCPL Foreman, Operator, Technician and Trainee — Advt BCPL-NE/06/2026 (24 posts)",
        "dept": "Brahmaputra Cracker and Polymer Limited (BCPL)",
        "category": "psu",
        "vacancies": 24,
        "qualification": (
            "Diploma in Engineering / B.Sc. / B.Com. / Matric plus ITI or NAC as per post "
            "in Advertisement No. BCPL-NE/06/2026"
        ),
        "salary": "S-5 Rs. 28500-86570 / S-3 Rs. 25000-81430; trainee stipend as per advertisement",
        "age_limit": "30 or 32 years as on 09-10-2026 for UR (post-wise in BCPL-NE/06/2026)",
        "last_date": "2026-10-09",
        "published_at": "2026-09-10",
        "apply_url": "https://www.bcplonline.co.in/Career/Index",
        "source_url": "https://bcplonline.co.in/UploadFiles/Downloads/BCPL-NE062026.pdf",
        "pdf": "https://bcplonline.co.in/UploadFiles/Downloads/BCPL-NE062026.pdf",
        "how_to_apply": (
            "Apply online through the BCPL website www.bcplonline.co.in from "
            "10-09-2026 08:00 hrs to 09-10-2026 17:00 hrs"
        ),
        "selection_process": "Written test and/or skill test or interview as per Advertisement No. BCPL-NE/06/2026",
        "application_fee": "Rs. 200 for UR/EWS/OBC(NCL); Nil for SC/ST/PwBD",
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
