"""Section builders / normalizers for JobDetailAgent."""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.models.job import Job
from app.parsers.pdf_parser import extract_structured_detail_fields
from app.parsers.pdf_sections import text_to_content_sections
from app.services.job_completeness_service import PUBLISH_MIN_SCORE

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
    # Any "Full details are being verified" Overview is a stub — rebuild it.
    if _PENDING_OVERVIEW.search(body):
        return True
    # Only Verification / empty Overview also counts as incomplete.
    real = [
        s
        for s in sections
        if isinstance(s, dict)
        and str(s.get("heading") or "").strip().lower()
        not in ("verification information", "verification", "overview", "notification")
    ]
    if real:
        return False
    # Overview/Notification alone is fine when it has real body text.
    return _section_body_chars(sections) < 40


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


