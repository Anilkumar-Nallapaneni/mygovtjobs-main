"""Score how complete a job record is before publication."""

from __future__ import annotations

from typing import Any

REQUIRED_FIELDS = (
    "title",
    "organisation",
    "official_url",
)

IMPORTANT_FIELDS = (
    "last_date",
    "qualification",
    "vacancies",
    "age_limit",
    "salary",
    "application_fee",
    "selection_process",
    "how_to_apply",
)

PUBLISH_MIN_SCORE = 70
PARTIAL_MIN_SCORE = 60


def _truthy(value: Any) -> bool:
    if value is None:
        return False
    if isinstance(value, (int, float)):
        return value > 0
    if isinstance(value, (list, dict)):
        return len(value) > 0
    text = str(value).strip().lower()
    if not text:
        return False
    if text in {"n/a", "na", "unknown", "none", "null", "0", "not specified"}:
        return False
    return True


def _job_field_map(job: dict[str, Any]) -> dict[str, Any]:
    detail = job.get("detail") if isinstance(job.get("detail"), dict) else {}
    official_url = (
        job.get("official_url")
        or job.get("apply_url")
        or job.get("source_url")
        or detail.get("notification_url")
        or detail.get("pdf_url")
        or detail.get("official_url")
    )
    return {
        "title": job.get("title"),
        "organisation": job.get("organisation") or job.get("department") or job.get("dept"),
        "official_url": official_url,
        "last_date": job.get("last_date") or job.get("deadline"),
        "qualification": job.get("qualification") or detail.get("qualification"),
        "vacancies": job.get("vacancies") or detail.get("vacancies"),
        "age_limit": job.get("age_limit") or detail.get("age_limit"),
        "salary": job.get("salary") or detail.get("salary") or detail.get("pay_scale"),
        "application_fee": job.get("application_fee") or detail.get("application_fee") or detail.get("fee"),
        "selection_process": job.get("selection_process") or detail.get("selection_process"),
        "how_to_apply": job.get("how_to_apply") or detail.get("how_to_apply"),
    }


def calculate_completeness(job: dict[str, Any]) -> tuple[int, list[str]]:
    """Return (score 0–100, missing field names)."""
    fields = _job_field_map(job)
    score = 0
    missing: list[str] = []

    for field in REQUIRED_FIELDS:
        if _truthy(fields.get(field)):
            score += 15
        else:
            missing.append(field)

    for field in IMPORTANT_FIELDS:
        if _truthy(fields.get(field)):
            score += 7
        else:
            missing.append(field)

    return min(score, 100), missing


def publication_tier(score: int) -> str:
    """publish | partial | hold"""
    if score >= PUBLISH_MIN_SCORE:
        return "publish"
    if score >= PARTIAL_MIN_SCORE:
        return "partial"
    return "hold"
