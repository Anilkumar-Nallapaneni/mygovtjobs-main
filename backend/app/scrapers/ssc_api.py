"""SSC.gov.in notice-boards JSON API scraper (Angular SPA has no HTML anchors)."""

from __future__ import annotations

import asyncio
import logging
import re
from typing import Any
from urllib.parse import quote

import httpx

from app.scrapers.base import BaseScraper
from app.scrapers.date_utils import parse_published, within_lookback
from app.scrapers.http_client import create_async_client
from app.services.document_classifier import classify_document
from app.services.noise_filter import clean_job_title, is_junk_job_title

logger = logging.getLogger(__name__)

SSC_API = "https://ssc.gov.in/api/general-website/portal/notice-boards"
SSC_ATTACHMENT = "https://ssc.gov.in/api/attachment/"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)

# Prefer real open-application notices — NOT vacancy tables / result lists.
_KEEP = re.compile(
    r"\bnotice of\b|"
    r"\badvertisement\b|"
    r"inviting\s+application|"
    r"online\s+application|"
    r"re-?opening of window|"
    r"window for (?:online )?application|"
    r"\bengagement of\b|"
    r"\brecruitment of\b|"
    r"\brecruitment to\b",
    re.I,
)
_DROP = re.compile(
    r"\bresult\b|\bmarks\b|answer\s*key|admit\s*card|cutoff|cut-?off|"
    r"shortlist|document verification|\bidentity verification\b|\buploading\b|"
    r"declaration of|final answer|tier-?[i1v]+\s+marks|frta\b|pe and mt|"
    r"schedule of examinations|postponement of physical|"
    r"tentative vacanc|final vacanc|final selection|"
    r"cancellation notice|\bcancel+ation\b|"
    r"^corrigendum\b|^addendum\b|"
    r"revision of vacancy|revised vacanc|"
    r"provisional panel|marks tabulation",
    re.I,
)
# Soft exceptions: corrigendum/addendum that re-open application windows.
_KEEP_DESPITE_DROP = re.compile(
    r"\bre-?opening of window\b|\bnotice of\b|\bengagement of\b|\badvertisement\b",
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
    # Hard drop lifecycle/result noise even when soft keep phrases appear.
    if re.search(r"(?i)\bfinal selection\b|tentative vacanc|final vacanc|cancellation notice", t):
        return False
    if re.search(r"(?i)^(corrigendum|addendum)\b", t) and not re.search(
        r"(?i)\bre-?opening of window\b|\bwindow for (?:online )?application\b", t
    ):
        return False
    if _DROP.search(t) and not _KEEP_DESPITE_DROP.search(t):
        return False
    if _KEEP.search(t):
        return True
    classification = classify_document(t, "", url="")
    return classification.content_type in ("RECRUITMENT", "POSSIBLE_RECRUITMENT")


def _priority(title: str) -> int:
    """Prefer exam notices / engagements over soft matches."""
    t = title or ""
    score = 0
    if re.search(r"(?i)\bnotice of\b", t):
        score += 50
    if re.search(r"(?i)\bre-?opening of window\b|\bwindow for (?:online )?application\b", t):
        score += 40
    if re.search(r"(?i)\bengagement of\b|\badvertisement\b", t):
        score += 30
    if re.search(r"(?i)20\d{2}", t):
        score += 5
    return score


def _is_event_headline(title: str) -> bool:
    t = title or ""
    if not t or is_junk_job_title(t):
        return False
    return bool(
        re.search(
            r"\bresult\b|admit\s*card|hall\s*ticket|answer\s*key|cutoff|cut-?off|"
            r"marks\s+tabulation|declaration of",
            t,
            re.I,
        )
    )


class SscApiScraper(BaseScraper):
    def __init__(
        self,
        *,
        max_items: int = 50,
        lookback_days: int = 400,
        content_type: str = "notice-boards",
        mode: str = "jobs",
    ):
        self.max_items = max_items
        # SSC exam notices often remain the open apply window for months.
        self.lookback_days = max(lookback_days, 400)
        self.content_type = content_type
        self.mode = mode if mode in ("jobs", "events") else "jobs"

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
        # SSC intermittently returns 203 / empty payloads; treat as soft failure.
        if resp.status_code not in (200, 203):
            resp.raise_for_status()
        try:
            payload = resp.json()
        except Exception:
            return []
        items = payload.get("data") if isinstance(payload, dict) else payload
        return items if isinstance(items, list) else []

    async def _fetch_items_with_retry(self, client: httpx.AsyncClient) -> list[dict[str, Any]]:
        """Page 1 is often capped/empty; page 2 returns the bulk dump. Retry on empty."""
        last: list[dict[str, Any]] = []
        for attempt in range(4):
            for page in (2, 1, 3):
                try:
                    items = await self._fetch_page(client, page=page, limit=100)
                except Exception as exc:
                    logger.warning("SSC API page=%s attempt=%s failed: %s", page, attempt, exc)
                    continue
                if len(items) >= 20:
                    return items
                if len(items) > len(last):
                    last = items
            await asyncio.sleep(1.5 * (attempt + 1))
        return last

    async def fetch(self) -> list[dict[str, Any]]:
        headers = {
            "User-Agent": USER_AGENT,
            "Accept": "application/json",
            "Referer": "https://ssc.gov.in/home/notice-board",
            "Origin": "https://ssc.gov.in",
        }
        async with create_async_client(
            timeout=60.0,
            user_agent=USER_AGENT,
            url_for_tls_policy=SSC_API,
        ) as client:
            client.headers.update(headers)
            items = await self._fetch_items_with_retry(client)

        candidates: list[dict[str, Any]] = []
        seen: set[str] = set()
        for raw in items:
            if not isinstance(raw, dict):
                continue
            title = clean_job_title(str(raw.get("headline") or "").replace("\r", " ").replace("\n", " "))
            keep = _is_event_headline if self.mode == "events" else _is_recruitment_headline
            if not title or not keep(title):
                continue
            key = title.lower()
            if key in seen:
                continue
            seen.add(key)

            published = parse_published(raw.get("startDate") or raw.get("createdAt"))
            if published and not within_lookback(published, days=self.lookback_days):
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

            candidates.append(
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
                    "_priority": _priority(title),
                }
            )

        candidates.sort(
            key=lambda row: (int(row.get("_priority") or 0), str(row.get("published") or "")),
            reverse=True,
        )
        out: list[dict[str, Any]] = []
        for row in candidates[: self.max_items]:
            row.pop("_priority", None)
            out.append(row)

        logger.info(
            "SSC API scraped %s %s notices (from %s returned, %s candidates)",
            len(out),
            self.mode,
            len(items),
            len(candidates),
        )
        return out


class SscEventsScraper(SscApiScraper):
    """Same SSC JSON API, keeping result / admit / answer-key headlines for hubs."""

    def __init__(self, *, max_items: int = 80, lookback_days: int = 400, content_type: str = "notice-boards"):
        super().__init__(
            max_items=max_items,
            lookback_days=lookback_days,
            content_type=content_type,
            mode="events",
        )
