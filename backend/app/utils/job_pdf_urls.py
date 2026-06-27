"""Collect official notification PDF URLs from a job row or JSON dict."""

from __future__ import annotations

import re
from typing import Any
from urllib.parse import urlparse

from app.models.job import Job

PDF_PATH_RE = re.compile(
    r"\.pdf(\?|#|/|$)|/pdf/|/writereaddata/|/documents/|/attachments/|/uploads/|"
    r"notification.*\.pdf|advt.*\.pdf",
    re.I,
)
PDF_VIEWER_RE = re.compile(r"ViewPdf\.aspx|ViewFile\.aspx|viewpdf\.aspx|viewfile\.aspx|getfile\.aspx", re.I)
BLOCKED_HOST_RE = re.compile(
    r"(?:^|\.)(?:freejobalert|sarkariresult|sarkarijob|sarkarinaukri|governmentjob|"
    r"indgovtjobs|rojgarresult|jobriya|fresherslive|naukri|indeed|shine|timesjobs|"
    r"foundit|monster)\.",
    re.I,
)


def _looks_like_notification_document(url: str) -> bool:
    u = str(url or "").strip()
    if not u:
        return False
    if PDF_VIEWER_RE.search(u):
        return True
    if PDF_PATH_RE.search(u):
        return True
    if re.search(r"[?&](?:file|doc|document)=", u, re.I) and re.search(r"\.pdf", u, re.I):
        return True
    return False


def _is_blocked_aggregator_url(url: str) -> bool:
    try:
        host = (urlparse(str(url)).hostname or "").lower()
    except Exception:
        return False
    return bool(host and BLOCKED_HOST_RE.search(host))


def _push_url(candidates: list[str], value: object) -> None:
    if isinstance(value, str) and value.strip():
        candidates.append(value.strip())


def _push_url_list(candidates: list[str], value: object) -> None:
    if isinstance(value, list):
        for item in value:
            _push_url(candidates, item)


def collect_pdf_urls_from_dict(job: dict[str, Any]) -> list[str]:
    """Collect every candidate PDF/document URL attached to a job JSON row."""
    detail = job.get("detail") if isinstance(job.get("detail"), dict) else {}
    candidates: list[str] = []

    for key in ("pdf_url", "pdfUrl", "apply_url", "applyUrl"):
        _push_url(candidates, job.get(key))
    for key in ("pdf_url", "pdfUrl", "notification_url", "notificationUrl", "link"):
        _push_url(candidates, detail.get(key))

    for key in ("pdf_urls", "pdfUrls"):
        _push_url_list(candidates, job.get(key))
        _push_url_list(candidates, detail.get(key))

    for section in detail.get("content_sections") or []:
        if not isinstance(section, dict):
            continue
        for link in section.get("links") or []:
            if isinstance(link, dict):
                _push_url(candidates, link.get("url"))

    seen: set[str] = set()
    urls: list[str] = []
    for candidate in candidates:
        if candidate in seen:
            continue
        seen.add(candidate)
        if _is_blocked_aggregator_url(candidate):
            continue
        if _looks_like_notification_document(candidate):
            urls.append(candidate)
    return urls


def collect_pdf_urls(job: Job) -> list[str]:
    """Collect PDF URLs from a SQLAlchemy Job row."""
    detail = dict(job.detail or {})
    return collect_pdf_urls_from_dict(
        {
            "apply_url": job.apply_url,
            "detail": detail,
            "pdf_url": detail.get("pdf_url"),
            "pdf_urls": detail.get("pdf_urls") or detail.get("pdfUrls"),
        }
    )
