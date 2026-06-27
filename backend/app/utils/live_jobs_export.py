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
)

LIST_DETAIL_KEYS = (
    "source",
    "summary",
    "pdf_urls",
    "pdfUrls",
    "published",
    "apply_url",
    "official_url",
    "notification_url",
    "link",
    "source_url",
    "post_name",
    "posts",
)

SUMMARY_MAX_LIST_JSON = 120


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

    summary = slim_d.get("summary")
    if isinstance(summary, str) and len(summary) > SUMMARY_MAX_LIST_JSON:
        slim_d["summary"] = f"{summary[:SUMMARY_MAX_LIST_JSON]}…"

    for pdf_key in ("pdf_urls", "pdfUrls"):
        pdfs = slim_d.get(pdf_key)
        if isinstance(pdfs, list) and len(pdfs) > 2:
            slim_d[pdf_key] = pdfs[:2]

    posts = slim_d.get("posts")
    if isinstance(posts, list) and len(posts) > 3:
        slim_d["posts"] = posts[:3]

    if slim_d:
        out["detail"] = slim_d
    return out
