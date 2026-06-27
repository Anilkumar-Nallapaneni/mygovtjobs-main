"""Fetch vacancies from official RSS/Atom feeds."""

from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import urljoin

import feedparser
import httpx

_RECRUIT = re.compile(r"recruit|vacanc|notif|appoint|exam|career|job|bharti", re.I)


def parse_feed(xml: str, feed_url: str, *, max_items: int = 80, lookback_days: int = 60) -> list[dict[str, Any]]:
    parsed = feedparser.parse(xml)
    cutoff = datetime.now(timezone.utc) - timedelta(days=lookback_days)
    rows: list[dict[str, Any]] = []

    for entry in parsed.entries[: max_items * 2]:
        title = (entry.get("title") or "").strip()
        link = (entry.get("link") or "").strip()
        if not title or not link:
            continue

        published = None
        for key in ("published_parsed", "updated_parsed"):
            tp = entry.get(key)
            if tp:
                published = datetime(*tp[:6], tzinfo=timezone.utc)
                break
        if published and published < cutoff:
            continue

        summary = entry.get("summary") or entry.get("description") or ""
        if not _RECRUIT.search(f"{title} {summary}"):
            continue

        pdf_urls = _pdfs_from_entry(entry, link)
        rows.append(
            {
                "title": title,
                "link": link,
                "published": published.isoformat() if published else None,
                "summary": re.sub(r"<[^>]+>", " ", summary)[:500],
                "pdfUrls": pdf_urls,
            }
        )
        if len(rows) >= max_items:
            break
    return rows


def _pdfs_from_entry(entry: dict, base_link: str) -> list[str]:
    pdfs: list[str] = []
    for link_obj in entry.get("links") or []:
        href = link_obj.get("href") or ""
        if re.search(r"\.pdf(\?|$)", href, re.I):
            pdfs.append(urljoin(base_link, href))
    content = entry.get("content") or []
    for block in content:
        value = block.get("value") or ""
        for m in re.finditer(r'href=["\']([^"\']+\.pdf[^"\']*)["\']', value, re.I):
            pdfs.append(urljoin(base_link, m.group(1)))
    return list(dict.fromkeys(pdfs))


async def fetch_feed(
    client: httpx.AsyncClient,
    feed_url: str,
    *,
    max_items: int = 80,
    lookback_days: int = 60,
) -> list[dict[str, Any]]:
    resp = await client.get(feed_url, follow_redirects=True)
    resp.raise_for_status()
    return parse_feed(resp.text, feed_url, max_items=max_items, lookback_days=lookback_days)
