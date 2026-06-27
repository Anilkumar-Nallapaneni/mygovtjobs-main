"""Find notification PDF URLs on official pages when the scrape only captured an HTML link."""

import logging
import re
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup

from app.utils.url_safety import assert_safe_url
from app.scrapers.http_client import create_async_client

_PDF = re.compile(r"\.pdf(\?|/|$)", re.I)
_SKIP = re.compile(
    r"facebook|twitter|instagram|youtube|linkedin|mailto:|javascript:",
    re.I,
)

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)
logger = logging.getLogger(__name__)


def _is_pdf_url(url: str | None) -> bool:
    return bool(url and _PDF.search(url))


def _same_site(a: str, b: str) -> bool:
    try:
        ha = urlparse(a).hostname or ""
        hb = urlparse(b).hostname or ""
        return ha == hb or ha.endswith("." + hb) or hb.endswith("." + ha)
    except Exception:
        return False


def _score_pdf_anchor(text: str, href: str, page_url: str) -> int:
    if not _is_pdf_url(href) or _SKIP.search(href):
        return -1
    score = 4
    probe = f"{text} {href}".lower()
    if re.search(r"notif|advert|recruit|vacanc|engagement|apprentice|exam|bharti", probe):
        score += 3
    if re.search(r"result|roll\s*no|answer\s*key|marksheet|dv\s+schedule|shortlist", probe):
        score -= 4
    if _same_site(href, page_url):
        score += 2
    return score


def _pick_best_pdf(anchors: list[tuple[str, str]], page_url: str) -> str | None:
    scored: list[tuple[int, str]] = []
    for text, href in anchors:
        score = _score_pdf_anchor(text, href, page_url)
        if score >= 0:
            scored.append((score, href))
    if not scored:
        return None
    scored.sort(key=lambda x: x[0], reverse=True)
    return scored[0][1]


def _pick_all_pdfs(anchors: list[tuple[str, str]], page_url: str, *, limit: int = 8) -> list[str]:
    scored: list[tuple[int, str]] = []
    for text, href in anchors:
        score = _score_pdf_anchor(text, href, page_url)
        if score >= 3:
            scored.append((score, href))
    scored.sort(key=lambda x: x[0], reverse=True)
    out: list[str] = []
    seen: set[str] = set()
    for _, href in scored:
        if href in seen:
            continue
        seen.add(href)
        out.append(href)
        if len(out) >= limit:
            break
    return out


async def discover_pdf_on_page(page_url: str, *, timeout: float = 20) -> str | None:
    if not page_url or not page_url.startswith("http") or _is_pdf_url(page_url):
        return page_url if _is_pdf_url(page_url) else None
    try:
        assert_safe_url(page_url)
        async with create_async_client(timeout=timeout, user_agent=USER_AGENT) as client:
            res = await client.get(page_url)
            if res.status_code >= 400:
                return None
            if _PDF.search(res.headers.get("content-type", "")):
                return str(res.url)
            soup = BeautifulSoup(res.text, "html.parser")
            anchors: list[tuple[str, str]] = []
            for a in soup.find_all("a", href=True):
                href = urljoin(str(res.url), a["href"].strip())
                text = " ".join(a.get_text(strip=True).split())
                anchors.append((text, href))
            return _pick_best_pdf(anchors, str(res.url))
    except Exception as exc:
        logger.info("pdf discovery failed url=%s error=%s", page_url, exc)
        return None


async def discover_all_pdfs_on_page(page_url: str, *, timeout: float = 20, limit: int = 8) -> list[str]:
    if not page_url or not page_url.startswith("http") or _is_pdf_url(page_url):
        return [page_url] if _is_pdf_url(page_url) else []
    try:
        assert_safe_url(page_url)
        async with create_async_client(timeout=timeout, user_agent=USER_AGENT) as client:
            res = await client.get(page_url)
            if res.status_code >= 400:
                return []
            if _PDF.search(res.headers.get("content-type", "")):
                return [str(res.url)]
            soup = BeautifulSoup(res.text, "html.parser")
            anchors: list[tuple[str, str]] = []
            for a in soup.find_all("a", href=True):
                href = urljoin(str(res.url), a["href"].strip())
                text = " ".join(a.get_text(strip=True).split())
                anchors.append((text, href))
            return _pick_all_pdfs(anchors, str(res.url), limit=limit)
    except Exception as exc:
        logger.info("pdf discovery failed url=%s error=%s", page_url, exc)
        return []


async def ensure_pdf_urls(pdf_urls: list[str] | None, apply_url: str | None) -> list[str]:
    """Return deduped PDF URLs; optionally discover one from an HTML apply page."""
    out: list[str] = []
    seen: set[str] = set()

    def add(url: str | None) -> None:
        if not url or url in seen:
            return
        seen.add(url)
        out.append(url)

    for u in pdf_urls or []:
        add(u)

    if _is_pdf_url(apply_url):
        add(apply_url)
        return out

    if out and apply_url and not _is_pdf_url(apply_url):
        for extra in await discover_all_pdfs_on_page(apply_url):
            add(extra)
        return out

    if out:
        return out

    for discovered in await discover_all_pdfs_on_page(apply_url or ""):
        add(discovered)
    if not out:
        one = await discover_pdf_on_page(apply_url or "")
        if one:
            add(one)
    return out
