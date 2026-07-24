"""Trim job rows for static live-jobs.json — list/card fields only; full detail via API/Supabase."""

from __future__ import annotations

from typing import Any

from app.schemas.job import JobOut
from app.utils.slim_detail import SUMMARY_MAX_LIST, slim_detail_for_db

LIST_JOB_KEYS = (
    "id",
    "slug",
    "title",
    "dept",
    "category",
    "state_codes",
    "vacancies",
    "qualification",
    "salary",
    "age_limit",
    "last_date",
    "apply_url",
    "pdf_url",
    "status",
    "published_at",
    "updated_at",
    "post_name",
    "document_type",
    "verification_status",
    "completeness_score",
    "published_to_site",
    "primary_pdf_url",
)

LIST_DETAIL_KEYS = (
    "source",
    "pdf_urls",
    "apply_url",
    "official_url",
    "notification_url",
    "link",
    "source_url",
    "post_name",
    "posts",
    "streetAddress",
    "street_address",
    "postalCode",
    "postal_code",
    "pincode",
)


def slim_job_for_json_export(job: JobOut) -> dict[str, Any]:
    """Drop heavy detail blobs (content_sections) from the static snapshot."""
    data = job.model_dump(mode="json")
    detail = data.get("detail")
    if isinstance(detail, dict):
        slim = slim_detail_for_db(detail, status=str(job.status or "live"))
        summary = slim.get("summary")
        if isinstance(summary, str) and len(summary) > SUMMARY_MAX_LIST:
            slim["summary"] = f"{summary[:SUMMARY_MAX_LIST]}…"
        data["detail"] = slim
    return data


def slim_job_for_list_json_export(job: JobOut) -> dict[str, Any]:
    """Ultra-slim row for live-jobs-list.json — card/list fields only (~80% smaller)."""
    data = slim_job_for_json_export(job)
    out: dict[str, Any] = {}
    for key in LIST_JOB_KEYS:
        if key in data and data[key] is not None:
            out[key] = data[key]

    detail = data.get("detail")
    if not isinstance(detail, dict):
        return out

    slim_d: dict[str, Any] = {}
    for key in LIST_DETAIL_KEYS:
        if key in detail and detail[key] is not None:
            slim_d[key] = detail[key]

    # Prefer snake_case pdf_urls; accept camelCase as fallback only (no duplicate keys).
    if "pdf_urls" not in slim_d:
        camel = detail.get("pdfUrls")
        if isinstance(camel, list) and camel:
            slim_d["pdf_urls"] = camel

    pdfs = slim_d.get("pdf_urls")
    if isinstance(pdfs, list) and len(pdfs) > 2:
        slim_d["pdf_urls"] = pdfs[:2]

    posts = slim_d.get("posts")
    if isinstance(posts, list) and len(posts) > 3:
        slim_d["posts"] = posts[:3]

    if slim_d:
        out["detail"] = slim_d
    return out
