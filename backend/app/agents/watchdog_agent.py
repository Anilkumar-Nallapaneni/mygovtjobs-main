"""Watchdog Agent — re-check live jobs and demote bad ones.

AI employee that protects catalog quality after publish.
"""

from __future__ import annotations

import json
import logging
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import select, update

from app.agents.qa_review_agent import improve_title
from app.database.session import SessionLocal
from app.models.job import Job
from app.services.document_classifier import classify_document_type
from app.services.noise_filter import sanitize_source_text_fields
from app.services.publish_gate import can_publish_job, india_today
from app.utils.vacancy_extract import is_non_vacancy_document

logger = logging.getLogger(__name__)

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


def _repo_root() -> Path:
    here = Path(__file__).resolve()
    for base in (here.parents[2], here.parents[3]):
        if (base / "frontend" / "public" / "data").is_dir():
            return base
    return here.parents[3]


def _as_date(value: Any) -> date | None:
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


class WatchdogAgent:
    """Demote live jobs that fail hard quality checks."""

    async def run(self, *, apply: bool = False, export: bool = False, limit: int = 0) -> dict[str, Any]:
        today = india_today()
        report: dict[str, Any] = {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "apply": apply,
            "scanned": 0,
            "ok": 0,
            "demoted": [],
            "rowsUpdated": 0,
        }

        async with SessionLocal() as session:
            rows = (await session.execute(select(Job).where(Job.status == "live"))).scalars().all()
            for job in rows:
                if limit > 0 and report["scanned"] >= limit:
                    break
                report["scanned"] += 1
                detail = sanitize_source_text_fields(job.detail if isinstance(job.detail, dict) else {})
                title = improve_title(job.title)
                url = job.apply_url or job.source_url or ""
                summary = str(detail.get("summary") or "")
                reasons: list[str] = []

                if is_non_vacancy_document(title=title, context=summary):
                    reasons.append("non-vacancy document")

                doc_type = (job.document_type or "").upper() or classify_document_type(
                    title=title, url=url, text=summary, dept=job.dept or ""
                )
                if doc_type in _NON_RECRUITMENT:
                    reasons.append(f"document_type={doc_type}")

                last = _as_date(job.last_date)
                if last is None:
                    reasons.append("missing last_date")
                elif last < today - timedelta(days=1):
                    reasons.append("deadline expired")

                pub = _as_date(job.published_at)
                if pub and last and last < pub:
                    reasons.append("deadline before publication")

                if not (job.apply_url or job.source_url or job.primary_pdf_url):
                    reasons.append("missing official links")

                payload = {
                    "title": title,
                    "dept": job.dept,
                    "apply_url": job.apply_url,
                    "source_url": job.source_url,
                    "document_type": doc_type if doc_type else "RECRUITMENT",
                    "verification_status": job.verification_status or "VERIFIED",
                    "published_at": job.published_at,
                    "last_date": job.last_date,
                    "vacancies": job.vacancies,
                    "detail": detail,
                }
                if not can_publish_job(payload, today=today) and not reasons:
                    reasons.append("failed publish gate")

                if reasons:
                    report["demoted"].append(
                        {
                            "id": str(job.id),
                            "slug": job.slug,
                            "title": title[:120],
                            "reasons": reasons[:6],
                        }
                    )
                    if apply:
                        await session.execute(
                            update(Job)
                            .where(Job.id == job.id)
                            .values(
                                status="draft",
                                published_to_site=False,
                                verification_status="NEEDS_REVIEW",
                                title=title or job.title,
                                document_type=doc_type if doc_type else job.document_type,
                                review_reasons=[f"watchdog:{r}" for r in reasons[:8]],
                                updated_at=datetime.now(timezone.utc),
                            )
                        )
                        report["rowsUpdated"] += 1
                else:
                    report["ok"] += 1

            if apply:
                await session.commit()
                if export:
                    from app.services.job_persist_service import JobPersistService

                    report["exportedJobs"] = await JobPersistService().export_live_jobs_json(session)

        out = _repo_root() / "scripts" / "watchdog-report.json"
        out.write_text(json.dumps(report, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
        report["reportPath"] = str(out)
        logger.info(
            "WatchdogAgent scanned=%s ok=%s demoted=%s apply=%s",
            report["scanned"],
            report["ok"],
            len(report["demoted"]),
            apply,
        )
        return report
