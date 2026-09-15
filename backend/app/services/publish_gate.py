"""Publication gate — only verified recruitments become public live jobs."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from typing import Any
from urllib.parse import urlparse
from zoneinfo import ZoneInfo

from app.services.job_completeness_service import PUBLISH_MIN_SCORE, calculate_completeness
from app.services.noise_filter import (
    contains_html_markup,
    is_junk_job_title,
    is_tender_or_procurement,
)
from app.utils.official_hosts import is_official_recruitment_host, looks_like_notification_document
from app.utils.state_resolve import normalize_state_codes

INDIA_TZ = ZoneInfo("Asia/Kolkata")
AUTO_PUBLISH_MIN_CONFIDENCE = 90.0
PUBLIC_VERIFICATION_STATUSES = ("VERIFIED", "PARTIALLY_VERIFIED")


@dataclass(frozen=True)
class ValidationResult:
    valid: bool
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    confidence: float = 0.0


def india_today() -> date:
    return datetime.now(INDIA_TZ).date()


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


def calculate_job_status(
    closing_date: Any,
    explicitly_closed: bool = False,
    *,
    today: date | None = None,
) -> str:
    """Return active, expired, or needs_review using the India calendar date."""
    if explicitly_closed:
        return "expired"
    parsed = _as_date(closing_date)
    if parsed is None:
        return "needs_review"
    if parsed < (today or india_today()):
        return "expired"
    return "active"


_TYPO_TLDS = frozenset({"ln", "con", "comm", "ogr", "edus", "govv"})
_ILLEGAL_URL_CHARS = re.compile(r'[\^<>"`{|}\\]')
_WHITESPACE = re.compile(r"\s")


def is_corrupt_url(value: Any) -> bool:
    """True for typo TLDs (.ln, .con), illegal path chars, or unparseable URLs."""
    raw = str(value or "").strip()
    if not raw:
        return True
    if _ILLEGAL_URL_CHARS.search(raw) or _WHITESPACE.search(raw):
        return True
    try:
        parsed = urlparse(raw)
    except Exception:
        return True
    if parsed.scheme not in ("http", "https"):
        return True
    host = (parsed.hostname or "").lower()
    if not host or host.startswith(".") or host.endswith(".") or ".." in host:
        return True
    tld = host.rsplit(".", 1)[-1]
    if tld in _TYPO_TLDS:
        return True
    if parsed.path and _ILLEGAL_URL_CHARS.search(parsed.path):
        return True
    return False


def _valid_http_url(value: Any) -> bool:
    raw = str(value or "").strip()
    if not raw or is_corrupt_url(raw):
        return False
    try:
        parsed = urlparse(raw)
        return parsed.scheme in ("http", "https") and bool(parsed.hostname)
    except Exception:
        return False


def _detail(job: dict[str, Any]) -> dict[str, Any]:
    return job.get("detail") if isinstance(job.get("detail"), dict) else {}


def _publication_urls(job: dict[str, Any]) -> tuple[str | None, str | None, str | None]:
    detail = _detail(job)
    apply_url = str(job.get("apply_url") or detail.get("apply_url") or "").strip() or None
    notification_url = str(
        job.get("notification_url")
        or detail.get("notification_url")
        or detail.get("pdf_url")
        or detail.get("pdfUrl")
        or ""
    ).strip() or None
    if not notification_url:
        pdf_urls = job.get("pdf_urls") or detail.get("pdf_urls") or detail.get("pdfUrls") or []
        if isinstance(pdf_urls, list):
            notification_url = next(
                (str(url).strip() for url in pdf_urls if _valid_http_url(url)),
                None,
            )
    source_url = str(
        job.get("source_url")
        or detail.get("source_url")
        or notification_url
        or apply_url
        or ""
    ).strip() or None
    return source_url, notification_url, apply_url


def _official_notification_pdf(job: dict[str, Any]) -> str | None:
    """Return the first official PDF/document URL suitable for public publish."""
    detail = _detail(job)
    candidates: list[str] = []
    for value in (
        job.get("primary_pdf_url"),
        detail.get("primary_pdf_url"),
        job.get("pdf_url"),
        detail.get("pdf_url"),
        detail.get("pdfUrl"),
        job.get("notification_url"),
        detail.get("notification_url"),
        job.get("apply_url"),
        detail.get("apply_url"),
    ):
        if isinstance(value, str) and value.strip():
            candidates.append(value.strip())
    for key in ("pdf_urls", "pdfUrls"):
        raw = job.get(key) or detail.get(key) or []
        if isinstance(raw, list):
            for item in raw:
                if isinstance(item, str) and item.strip():
                    candidates.append(item.strip())

    for url in candidates:
        if (
            _valid_http_url(url)
            and is_official_recruitment_host(url)
            and looks_like_notification_document(url)
        ):
            return url
    return None


def validate_job_for_publication(
    job: dict[str, Any],
    *,
    today: date | None = None,
) -> ValidationResult:
    """Validate the final public record and calculate a deterministic confidence score."""
    errors: list[str] = []
    warnings: list[str] = []
    score = 0.0
    today = today or india_today()

    title = str(job.get("title") or "").strip()
    if not title:
        errors.append("Missing title")
    elif contains_html_markup(title):
        errors.append("Title contains HTML markup")
    else:
        score += 10

    organisation = str(job.get("department") or job.get("dept") or job.get("organization") or "").strip()
    if not organisation:
        errors.append("Missing organisation")
    elif contains_html_markup(organisation):
        errors.append("Organisation contains HTML markup")
    else:
        score += 10

    source_url, notification_url, apply_url = _publication_urls(job)
    if not source_url or not _valid_http_url(source_url):
        errors.append("Missing or invalid official source URL")
    elif not is_official_recruitment_host(source_url):
        errors.append("Source domain is not approved")
    else:
        score += 20

    pdf_url = _official_notification_pdf(job)
    if pdf_url:
        score += 10
    else:
        # HTML listing pages are not enough — public jobs need an official PDF/document.
        errors.append("Missing official notification PDF")

    if notification_url and notification_url != pdf_url:
        if _valid_http_url(notification_url) and is_official_recruitment_host(notification_url):
            warnings.append("Separate HTML notification URL present")
        else:
            warnings.append("Notification URL is invalid or unofficial")

    if apply_url:
        if is_corrupt_url(apply_url):
            errors.append("Apply URL is corrupt or malformed")
        elif _valid_http_url(apply_url) and is_official_recruitment_host(apply_url):
            score += 10
        else:
            errors.append("Apply URL is invalid or unofficial")
    else:
        warnings.append("Missing apply URL")

    deadline = _as_date(job.get("last_date") or job.get("deadline") or job.get("closing_date"))
    calculated_status = calculate_job_status(
        deadline,
        bool(job.get("explicitly_closed")),
        today=today,
    )
    if calculated_status == "needs_review":
        errors.append("Missing or malformed deadline")
    elif calculated_status == "expired":
        errors.append("Past deadline")
    else:
        score += 15

    published_at = _as_date(job.get("published_at") or job.get("published"))
    if published_at:
        if published_at > today + timedelta(days=1):
            errors.append("Publication date is in the future")
        if published_at < date(today.year - 2, 1, 1):
            errors.append("Publication date is implausibly old")
        if deadline and deadline < published_at:
            errors.append("Deadline occurs before publication date")
    if deadline and deadline > today + timedelta(days=365):
        errors.append("Deadline is implausibly far in the future")

    document_type = str(job.get("document_type") or "").upper()
    if document_type != "RECRUITMENT":
        errors.append("Document is not classified as recruitment")

    if is_tender_or_procurement(title, source_url or apply_url):
        errors.append("Tender or procurement notice")
    elif is_junk_job_title(title, source_url or apply_url):
        errors.append("Unrelated or low-quality notice")
    else:
        score += 5

    verification = str(job.get("verification_status") or "").upper()
    if verification not in ("VERIFIED", "PARTIALLY_VERIFIED"):
        errors.append("Job has not been verified")

    completeness = job.get("completeness_score")
    if completeness is None:
        completeness, _missing = calculate_completeness(job)
    try:
        completeness_score = int(completeness)
    except (TypeError, ValueError):
        completeness_score = 0
    if completeness_score < PUBLISH_MIN_SCORE:
        errors.append(f"Completeness score {completeness_score} below {PUBLISH_MIN_SCORE}")

    if job.get("is_duplicate") is True:
        errors.append("Duplicate record")
    else:
        score += 5

    state_codes = normalize_state_codes(job.get("state_codes"))
    detail = _detail(job)
    source_hint = str(job.get("source") or detail.get("source") or "").strip().lower()
    source_state = str(
        job.get("source_state_code") or detail.get("source_state_code") or ""
    ).strip().lower()
    if not source_state and source_hint.startswith("psc-") and len(source_hint) > 4:
        source_state = source_hint[4:].split("-", 1)[0][:8]
    state_label = str(job.get("state") or job.get("location") or "").strip().lower()
    is_state_scoped = bool(source_state) or (
        bool(state_label)
        and state_label not in ("", "india", "all", "all india", "central", "nationwide")
    )

    if is_state_scoped and not state_codes:
        errors.append("State-scoped recruitment requires state_codes")
    elif state_codes or state_label:
        score += 5
    else:
        warnings.append("Location or state is not classified")

    qualification = str(job.get("qualification") or "").strip()
    if qualification:
        score += 5
    else:
        warnings.append("Qualification is not specified")

    vacancies = job.get("vacancies")
    try:
        vacancy_count = int(vacancies) if vacancies not in (None, "") else None
    except (TypeError, ValueError):
        vacancy_count = None
        errors.append("Invalid vacancy count")
    if vacancy_count is not None and vacancy_count > 0:
        score += 5
    else:
        warnings.append("Vacancy count is not specified")

    return ValidationResult(
        valid=not errors,
        errors=errors,
        warnings=warnings,
        confidence=min(score, 100.0),
    )


def can_publish_job(job: dict[str, Any], *, today: date | None = None) -> tuple[bool, list[str]]:
    """Compatibility wrapper for callers that only need publish/no-publish."""
    result = validate_job_for_publication(job, today=today)
    if result.valid and result.confidence < AUTO_PUBLISH_MIN_CONFIDENCE:
        return False, [
            f"Publication confidence {result.confidence:.0f} below {AUTO_PUBLISH_MIN_CONFIDENCE:.0f}"
        ]
    return result.valid, result.errors


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
    today = today or india_today()
    errors: list[str] = []

    calculated_status = calculate_job_status(last_date, today=today)
    if calculated_status == "expired":
        return "expired", verification_status or "UNVERIFIED", False, ["Past deadline"]
    if calculated_status == "needs_review":
        return "draft", "NEEDS_REVIEW", False, ["Missing or malformed deadline"]

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
