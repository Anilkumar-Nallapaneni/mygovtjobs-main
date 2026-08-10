"""Filter live-jobs.json rows to the same gates as verify-live-jobs-snapshot --strict."""

from __future__ import annotations

import re
from datetime import date
from typing import Any

from app.services.noise_filter import clean_job_title, contains_html_markup, sanitize_source_text_fields
from app.services.publish_gate import can_publish_job, india_today

_ISO_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_PUBLIC_VERIFICATION = frozenset({"VERIFIED", "PARTIALLY_VERIFIED"})


def _has_http_source(row: dict[str, Any]) -> bool:
    detail = row.get("detail") if isinstance(row.get("detail"), dict) else {}
    candidates = (
        row.get("source_url"),
        row.get("apply_url"),
        row.get("pdf_url"),
        row.get("primary_pdf_url"),
        detail.get("source_url"),
        detail.get("notification_url"),
        detail.get("official_url"),
        detail.get("pdf_url"),
    )
    for value in candidates:
        text = str(value or "").strip()
        if text.startswith("http://") or text.startswith("https://"):
            return True
    return False


def prepare_live_snapshot_row(
    row: dict[str, Any],
    *,
    today: date | None = None,
) -> dict[str, Any] | None:
    """Return a cleaned public snapshot row, or None when it must be dropped."""
    if not isinstance(row, dict):
        return None

    today = today or india_today()
    row = sanitize_source_text_fields(dict(row))

    if row.get("published_to_site") is not True:
        return None
    if str(row.get("status") or "").lower() != "live":
        return None
    if str(row.get("document_type") or "").upper() != "RECRUITMENT":
        return None
    if str(row.get("verification_status") or "").upper() not in _PUBLIC_VERIFICATION:
        return None
    try:
        if int(row.get("completeness_score") or 0) < 70:
            return None
    except (TypeError, ValueError):
        return None
    try:
        if float(row.get("publication_confidence") or 0) < 90:
            return None
    except (TypeError, ValueError):
        return None

    title = clean_job_title(row.get("title"))
    if not title or contains_html_markup(title):
        return None
    row["title"] = title

    last_raw = str(row.get("last_date") or "").strip()[:10]
    if not _ISO_DATE_RE.match(last_raw):
        return None
    try:
        last = date.fromisoformat(last_raw)
    except ValueError:
        return None
    if last.isoformat() != last_raw or last < today:
        return None
    row["last_date"] = last_raw

    if not _has_http_source(row):
        return None

    ok, _errors = can_publish_job(row, today=today)
    if not ok:
        return None

    try:
        vacancies = int(row.get("vacancies") or 0)
    except (TypeError, ValueError):
        vacancies = 0
    row["vacancies"] = max(0, vacancies)
    row["status"] = "live"
    return row


def filter_live_snapshot_items(
    items: list[Any],
    *,
    today: date | None = None,
) -> tuple[list[dict[str, Any]], int]:
    """Keep only rows that pass strict public snapshot gates."""
    today = today or india_today()
    kept: list[dict[str, Any]] = []
    dropped = 0
    for row in items:
        prepared = prepare_live_snapshot_row(row, today=today) if isinstance(row, dict) else None
        if prepared is None:
            dropped += 1
            continue
        kept.append(prepared)
    return kept, dropped
