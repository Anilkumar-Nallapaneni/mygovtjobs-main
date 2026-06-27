"""Discover PDF notification links on job detail pages."""

from __future__ import annotations

import re
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup

_PDF = re.compile(r"\.pdf(\?|$)", re.I)
_OFFICIAL = re.compile(r"\.(gov|nic)\.in|\.gov\.|\.nic\.", re.I)


def is_official_url(url: str) -> bool:
    try:
        host = (urlparse(url).hostname or "").lower()
    except Exception:
        return False
    if _OFFICIAL.search(host):
        return True
    return host.endswith((".gov.in", ".nic.in", ".ac.in", ".res.in"))


async def discover_pdfs_on_page(client, page_url: str, *, max_pdfs: int = 8) -> list[str]:
    """Fetch a detail page and collect official PDF links."""
    try:
        resp = await client.get(page_url, follow_redirects=True, timeout=25.0)
        if resp.status_code >= 400:
            return []
        html = resp.text
    except Exception:
        return []

    if _PDF.search(page_url):
        return [page_url] if is_official_url(page_url) else []

    soup = BeautifulSoup(html, "lxml")
    found: list[str] = []
    for anchor in soup.find_all("a", href=True):
        href = urljoin(page_url, anchor["href"])
        if not _PDF.search(href):
            continue
        if is_official_url(href) or _host_match(page_url, href):
            found.append(href)
        if len(found) >= max_pdfs:
            break

    for iframe in soup.find_all("iframe", src=True):
        src = urljoin(page_url, iframe["src"])
        if _PDF.search(src):
            found.append(src)

    return list(dict.fromkeys(found))[:max_pdfs]


def _host_match(page_url: str, pdf_url: str) -> bool:
    try:
        a = (urlparse(page_url).hostname or "").removeprefix("www.")
        b = (urlparse(pdf_url).hostname or "").removeprefix("www.")
        return a == b or a.endswith(b) or b.endswith(a)
    except Exception:
        return False
