#!/usr/bin/env python3
"""Persist the next official openings (NIC STA, UPSC 11/2026, NCRTC 32/33).

Sources are official .gov.in / .nic.in / ncrtc.in PDFs only. Does not import
FreeJobAlert. After persist, runs the same publish gate as live-jobs.json.
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
        "key": "nic-sta",
        "title": "Scientific / Technical Assistant-A (STA-A) — NIC/STA/2026/2",
        "dept": "National Informatics Centre (NIC)",
        "category": "central",
        "vacancies": 376,
        "qualification": (
            "M.Sc./MS/MCA/B.E./B.Tech in Computer Science, Electronics & Communication "
            "or Data Science / AI with a valid GATE 2024/2025/2026 score (CS / EC / DA)"
        ),
        "salary": "Level 6 Rs. 35400-112400",
        "age_limit": "30 years as on 30-09-2026 (relaxations as per official advertisement)",
        "last_date": "2026-09-30",
        "published_at": "2026-09-01",
        "apply_url": "https://recruitment.nic.in",
        "source_url": "https://recruitment.nic.in",
        "pdf": "https://recruitment.nic.in/DetailedSTA.pdf",
        "how_to_apply": "Apply online at https://recruitment.nic.in between 01-09-2026 and 30-09-2026",
        "selection_process": "GATE 2024/2025/2026 score merit list followed by document verification",
        "application_fee": "Rs. 800 for UR/OBC/EWS; Nil for SC/ST/PwBD/Women",
        "state": "All India",
    },
    {
        "key": "upsc-11-2026",
        "title": "UPSC Advertisement No. 11/2026 — Specialist, APP and other posts",
        "dept": "Union Public Service Commission (UPSC)",
        "category": "central",
        "vacancies": 212,
        "qualification": "As per official Advertisement No. 11/2026 (post-wise)",
        "salary": "As per official Advertisement No. 11/2026",
        "age_limit": "As per official Advertisement No. 11/2026 (post-wise)",
        "last_date": "2026-10-02",
        "published_at": "2026-09-12",
        "apply_url": "https://upsconline.nic.in",
        "source_url": "https://www.upsc.gov.in",
        "pdf": "https://www.upsc.gov.in/sites/default/files/AdvtNo-11-2026-Engl-100926.pdf",
        "how_to_apply": (
            "Apply online at https://upsconline.nic.in by 02-10-2026 "
            "(09-10-2026 for UT of Ladakh posts)"
        ),
        "selection_process": "Recruitment by selection as per Advertisement No. 11/2026",
        "application_fee": "Rs. 25 except Female/SC/ST/PwBD (exempted)",
        "state": "All India",
    },
    {
        "key": "ncrtc-32-2026",
        "title": "NCRTC Vacancy Notice 32/2026 — Supervisor-I and Junior Maintainer (O&M)",
        "dept": "National Capital Region Transport Corporation (NCRTC)",
        "category": "psu",
        "vacancies": 67,
        "qualification": "Diploma / B.E. / B.Tech in the relevant discipline as per official notice 32/2026",
        "salary": "Rs. 37000-115000 (Supervisor-I) / Rs. 18250-59200 (Junior Maintainer)",
        "age_limit": "As per official vacancy notice 32/2026 (as on 10-09-2026)",
        "last_date": "2026-10-09",
        "published_at": "2026-09-10",
        "apply_url": "https://ncrtc.in/jobs.php",
        "source_url": "https://ncrtc.in/wp-content/uploads/2026/09/322026VacancyNoticeforOnM.pdf",
        "pdf": "https://ncrtc.in/wp-content/uploads/2026/09/322026VacancyNoticeforOnM.pdf",
        "how_to_apply": "Apply online via Career on https://ncrtc.in by 09-10-2026 23:55 hrs",
        "selection_process": "Computer Based Test (CBT) as per vacancy notice 32/2026",
        "application_fee": "Rs. 500 for UR/OBC/EWS/Ex-Servicemen; Nil for SC/ST/PwBD",
        "state": "All India",
    },
    {
        "key": "ncrtc-33-2026",
        "title": "NCRTC Vacancy Notice 33/2026 — Supervisors and Non-Supervisors (contract)",
        "dept": "National Capital Region Transport Corporation (NCRTC)",
        "category": "psu",
        "vacancies": 23,
        "qualification": "Diploma / Graduate as per post in official vacancy notice 33/2026",
        "salary": "Rs. 37000-115000 (Supervisor-I) / Rs. 18250-59200 (Junior Maintainer)",
        "age_limit": "As per official vacancy notice 33/2026 (as on 10-09-2026)",
        "last_date": "2026-10-09",
        "published_at": "2026-09-10",
        "apply_url": "https://ncrtc.in/jobs.php",
        "source_url": (
            "https://ncrtc.in/wp-content/uploads/2026/09/"
            "332026VacancyNoticeforSupervisorNonsupervisorContractonRegualr-1.pdf"
        ),
        "pdf": (
            "https://ncrtc.in/wp-content/uploads/2026/09/"
            "332026VacancyNoticeforSupervisorNonsupervisorContractonRegualr-1.pdf"
        ),
        "how_to_apply": "Apply online via Career on https://ncrtc.in by 09-10-2026 23:55 hrs",
        "selection_process": "Computer Based Test (CBT) as per vacancy notice 33/2026",
        "application_fee": "Rs. 500 for UR/OBC/EWS/Ex-Servicemen; Nil for SC/ST/PwBD",
        "state": "All India",
    },
]


def _normalized(opening: dict) -> dict:
    pdf = opening["pdf"]
    return {
        "title": opening["title"],
        "dept": opening["dept"],
        "category": opening["category"],
        "vacancies": opening["vacancies"],
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
