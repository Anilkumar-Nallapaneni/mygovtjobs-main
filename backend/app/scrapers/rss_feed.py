"""RSS/Atom fetcher — mirrors scripts/fetch-official-feeds.mjs."""

import json
import re
from pathlib import Path
from typing import Any

from datetime import datetime, timezone

import feedparser

from app.config import get_settings
from app.utils.url_safety import assert_safe_url
from app.scrapers.base import BaseScraper
from app.scrapers.date_utils import parse_published, within_lookback
from app.scrapers.http_client import get_text
from app.scrapers.state_portal_html import _extract_links

ROOT = Path(__file__).resolve().parents[3]
SOURCES_PATH = ROOT / "scripts" / "official-sources.json"

_PDF_IN_HTML = re.compile(r"https?://[^\s\"'<>]+\.pdf", re.I)


def _entry_summary(entry: Any) -> str:
    parts: list[str] = []
    for key in ("summary", "description", "content"):
        val = entry.get(key) if isinstance(entry, dict) else getattr(entry, key, None)
        if not val:
            continue
        if isinstance(val, list):
            for block in val:
                if isinstance(block, dict):
                    parts.append(str(block.get("value") or ""))
                else:
                    parts.append(str(block))
        else:
            parts.append(str(val))
    return " ".join(parts).strip()


def _pdfs_from_entry(entry: Any, link: str) -> list[str]:
    blob = _entry_summary(entry)
    found = [u.replace("&amp;", "&") for u in _PDF_IN_HTML.findall(blob)]
    if link and _PDF_IN_HTML.search(link):
        found.insert(0, link)
    out: list[str] = []
    seen: set[str] = set()
    for u in found:
        if u not in seen:
            seen.add(u)
            out.append(u)
    return out[:8]


class RssFeedScraper(BaseScraper):
    def __init__(
        self,
        feed_id: str | None = None,
        *,
        lookback_days: int | None = None,
        max_items: int | None = None,
    ):
        self.feed_id = feed_id
        settings = get_settings()
        self.lookback_days = lookback_days if lookback_days is not None else settings.ingest_lookback_days
        self.max_items = max_items if max_items is not None else settings.ingest_max_items_per_source

    def _listing_urls(self, target: dict[str, Any]) -> list[str]:
        urls: list[str] = []
        for key in ("listingUrl",):
            val = target.get(key)
            if val:
                urls.append(str(val))
        for val in target.get("altListingUrls") or []:
            if val:
                urls.append(str(val))
        seen: set[str] = set()
        out: list[str] = []
        for u in urls:
            if u not in seen:
                seen.add(u)
                out.append(u)
        return out

    async def _fetch_rss(self, target: dict[str, Any], cfg: dict[str, Any]) -> list[dict[str, Any]]:
        url = target["feedUrl"]
        user_agent = cfg.get("userAgent", "MyGovtJobs/1.0")
        title_filter = target.get("titleMustMatch")
        title_re = re.compile(title_filter, re.I) if title_filter else None
        lookback = int(target.get("lookbackDays") or cfg.get("lookbackDays") or self.lookback_days)
        cap = int(target.get("maxItems") or self.max_items)
        scan_limit = min(500, max(cap * 4, 80))

        assert_safe_url(url)
        res = await get_text(url, user_agent=user_agent)
        parsed = feedparser.parse(res.text)

        rows: list[dict[str, Any]] = []
        for entry in parsed.entries[:scan_limit]:
            title = entry.get("title") or "Official notification"
            if title_re and not title_re.search(title):
                continue
            link = entry.get("link") or ""

            published_raw = entry.get("published") or entry.get("updated")
            if hasattr(entry, "published_parsed") and entry.published_parsed:
                try:
                    published_dt = parse_published(
                        datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
                    )
                except Exception:
                    published_dt = parse_published(published_raw)
            else:
                published_dt = parse_published(published_raw)

            if not within_lookback(published_dt, days=lookback, unknown_includes=True):
                continue

            published_iso = published_dt.isoformat() if published_dt else None
            summary = _entry_summary(entry)[:2000] or None
            pdf_urls = _pdfs_from_entry(entry, link)

            rows.append(
                {
                    "id": entry.get("id") or link or title,
                    "title": title,
                    "link": link,
                    "dept": target.get("dept") or target.get("name"),
                    "sourceName": target.get("name") or target.get("dept"),
                    "state": target.get("state") or "All India",
                    "category": target.get("category"),
                    "published": published_iso,
                    "publishedAt": published_iso,
                    "summary": summary,
                    "pdfUrls": pdf_urls,
                }
            )
            if len(rows) >= cap:
                break

        rows.sort(key=lambda r: r.get("publishedAt") or "", reverse=True)
        return rows

    async def _fetch_html_listing(self, target: dict[str, Any], cfg: dict[str, Any]) -> list[dict[str, Any]]:
        user_agent = cfg.get("userAgent", "MyGovtJobs/1.0")
        title_filter = target.get("titleMustMatch")
        title_re = re.compile(title_filter, re.I) if title_filter else None
        lookback = int(target.get("lookbackDays") or cfg.get("lookbackDays") or self.lookback_days)
        cap = int(target.get("maxItems") or self.max_items)
        relaxed = target.get("relaxed", True)
        rows: list[dict[str, Any]] = []
        seen_links: set[str] = set()

        for page_url in self._listing_urls(target):
            if len(rows) >= cap:
                break
            assert_safe_url(page_url)
            res = await get_text(page_url, user_agent=user_agent)
            links = _extract_links(res.text, page_url, relaxed=relaxed, max_items=cap)
            for item in links:
                link = item.get("link") or ""
                title = item.get("title") or "Official notification"
                if not link or link in seen_links:
                    continue
                if title_re and not title_re.search(f"{title} {link}"):
                    continue
                published_dt = parse_published(item.get("published"))
                if not within_lookback(published_dt, days=lookback, unknown_includes=True):
                    continue
                seen_links.add(link)
                published_iso = published_dt.isoformat() if published_dt else item.get("publishedAt")
                rows.append(
                    {
                        "id": link,
                        "title": title,
                        "link": link,
                        "dept": target.get("dept") or target.get("name"),
                        "sourceName": target.get("name") or target.get("dept"),
                        "state": target.get("state") or "All India",
                        "category": target.get("category"),
                        "published": published_iso,
                        "publishedAt": published_iso,
                        "summary": None,
                        "pdfUrls": item.get("pdfUrls") or [],
                    }
                )
                if len(rows) >= cap:
                    break

        rows.sort(key=lambda r: r.get("publishedAt") or "", reverse=True)
        return rows

    async def fetch(self) -> list[dict[str, Any]]:
        cfg = json.loads(SOURCES_PATH.read_text(encoding="utf-8"))
        feeds = cfg.get("feeds") or []
        target = next((f for f in feeds if f.get("id") == self.feed_id), feeds[0] if feeds else None)
        if not target:
            return []

        if target.get("feedUrl"):
            return await self._fetch_rss(target, cfg)

        if self._listing_urls(target):
            return await self._fetch_html_listing(target, cfg)

        return []
