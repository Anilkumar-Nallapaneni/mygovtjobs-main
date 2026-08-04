"""JobDetailAgent — build job detail UI payload from PDF or notification (source of truth)."""

from __future__ import annotations

import asyncio
import json
import logging
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import select

from app.database.retry import is_transient_db_error
from app.database.session import SessionLocal
from app.models.job import Job
from app.parsers.pdf_sections import text_to_content_sections
from app.parsers.pdf_parser import extract_structured_detail_fields
from app.services.job_child_service import sync_job_children
from app.services.job_completeness_service import PUBLISH_MIN_SCORE, calculate_completeness, publication_tier
from app.services.job_persist_service import JobPersistService
from app.services.job_pdf_enrich_service import job_to_detail_payload
from app.services.noise_filter import sanitize_json_for_postgres
from app.utils.job_details_storage import upload_job_detail_json
from app.utils.slim_detail import slim_detail_for_db

logger = logging.getLogger(__name__)

STANDARD_SECTION_ORDER = (
    "Overview",
    "Important Dates",
    "Vacancy Details",
    "Eligibility and Qualification",
    "Age Limit",
    "Salary or Pay Scale",
    "Application Fee",
    "Selection Process",
    "How to Apply",
    "Documents Required",
    "Syllabus / Exam Pattern",
    "General Instructions",
    "Reservation",
    "Contact / Helpdesk",
    "Important Links",
    "Official Source",
    "Verification Information",
)

_NOT_SPECIFIED = "Not specified in the available official notice"
_PENDING_OVERVIEW = re.compile(r"full details are being verified", re.I)


def _resolve_repo_root() -> Path:
    here = Path(__file__).resolve()
    for base in (here.parents[2], here.parents[3]):
        if (base / "frontend" / "public" / "data").is_dir():
            return base
    return here.parents[3]


def _infer_detail_source(detail: dict[str, Any]) -> str:
    if detail.get("memorized_at") or detail.get("detail_source") == "pdf":
        return "pdf"
    source = str(detail.get("source") or "").lower()
    if source in ("structured-import", "official-feed", "official-json"):
        return "notification"
    if detail.get("content_sections"):
        return "notification"
    return "listing"


def _summary_has_job_signals(summary: str) -> bool:
    text = summary.lower()
    signals = (
        "qualification",
        "vacancy",
        "last date",
        "age limit",
        "salary",
        "application fee",
        "selection process",
        "how to apply",
    )
    return sum(signal in text for signal in signals) >= 3


def _sections_from_summary(summary: str, *, pdf_url: str | None = None) -> list[dict[str, Any]]:
    text = str(summary or "").strip()
    if len(text) < 200:
        return []
    # Prefer heading-split sections when the notice has clear markers.
    if _summary_has_job_signals(text) or len(text) >= 600:
        sections = text_to_content_sections(text, pdf_url=pdf_url)
        if sections and (
            len(sections) > 1
            or any(len(str(p)) >= 80 for s in sections for p in (s.get("paragraphs") or []))
        ):
            return sections
    # Always keep the full PDF/notification body visible — never drop it.
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n+", text) if len(p.strip()) >= 40]
    if not paragraphs:
        paragraphs = [text[:12_000]]
    return [
        {
            "heading": "Notification",
            "paragraphs": paragraphs[:40],
            "tables": [],
            "lists": [],
            "links": [{"label": "Download Official Notification PDF", "url": pdf_url}] if pdf_url else [],
        }
    ]


def _section_body_chars(sections: list[dict[str, Any]]) -> int:
    total = 0
    for section in sections:
        if not isinstance(section, dict):
            continue
        if _PENDING_OVERVIEW.search(" ".join(str(p) for p in (section.get("paragraphs") or []))):
            continue
        for para in section.get("paragraphs") or []:
            total += len(str(para or ""))
        for group in section.get("lists") or []:
            if isinstance(group, list):
                total += sum(len(str(item or "")) for item in group)
        for table in section.get("tables") or []:
            if isinstance(table, list):
                total += 40 * len(table)
    return total


def _is_placeholder_sections(sections: list[dict[str, Any]]) -> bool:
    if not sections:
        return True
    body = " ".join(
        str(p)
        for s in sections
        if isinstance(s, dict)
        for p in (s.get("paragraphs") or [])
    )
    return bool(_PENDING_OVERVIEW.search(body)) and _section_body_chars(sections) < 200


def _pending_verification_sections(summary: str = "") -> list[dict[str, Any]]:
    text = str(summary or "").strip()
    if len(text) >= 200:
        return _sections_from_summary(text)
    return [
        {
            "heading": "Overview",
            "paragraphs": [
                "Full details are being verified.",
                "Please read the official notification.",
            ],
            "tables": [],
            "lists": [],
            "links": [],
        },
        {
            "heading": "Verification Information",
            "paragraphs": [
                "Verification status: Partial",
                "Some details are not available in the source document.",
            ],
            "tables": [],
            "lists": [],
            "links": [],
        },
    ]


def _normalize_section_heading(heading: str) -> str:
    h = (heading or "").strip().lower()
    mapping = {
        "overview": "Overview",
        "introduction": "Overview",
        "notification": "Overview",
        "important dates": "Important Dates",
        "dates": "Important Dates",
        "vacancy": "Vacancy Details",
        "vacancy details": "Vacancy Details",
        "vacancies": "Vacancy Details",
        "post details": "Vacancy Details",
        "eligibility": "Eligibility and Qualification",
        "qualification": "Eligibility and Qualification",
        "educational qualification": "Eligibility and Qualification",
        "essential qualification": "Eligibility and Qualification",
        "eligibility and qualification": "Eligibility and Qualification",
        "eligibility criteria": "Eligibility and Qualification",
        "age limit": "Age Limit",
        "age": "Age Limit",
        "salary": "Salary or Pay Scale",
        "pay scale": "Salary or Pay Scale",
        "salary or pay scale": "Salary or Pay Scale",
        "emoluments": "Salary or Pay Scale",
        "stipend": "Salary or Pay Scale",
        "application fee": "Application Fee",
        "exam fee": "Application Fee",
        "examination fee": "Application Fee",
        "registration fee": "Application Fee",
        "fee": "Application Fee",
        "fee details": "Application Fee",
        "selection": "Selection Process",
        "selection process": "Selection Process",
        "mode of selection": "Selection Process",
        "how to apply": "How to Apply",
        "application procedure": "How to Apply",
        "apply online": "How to Apply",
        "apply": "How to Apply",
        "documents required": "Documents Required",
        "documents to be produced": "Documents Required",
        "syllabus": "Syllabus / Exam Pattern",
        "exam pattern": "Syllabus / Exam Pattern",
        "examination pattern": "Syllabus / Exam Pattern",
        "scheme of examination": "Syllabus / Exam Pattern",
        "general instructions": "General Instructions",
        "instructions to candidates": "General Instructions",
        "reservation": "Reservation",
        "contact details": "Contact / Helpdesk",
        "helpdesk": "Contact / Helpdesk",
        "helpline": "Contact / Helpdesk",
        "important links": "Important Links",
        "links": "Important Links",
        "official source": "Official Source",
        "source": "Official Source",
        "verification": "Verification Information",
        "verification information": "Verification Information",
    }
    return mapping.get(h, heading.strip() or "Overview")


def _attach_extracted_fields(detail: dict[str, Any]) -> None:
    """Fill fee / selection / how-to-apply from content_sections when missing."""
    sections = [s for s in (detail.get("content_sections") or []) if isinstance(s, dict)]
    extracted = extract_structured_detail_fields(sections)
    for key, value in extracted.items():
        existing = detail.get(key)
        if not existing:
            detail[key] = value
            continue
        if key == "fee" and isinstance(value, dict) and isinstance(existing, dict):
            merged = {**existing, **value}
            detail[key] = merged
        elif key in ("selection_process", "how_to_apply", "documents_required") and isinstance(value, list):
            if isinstance(existing, list) and len(existing) >= len(value):
                continue
            detail[key] = value


def _normalize_sections(sections: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_heading: dict[str, dict[str, Any]] = {}
    for section in sections:
        if not isinstance(section, dict):
            continue
        heading = _normalize_section_heading(str(section.get("heading") or "Overview"))
        existing = by_heading.get(heading)
        if not existing:
            by_heading[heading] = {
                "heading": heading,
                "paragraphs": list(section.get("paragraphs") or []),
                "tables": list(section.get("tables") or []),
                "lists": list(section.get("lists") or []),
                "links": list(section.get("links") or []),
            }
            continue
        existing["paragraphs"].extend(section.get("paragraphs") or [])
        existing["tables"].extend(section.get("tables") or [])
        existing["lists"].extend(section.get("lists") or [])
        existing["links"].extend(section.get("links") or [])

    ordered: list[dict[str, Any]] = []
    for name in STANDARD_SECTION_ORDER:
        if name in by_heading:
            ordered.append(by_heading.pop(name))
    ordered.extend(by_heading.values())
    return ordered


def _load_existing_static_detail(detail_dir: Path, slug: str | None) -> dict[str, Any] | None:
    if not slug:
        return None
    path = detail_dir / f"{slug}.json"
    if not path.is_file():
        return None
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None
    detail = payload.get("detail") if isinstance(payload, dict) else None
    return detail if isinstance(detail, dict) else None


def _attach_verification_section(detail: dict[str, Any], job: Job, score: int, missing: list[str]) -> None:
    source_type = "Official recruitment notification PDF" if detail.get("detail_source") == "pdf" else "Official notice"
    status = str(getattr(job, "verification_status", None) or "UNVERIFIED")
    paragraphs = [
        f"Source type: {source_type}",
        f"Source organisation: {job.dept or _NOT_SPECIFIED}",
        f"Last verified: {detail.get('detail_updated_at') or datetime.now(timezone.utc).isoformat()}",
        f"Verification status: {status}",
        f"Completeness score: {score}/100",
    ]
    if missing:
        paragraphs.append(f"Pending fields: {', '.join(missing[:8])}")
    if score < PUBLISH_MIN_SCORE:
        paragraphs.append("Some details are not available in the source document.")

    sections = list(detail.get("content_sections") or [])
    sections = [s for s in sections if str(s.get("heading") or "") != "Verification Information"]
    sections.append(
        {
            "heading": "Verification Information",
            "paragraphs": paragraphs,
            "tables": [],
            "lists": [],
            "links": [],
        }
    )
    detail["content_sections"] = _normalize_sections(sections)


class JobDetailAgent:
    """
    Agent 3 — after live ingest + PDF read, publish job detail for the portal UI.

    Priority: PDF memorized > official notification > live listing scrape.
    """

    def __init__(self, *, repo_root: Path | None = None):
        self.persist = JobPersistService()
        root = repo_root or _resolve_repo_root()
        self.detail_dir = root / "frontend" / "public" / "data" / "job-details"

    async def run(
        self,
        *,
        limit: int = 0,
        live_only: bool = True,
        only_missing_sections: bool = False,
        concurrency: int = 4,
        upload_storage: bool = True,
        export_live_json: bool = True,
        write_static: bool = True,
    ) -> dict[str, Any]:
        statuses = ("live",) if live_only else ("live", "expired", "draft", "pending")
        sem = asyncio.Semaphore(max(1, concurrency))
        stats: dict[str, Any] = {
            "scanned": 0,
            "updated": 0,
            "skipped": 0,
            "held": 0,
            "failed": 0,
            "by_source": {"pdf": 0, "notification": 0, "listing": 0},
        }

        async with SessionLocal() as session:
            rows = (
                await session.execute(
                    select(Job).where(Job.status.in_(statuses)).order_by(Job.published_at.desc())
                )
            ).scalars().all()

            candidates: list[Job] = []
            for job in rows:
                detail = job.detail or {}
                has_summary = len(str(detail.get("summary") or "").strip()) >= 40
                has_sections = bool(detail.get("content_sections"))
                if only_missing_sections and has_sections:
                    stats["skipped"] += 1
                    continue
                if not has_summary and not has_sections:
                    stats["skipped"] += 1
                    continue
                candidates.append(job)

            cap = limit if limit > 0 else len(candidates)
            batch = candidates[:cap]
            total = len(batch)
            print(
                f"JobDetailAgent: {total} job(s) to publish "
                f"({stats['skipped']} skipped — no PDF/notification text)",
                flush=True,
            )
            job_ids = [str(j.id) for j in batch]

        async def process_one(i: int, job_id: str) -> None:
            async with sem:
                title = job_id[:8]
                max_attempts = 3
                counted_scan = False
                for attempt in range(1, max_attempts + 1):
                    try:
                        async with SessionLocal() as inner:
                            job = await inner.get(Job, job_id)
                            if not job:
                                return
                            if not counted_scan:
                                stats["scanned"] += 1
                                counted_scan = True
                            title = (job.title or "untitled")[:56]
                            detail = dict(job.detail or {})
                            summary = str(detail.get("summary") or "").strip()
                            pdf_url = detail.get("pdf_url") or getattr(job, "primary_pdf_url", None)
                            sections = list(detail.get("content_sections") or [])

                            # Prefer previously published rich sections (Storage/static) over slim DB.
                            existing = _load_existing_static_detail(self.detail_dir, job.slug)
                            if existing:
                                existing_sections = [
                                    s for s in (existing.get("content_sections") or []) if isinstance(s, dict)
                                ]
                                if _section_body_chars(existing_sections) > _section_body_chars(sections):
                                    sections = existing_sections
                                    detail["content_sections"] = sections
                                existing_summary = str(existing.get("summary") or "").strip()
                                if len(existing_summary) > len(summary):
                                    summary = existing_summary
                                    detail["summary"] = summary
                                for key in (
                                    "fee",
                                    "application_fee",
                                    "selection_process",
                                    "how_to_apply",
                                    "documents_required",
                                    "memorized_at",
                                    "detail_source",
                                ):
                                    if existing.get(key) and not detail.get(key):
                                        detail[key] = existing[key]

                            if _is_placeholder_sections(sections):
                                sections = []

                            if not sections and len(summary) >= 200:
                                built = _sections_from_summary(
                                    summary, pdf_url=str(pdf_url) if pdf_url else None
                                )
                                if built:
                                    detail["content_sections"] = built
                                    sections = built

                            if not sections:
                                detail["content_sections"] = _pending_verification_sections(summary)
                                sections = detail["content_sections"]
                                detail["details_pending_verification"] = True

                            detail["content_sections"] = _normalize_sections(sections)
                            sections = detail["content_sections"]
                            _attach_extracted_fields(detail)

                            source = _infer_detail_source(detail)
                            detail["detail_source"] = source
                            detail["detail_updated_at"] = datetime.now(timezone.utc).isoformat()
                            if source == "pdf" and not detail.get("memorized_at"):
                                detail["memorized_at"] = detail["detail_updated_at"]

                            score, missing = calculate_completeness(
                                {
                                    "title": job.title,
                                    "dept": job.dept,
                                    "apply_url": job.apply_url,
                                    "source_url": job.source_url,
                                    "last_date": job.last_date,
                                    "vacancies": job.vacancies,
                                    "qualification": job.qualification,
                                    "salary": job.salary,
                                    "age_limit": job.age_limit,
                                    "detail": detail,
                                }
                            )
                            job.completeness_score = score
                            detail["completeness_score"] = score
                            detail["missing_fields"] = missing
                            tier = publication_tier(score)
                            _attach_verification_section(detail, job, score, missing)

                            if tier == "hold":
                                if not bool(getattr(job, "published_to_site", False)):
                                    job.published_to_site = False
                                    if job.status == "live":
                                        job.status = "draft"
                                    job.verification_status = "NEEDS_REVIEW"
                                    stats["held"] += 1
                                else:
                                    # Already on the site — flag partial instead of unpublishing.
                                    detail["details_pending_verification"] = True
                                    if job.verification_status == "VERIFIED":
                                        job.verification_status = "PARTIALLY_VERIFIED"
                            elif tier == "partial":
                                detail["details_pending_verification"] = True
                                if job.verification_status == "VERIFIED":
                                    job.verification_status = "PARTIALLY_VERIFIED"

                            job.detail = sanitize_json_for_postgres(detail)
                            await sync_job_children(inner, job)

                            if upload_storage and job.slug and sections:
                                upload_job_detail_json(
                                    str(job.slug), job_to_detail_payload(job, detail)
                                )

                            if write_static and job.slug and tier != "hold":
                                self._write_static(job, detail)

                            job.detail = sanitize_json_for_postgres(
                                slim_detail_for_db(detail, status=str(job.status or "live"))
                                | {
                                    "detail_source": source,
                                    "memorized_at": detail.get("memorized_at"),
                                    "detail_updated_at": detail["detail_updated_at"],
                                    "completeness_score": score,
                                    "details_pending_verification": detail.get("details_pending_verification"),
                                }
                            )
                            await inner.commit()

                            stats["updated"] += 1
                            stats["by_source"][source] = stats["by_source"].get(source, 0) + 1
                            print(
                                f"[{i}/{total}] detail={source} {title} "
                                f"({len(sections)} sections, score={score}, tier={tier})",
                                flush=True,
                            )
                            return
                    except Exception as exc:
                        if is_transient_db_error(exc) and attempt < max_attempts:
                            logger.warning(
                                "[%s/%s] transient DB error for %s (attempt %s/%s): %s",
                                i,
                                total,
                                title,
                                attempt,
                                max_attempts,
                                exc,
                            )
                            await asyncio.sleep(0.5 * attempt)
                            continue
                        stats["failed"] += 1
                        logger.exception("[%s/%s] detail failed for %s: %s", i, total, title, exc)
                        return

        await asyncio.gather(*(process_one(i, jid) for i, jid in enumerate(job_ids, 1)))

        if export_live_json and stats["updated"]:
            async with SessionLocal() as session:
                try:
                    await self.persist.export_live_jobs_json(session)
                except Exception as exc:
                    logger.warning("live-jobs.json export failed: %s", exc)

        return stats

    def _write_static(self, job: Job, detail: dict[str, Any]) -> None:
        self.detail_dir.mkdir(parents=True, exist_ok=True)
        path = self.detail_dir / f"{job.slug}.json"
        path.write_text(
            json.dumps(job_to_detail_payload(job, detail), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
