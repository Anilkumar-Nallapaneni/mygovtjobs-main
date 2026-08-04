"""SSC.gov.in notice-boards JSON API scraper (Angular SPA has no HTML anchors)."""

from __future__ import annotations

import logging
import re
from typing import Any
from urllib.parse import quote

import httpx

from app.scrapers.base import BaseScraper
from app.scrapers.date_utils import parse_published, within_lookback
from app.services.document_classifier import classify_document
from app.services.noise_filter import clean_job_title, is_junk_job_title

logger = logging.getLogger(__name__)

SSC_API = "https://ssc.gov.in/api/general-website/portal/notice-boards"
SSC_ATTACHMENT = "https://ssc.gov.in/api/attachment/"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)

_KEEP = re.compile(
    r"\bnotice of\b|\badvertisement\b|inviting\s+application|online\s+application|"
    r"re-?opening of window|vacancies of|recruitment of",
    re.I,
)
_DROP = re.compile(
    r"\bresult\b|\bmarks\b|answer\s*key|admit\s*card|cutoff|cut-?off|"
    r"shortlist|document verification|\bidentity verification\b|\buploading\b|"
    r"declaration of|final answer|tier-?[i1v]+\s+marks|frta\b|pe and mt|"
    r"schedule of examinations|postponement of physical",
    re.I,
)


def _attachment_url(path: str | None) -> str | None:
    if not path:
        return None
    cleaned = str(path).replace("\\", "/").lstrip("/")
    return f"{SSC_ATTACHMENT}{cleaned}"


def _is_recruitment_headline(title: str) -> bool:
    t = title or ""
    if not t or is_junk_job_title(t):
        return False
    if _DROP.search(t) and not re.search(r"\bnotice of\b|\badvertisement\b", t, re.I):
        return False
    if _KEEP.search(t):
        return True
    classification = classify_document(t, "", url="")
    return classification.content_type in ("RECRUITMENT", "POSSIBLE_RECRUITMENT")


class SscApiScraper(BaseScraper):
    def __init__(
        self,
        *,
        max_items: int = 50,
        lookback_days: int = 120,
        content_type: str = "notice-boards",
    ):
        self.max_items = max_items
        # SSC open-exam notices often sit longer than default 60d lookback.
        self.lookback_days = max(lookback_days, 120)
        self.content_type = content_type

    async def _fetch_page(self, client: httpx.AsyncClient, page: int, limit: int) -> list[dict[str, Any]]:
        params = {
            "contentType": self.content_type,
            "page": page,
            "limit": limit,
            "key": "createdAt",
            "order": "DESC",
            "isPaginationRequired": "true",
            "isAttachment": "true",
            "language": "english",
            "attributes": "id,headline,examId,contentType,startDate,endDate,language,createdAt",
        }
        resp = await client.get(SSC_API, params=params)
        resp.raise_for_status()
        payload = resp.json()
        items = payload.get("data") if isinstance(payload, dict) else payload
        return items if isinstance(items, list) else []

    async def fetch(self) -> list[dict[str, Any]]:
        headers = {
            "User-Agent": USER_AGENT,
            "Accept": "application/json",
            "Referer": "https://ssc.gov.in/home/notice-board",
        }
        async with httpx.AsyncClient(timeout=60.0, follow_redirects=True, headers=headers) as client:
            # Page 1 is capped oddly at 10; page 2+ returns a larger dump.
            items = await self._fetch_page(client, page=2, limit=100)
            if len(items) < 20:
                items = await self._fetch_page(client, page=1, limit=100)

        out: list[dict[str, Any]] = []
        seen: set[str] = set()
        for raw in items:
            if not isinstance(raw, dict):
                continue
            title = clean_job_title(str(raw.get("headline") or "").replace("\r", " ").replace("\n", " "))
            if not title or not _is_recruitment_headline(title):
                continue
            key = title.lower()
            if key in seen:
                continue
            seen.add(key)

            published = parse_published(raw.get("startDate") or raw.get("createdAt"))
            if published and not within_lookback(published, self.lookback_days):
                continue

            attachments = raw.get("attachments") if isinstance(raw.get("attachments"), list) else []
            pdf_urls: list[str] = []
            for att in attachments:
                if not isinstance(att, dict):
                    continue
                url = _attachment_url(att.get("path"))
                if url:
                    pdf_urls.append(url)

            end = raw.get("endDate")
            link = pdf_urls[0] if pdf_urls else f"https://ssc.gov.in/home/notice-board#{quote(str(raw.get('id') or ''), safe='')}"

            out.append(
                {
                    "title": title,
                    "link": link,
                    "applyUrl": link,
                    "published": published.isoformat() if published else (raw.get("createdAt") or None),
                    "lastDate": end,
                    "pdfUrls": pdf_urls[:5],
                    "source": "ssc",
                    "sourceName": "Staff Selection Commission (SSC)",
                    "dept": "Staff Selection Commission (SSC)",
                    "state": "All India",
                    "category": "ssc",
                }
            )
            if len(out) >= self.max_items:
                break

        logger.info("SSC API scraped %s recruitment notices (from %s returned)", len(out), len(items))
        return out
