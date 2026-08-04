"""Slim jobs.detail JSONB — drop PDF sections from Postgres; full detail lives in Storage."""

from __future__ import annotations

from typing import Any

from app.utils.sanitize_detail import sanitize_job_detail

# Keys kept in Postgres after compression (list cards + detail fallback metadata).
_DB_SLIM_KEYS = frozenset(
    {
        "source",
        "summary",
        "pdf_url",
        "pdf_urls",
        "pdfUrl",
        "pdfUrls",
        "notification_url",
        "external_id",
        "post_name",
        "published",
        "apply_url",
        "official_url",
        "source_url",
        "link",
        "dates",
        "fee",
        "application_fee",
        "selection",
        "selection_process",
        "howApply",
        "how_to_apply",
        "documents_required",
        "posts",
        "important_dates",
        "apply_urls",
        "memorized_at",
        "detail_source",
        "detail_updated_at",
        "streetAddress",
        "street_address",
        "postalCode",
        "postal_code",
        "pincode",
        "completeness_score",
        "missing_fields",
    }
)

# Keep enough of the PDF body that JobDetailAgent can rebuild sections without Storage.
SUMMARY_MAX_LIVE = 12_000
SUMMARY_MAX_EXPIRED = 800
SUMMARY_MAX_LIST = 400


def slim_detail_for_db(
    detail: dict[str, Any] | None,
    *,
    status: str = "live",
) -> dict[str, Any]:
    """Remove content_sections and other heavy blobs from jobs.detail."""
    if not detail:
        return {}
    cleaned = sanitize_job_detail(dict(detail))
    slim: dict[str, Any] = {}
    for key in _DB_SLIM_KEYS:
        val = cleaned.get(key)
        if val is None or val == "" or val == [] or val == {}:
            continue
        slim[key] = val

    summary = slim.get("summary")
    cap = SUMMARY_MAX_EXPIRED if str(status).lower() == "expired" else SUMMARY_MAX_LIVE
    if isinstance(summary, str) and len(summary) > cap:
        slim["summary"] = f"{summary[:cap].rstrip()}…"

    for key in ("pdf_urls", "pdfUrls"):
        vals = slim.get(key)
        if isinstance(vals, list) and len(vals) > 6:
            slim[key] = vals[:6]

    return slim


def detail_json_bytes(detail: dict[str, Any] | None) -> int:
    if not detail:
        return 2
    import json

    return len(json.dumps(detail, ensure_ascii=False, separators=(",", ":")).encode("utf-8"))
