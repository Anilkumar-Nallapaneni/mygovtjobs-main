"""Demote non-recruitment / implausible-date live jobs to draft (publish gate backfill).

Dry-run by default. Pass --apply to write changes. Pass --export to refresh live-jobs.json.

Conservative by default: only demote clear non-recruitment types and hard date/link failures.
Pass --strict to also require organisation + verified structural gate (empties more of the catalog).
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
from app.services.document_classifier import classify_document_type
from app.services.job_persist_service import JobPersistService
from app.services.dedupe_service import title_fingerprint
from app.services.noise_filter import clean_job_title, clean_plain_text, sanitize_source_text_fields
from app.services.publish_gate import can_publish_job, india_today

_NON_RECRUITMENT = {
    "RESULT",
    "ADMIT_CARD",
    "ANSWER_KEY",
    "CORRIGENDUM",
    "EXAM_NOTICE",
    "RECRUITMENT_RULES",
    "FORM",
    "TENDER",
    "GENERAL_NOTICE",
}


def _as_date(value) -> date | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    try:
        return date.fromisoformat(str(value)[:10])
    except ValueError:
        return None


def _hard_date_errors(job: Job, today: date) -> list[str]:
    errors: list[str] = []
    published_at = _as_date(job.published_at)
    deadline = _as_date(job.last_date)
    if published_at:
        if published_at > today + timedelta(days=1):
            errors.append("Publication date is in the future")
        if published_at < date(today.year - 2, 1, 1):
            errors.append("Publication date is implausibly old")
    if deadline and published_at and deadline < published_at:
        errors.append("Deadline occurs before publication date")
    if deadline and deadline > today + timedelta(days=365):
        errors.append("Deadline is implausibly far in the future")
    return errors


async def main(apply: bool, export: bool, strict: bool) -> int:
    today = india_today()
    report = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "apply": apply,
        "strict": strict,
        "classified": 0,
        "demoted": [],
        "vacanciesNulled": 0,
        "keptLive": 0,
        "markedRecruitment": 0,
        "textSanitized": 0,
        "rowsUpdated": 0,
    }

    async with SessionLocal() as session:
        rows = (
            await session.execute(select(Job).where(Job.status.in_(("live", "expired", "draft"))))
        ).scalars().all()
        for job in rows:
            original_title = job.title or ""
            title = clean_job_title(original_title)
            url = job.apply_url or getattr(job, "source_url", None) or ""
            original_detail = job.detail if isinstance(job.detail, dict) else {}
            detail = sanitize_source_text_fields(original_detail)
            clean_dept = clean_plain_text(job.dept) or None
            clean_qualification = clean_plain_text(job.qualification) or None
            text_changed = (
                title != original_title
                or detail != original_detail
                or clean_dept != job.dept
                or clean_qualification != job.qualification
            )
            if text_changed:
                report["textSanitized"] += 1
            summary = str(detail.get("summary") or "")
            doc_type = (job.document_type or "").upper() or classify_document_type(
                title=title, url=url or "", text=summary, dept=job.dept or ""
            )
            # Prefer RECRUITMENT when classifier is UNKNOWN but title already passed live filters
            if doc_type == "UNKNOWN" and job.status == "live":
                soft = classify_document_type(
                    title=f"{title} recruitment notification",
                    url=url or "",
                    text=summary,
                    dept=job.dept or "",
                )
                if soft == "RECRUITMENT":
                    doc_type = "RECRUITMENT"
            report["classified"] += 1

            vacancies = job.vacancies
            null_vacancies = vacancies is not None and int(vacancies or 0) == 0

            reasons: list[str] = []
            should_demote = False

            if job.status == "live":
                if doc_type in _NON_RECRUITMENT:
                    should_demote = True
                    reasons.append(f"document_type={doc_type}")
                else:
                    date_errors = _hard_date_errors(job, today)
                    if date_errors:
                        should_demote = True
                        reasons.extend(date_errors)
                    if not (job.apply_url or getattr(job, "source_url", None) or detail.get("pdf_urls") or detail.get("pdfUrls")):
                        should_demote = True
                        reasons.append("Missing apply or notification link")
                    if strict:
                        payload = {
                            "title": title,
                            "dept": job.dept,
                            "apply_url": job.apply_url,
                            "source_url": getattr(job, "source_url", None) or detail.get("source_url"),
                            "document_type": "RECRUITMENT" if doc_type in ("RECRUITMENT", "UNKNOWN") else doc_type,
                            "verification_status": "VERIFIED",
                            "published_at": job.published_at,
                            "last_date": job.last_date,
                            "vacancies": job.vacancies,
                            "qualification": clean_qualification,
                            "salary": job.salary,
                            "age_limit": job.age_limit,
                            "completeness_score": getattr(job, "completeness_score", 0),
                            "detail": detail,
                        }
                        ok, errors = can_publish_job(payload, today=today)
                        if not ok:
                            should_demote = True
                            reasons.extend(errors)

            new_status = job.status
            new_verification = getattr(job, "verification_status", None) or "UNVERIFIED"
            new_doc = doc_type
            if should_demote:
                new_status = "draft"
                new_verification = "REJECTED" if doc_type in _NON_RECRUITMENT else "NEEDS_REVIEW"
                report["demoted"].append(
                    {
                        "slug": job.slug,
                        "title": title[:120],
                        "from": job.status,
                        "reasons": reasons,
                        "document_type": doc_type,
                    }
                )
            elif job.status == "live":
                if doc_type in ("UNKNOWN", "RECRUITMENT"):
                    new_doc = "RECRUITMENT"
                    new_verification = "VERIFIED"
                    report["markedRecruitment"] += 1
                report["keptLive"] += 1

            if apply:
                values = {
                    "title": title,
                    "title_fingerprint": title_fingerprint(title),
                    "dept": clean_dept,
                    "qualification": clean_qualification,
                    "detail": detail,
                    "document_type": new_doc,
                    "verification_status": new_verification,
                    "status": new_status,
                    "updated_at": datetime.now(timezone.utc),
                }
                if null_vacancies:
                    values["vacancies"] = None
                    report["vacanciesNulled"] += 1
                state_changed = (
                    new_doc != job.document_type
                    or new_verification != job.verification_status
                    or new_status != job.status
                    or null_vacancies
                )
                if text_changed or state_changed:
                    await session.execute(update(Job).where(Job.id == job.id).values(**values))
                    report["rowsUpdated"] += 1
            elif null_vacancies:
                report["vacanciesNulled"] += 1

        if apply:
            await session.commit()
            if export:
                count = await JobPersistService().export_live_jobs_json(session)
                report["exportedJobs"] = count

    out = ROOT / "scripts" / "publish-gate-demote-report.json"
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(
        f"classified={report['classified']} demoted={len(report['demoted'])} "
        f"keptLive={report['keptLive']} markedRecruitment={report['markedRecruitment']} "
        f"textSanitized={report['textSanitized']} vacanciesNulled={report['vacanciesNulled']} "
        f"rowsUpdated={report['rowsUpdated']} apply={apply} strict={strict} report={out}"
    )
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--export", action="store_true")
    parser.add_argument("--strict", action="store_true")
    args = parser.parse_args()
    raise SystemExit(asyncio.run(main(apply=args.apply, export=args.export, strict=args.strict)))
