"""Probe website URLs for reachability."""

from __future__ import annotations

import asyncio
import logging
from typing import Any

import certifi
import httpx

logger = logging.getLogger(__name__)

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)


async def probe_websites(
    websites: list[dict[str, Any]],
    *,
    concurrency: int = 8,
    timeout_sec: float = 20.0,
    limit: int | None = None,
) -> list[dict[str, Any]]:
    """HEAD/GET each website latestUrl; attach probe result to copy of records."""
    targets = websites[:limit] if limit else websites
    sem = asyncio.Semaphore(concurrency)
    results: list[dict[str, Any]] = []

    limits = httpx.Limits(max_connections=20, max_keepalive_connections=10)
    timeout = httpx.Timeout(timeout_sec, connect=12.0)
    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }

    async with httpx.AsyncClient(
        limits=limits, timeout=timeout, headers=headers, verify=certifi.where()
    ) as client:

        async def check(site: dict[str, Any]) -> None:
            url = site.get("latestUrl") or site.get("url") or ""
            async with sem:
                probe = await _probe_one(client, url)
            merged = {**site, "probe": probe}
            results.append(merged)

        await asyncio.gather(*(check(s) for s in targets))

    return results


async def _probe_one(client: httpx.AsyncClient, url: str) -> dict[str, Any]:
    if not url:
        return {"ok": False, "status": 0, "error": "no url"}

    try:
        resp = await client.head(url, follow_redirects=True)
        if resp.status_code >= 400:
            resp = await client.get(url, follow_redirects=True)
        text_len = 0
        has_rss = False
        if resp.status_code < 400:
            try:
                body = await client.get(str(resp.url), follow_redirects=True)
                content = body.text[:8000]
                text_len = len(body.text)
                has_rss = "application/rss+xml" in content or 'rel="alternate"' in content
            except Exception:
                pass

        return {
            "ok": resp.status_code < 400,
            "status": resp.status_code,
            "finalUrl": str(resp.url),
            "bytes": text_len,
            "hasRss": has_rss,
        }
    except Exception as exc:
        return {"ok": False, "status": 0, "error": str(exc)}
