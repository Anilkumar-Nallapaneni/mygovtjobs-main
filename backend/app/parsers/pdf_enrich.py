"""Fetch and merge structured fields from official notification PDFs."""

from __future__ import annotations

import logging
from typing import Any

from app.parsers.pdf_parser import parse_pdf_url
from app.utils.official_hosts import looks_like_notification_document

logger = logging.getLogger(__name__)

_MAX_PDFS = 6


def _merge_into(target: dict[str, Any], fields: dict[str, Any]) -> None:
    if fields.get("summary"):
        prev = (target.get("summary") or "").strip()
        chunk = str(fields["summary"]).strip()
        if chunk and chunk not in prev:
            target["summary"] = f"{prev}\n{chunk}".strip()[:12_000]

    for key in ("last_date", "published_date", "qualification", "salary", "age_limit"):
        if fields.get(key) and not target.get(key):
            target[key] = fields[key]

    for key in ("application_fee", "how_to_apply", "selection_process", "fee"):
        if fields.get(key) and not target.get(key):
            target[key] = fields[key]

    if fields.get("vacancies"):
        cur = int(target.get("vacancies") or 0)
        nxt = int(fields["vacancies"])
        target["vacancies"] = max(cur, nxt)

    for u in fields.get("apply_urls") or []:
        urls = target.setdefault("apply_urls", [])
        if u and u not in urls:
            urls.append(u)

    if fields.get("content_sections"):
        existing = target.get("content_sections") or []
        if not existing:
            target["content_sections"] = fields["content_sections"]
        else:
            seen = {str(s.get("heading", "")).lower() for s in existing if isinstance(s, dict)}
            for section in fields["content_sections"]:
                if not isinstance(section, dict):
                    continue
                key = str(section.get("heading", "")).lower()
                if key and key not in seen:
                    existing.append(section)
                    seen.add(key)
            target["content_sections"] = existing


async def merge_pdf_fields(pdf_urls: list[str] | None) -> dict[str, Any]:
    """Parse up to six PDFs and merge vacancies, dates, qualification, summary."""
    merged: dict[str, Any] = {}
    seen: set[str] = set()

    for url in pdf_urls or []:
        if len(seen) >= _MAX_PDFS:
            break
        if not url or url in seen:
            continue
        if not looks_like_notification_document(url):
            continue
        seen.add(url)
        try:
            fields = await parse_pdf_url(url)
        except Exception as exc:
            logger.warning("PDF enrich failed for %s: %s", url[:120], exc)
            continue
        if not fields or (len(fields) <= 1 and fields.get("pdf_url")):
            logger.info("PDF enrich empty for %s", url[:120])
        _merge_into(merged, fields)

    return merged
