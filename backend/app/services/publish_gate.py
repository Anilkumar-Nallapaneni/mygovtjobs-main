"""Publication gate — only verified recruitments become public live jobs."""

from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any

from app.services.job_completeness_service import PUBLISH_MIN_SCORE, calculate_completeness


def _as_date(value: Any) -> date | None:
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    text = str(value).strip()[:10]
    try:
        return date.fromisoformat(text)
    except ValueError:
        return None


def can_publish_job(job: dict[str, Any], *, today: date | None = None) -> tuple[bool, list[str]]:
    """Return (ok, errors). Only RECRUITMENT + VERIFIED jobs with plausible dates may go live."""
    errors: list[str] = []
    today = today or date.today()

    if not str(job.get("title") or "").strip():
        errors.append("Missing title")

    if not str(job.get("department") or job.get("dept") or "").strip():
        errors.append("Missing organisation")

    detail = job.get("detail") if isinstance(job.get("detail"), dict) else {}
    apply_url = job.get("apply_url")
    notification_url = (
        job.get("notification_url")
        or detail.get("notification_url")
        or detail.get("pdf_url")
        or detail.get("pdfUrl")
    )
    pdf_urls = job.get("pdf_urls") or detail.get("pdf_urls") or detail.get("pdfUrls") or []
    if not notification_url and isinstance(pdf_urls, list):
        notification_url = next((u for u in pdf_urls if isinstance(u, str) and u.strip()), None)

    source_url = (
        job.get("source_url")
        or detail.get("source_url")
        or apply_url
        or notification_url
    )

    if not source_url:
        errors.append("Missing official source URL")

    if not apply_url and not notification_url:
        errors.append("Missing apply or notification link")

    published_at = _as_date(job.get("published_at") or job.get("published"))
    if published_at:
        if published_at > today + timedelta(days=1):
            errors.append("Publication date is in the future")
        if published_at < date(today.year - 2, 1, 1):
            errors.append("Publication date is implausibly old")

    deadline = _as_date(job.get("last_date") or job.get("deadline"))
    if deadline:
        if published_at and deadline < published_at:
            errors.append("Deadline occurs before publication date")
        if deadline > today + timedelta(days=365):
            errors.append("Deadline is implausibly far in the future")

    if str(job.get("document_type") or "").upper() != "RECRUITMENT":
        errors.append("Document is not classified as recruitment")

    verification = str(job.get("verification_status") or "").upper()
    if verification not in ("VERIFIED", "PARTIALLY_VERIFIED"):
        errors.append("Job has not been verified")

    completeness = job.get("completeness_score")
    if completeness is None:
        completeness, _missing = calculate_completeness(job)
    try:
        score = int(completeness)
    except (TypeError, ValueError):
        score = 0
    if score < PUBLISH_MIN_SCORE:
        errors.append(f"Completeness score {score} below {PUBLISH_MIN_SCORE}")

    return len(errors) == 0, errors


def resolve_persist_status(
    *,
    last_date: date | None,
    document_type: str,
    verification_status: str,
    normalized: dict[str, Any],
    auto_publish_verified: bool,
    today: date | None = None,
    completeness_score: int | None = None,
) -> tuple[str, str, bool, list[str]]:
    """
    Decide DB status + verification_status + published_to_site for upsert.

    When auto_publish_verified is False (production freeze default), new rows stay
    draft/pending until an admin verifies them — even if structural checks pass.

    Returns (status, verification_status, published_to_site, errors).
    """
    today = today or date.today()
    errors: list[str] = []

    if last_date and last_date < today:
        return "expired", verification_status or "UNVERIFIED", False, ["Past deadline"]

    score = completeness_score
    if score is None:
        score, _ = calculate_completeness(
            {
                **normalized,
                "document_type": document_type,
                "department": normalized.get("dept"),
                "last_date": last_date,
            }
        )

    gate_payload = {
        **normalized,
        "document_type": document_type,
        "verification_status": "VERIFIED" if auto_publish_verified else (verification_status or "NEEDS_REVIEW"),
        "department": normalized.get("dept"),
        "published_at": normalized.get("published_at"),
        "last_date": last_date,
        "completeness_score": score,
    }

    structural = {**gate_payload, "verification_status": "VERIFIED", "document_type": document_type}
    structural_ok, structural_errors = can_publish_job(structural, today=today)
    errors.extend(structural_errors)

    if not auto_publish_verified:
        vstatus = "NEEDS_REVIEW"
        if document_type != "RECRUITMENT":
            vstatus = "REJECTED" if document_type in ("TENDER", "FORM", "RECRUITMENT_RULES") else "NEEDS_REVIEW"
        return "draft", vstatus, False, errors or ["Auto-publish disabled"]

    if not structural_ok:
        return "draft", "NEEDS_REVIEW", False, errors

    ok, publish_errors = can_publish_job(
        {**gate_payload, "verification_status": "VERIFIED"},
        today=today,
    )
    if ok:
        return "live", "VERIFIED", True, []
    return "draft", "NEEDS_REVIEW", False, publish_errors
