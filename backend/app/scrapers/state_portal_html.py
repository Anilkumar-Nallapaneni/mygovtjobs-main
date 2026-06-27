"""State PSC / portal HTML scraper — mirrors scripts/lib/html-job-links.mjs."""

import logging
import re
from typing import Any
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup

from app.config import get_settings
from app.utils.url_safety import assert_safe_url
from app.scrapers.base import BaseScraper
from app.scrapers.http_client import create_async_client
from app.scrapers.date_utils import extract_date_from_title, parse_published, within_lookback
from app.services.noise_filter import (
    clean_job_title,
    friendly_dept_from_host,
    is_junk_job_title,
    is_portal_section_link,
    is_result_archive_listing,
    is_tender_or_procurement,
)

_STRICT = re.compile(
    r"recruit|vacanc|notif|advert|career|employment|bharti|naukri|exam|admit|result|apply|"
    r"opening|posting|appointment|walk-?in|directorate|commission|board|"
    r"notification|job",
    re.I,
)
_PATH = re.compile(
    r"recruit|vacanc|notif|advert|career|employment|bharti|exam|admit|result|apply|"
    r"opening|posting|notice|job|cwe|archive|walkin",
    re.I,
)
_TENDER_URL = re.compile(r"/tenders?(?:/|$|\?|s\b)|/e-?tender|/procurement|downloadtender", re.I)
_SKIP = re.compile(
    r"^(mailto:|javascript:|#)|facebook\.com|twitter\.com|instagram\.com|"
    r"youtube\.com/watch|linkedin\.com/share|play\.google|apps\.apple|"
    r"\.(jpg|jpeg|png|gif|svg|css|js)(\?|$)",
    re.I,
)
_NOISE = re.compile(r"login|signup|register|privacy|terms|contact|sitemap|gallery|tourism", re.I)

_COMMON_PATHS = [
    "/recruitment",
    "/recruitments",
    "/career",
    "/careers",
    "/notification",
    "/notifications",
    "/notices",
    "/notice",
    "/vacancy",
    "/vacancies",
    "/whats-new",
    "/advertisement",
    "/archive",
    "/Archive",
    "/notifications/archive",
    "/ViewArchive",
    "/viewall",
    "/latest",
]

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)
logger = logging.getLogger(__name__)


def _host_key(url: str) -> str:
    try:
        return urlparse(url).hostname.replace("www.", "") if urlparse(url).hostname else ""
    except Exception:
        return ""


def _score_link(text: str, abs_url: str, page_host: str) -> int:
    probe = f"{text} {abs_url}".lower()
    score = 0
    if _STRICT.search(probe):
        score += 3
    try:
        if _PATH.search(urlparse(abs_url).path):
            score += 2
    except Exception:
        pass
    if re.search(r"\.pdf(\?|$)", abs_url, re.I):
        score += 4
    if _host_key(abs_url) == page_host:
        score += 1
    if len(text) >= 15:
        score += 1
    if len(text) >= 30:
        score += 1
    if _NOISE.search(probe):
        score -= 5
    if _TENDER_URL.search(abs_url) or is_tender_or_procurement(text, abs_url):
        score -= 20
    return score


def _extract_links(html: str, page_url: str, *, relaxed: bool = False, max_items: int = 80) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    page_host = _host_key(page_url)
    min_score = 1 if relaxed else 2
    candidates: list[dict] = []

    for anchor in soup.find_all("a", href=True):
        href_raw = anchor.get("href", "").strip()
        if not href_raw or _SKIP.search(href_raw):
            continue
        abs_url = urljoin(page_url, href_raw)
        if not abs_url.startswith(("http://", "https://")):
            continue

        text = " ".join(anchor.get_text(strip=True).split())
        title = text or anchor.get("title") or ""
        score = _score_link(title, abs_url, page_host)

        if relaxed:
            same_gov = (
                (page_host.endswith(".gov.in") or page_host.endswith(".nic.in"))
                and (".gov.in" in abs_url or ".nic.in" in abs_url or _host_key(abs_url) == page_host)
            ) or _host_key(abs_url) == page_host
            if score < min_score and not (same_gov and (_PATH.search(abs_url) or re.search(r"\.pdf", abs_url, re.I))):
                continue
        elif score < min_score:
            continue

        parent_text = ""
        parent = anchor.find_parent(["tr", "li", "div"])
        if parent:
            parent_text = parent.get_text(" ", strip=True)[:120]

        published_dt = extract_date_from_title(f"{title} {parent_text}")
        published_iso = published_dt.isoformat() if published_dt else None

        pdf_urls = [abs_url] if re.search(r"\.pdf(\?|$)", abs_url, re.I) else []
        candidates.append(
            {
                "title": title or abs_url.rstrip("/").split("/")[-1] or "Official notification",
                "link": abs_url,
                "pdfUrls": pdf_urls,
                "score": score,
                "published": published_iso,
                "publishedAt": published_iso,
                "parentText": parent_text,
            }
        )

    candidates.sort(key=lambda c: (c.get("publishedAt") or "", c["score"]), reverse=True)
    seen: set[str] = set()
    results: list[dict] = []
    for c in candidates:
        if len(results) >= max_items:
            break
        if c["link"] in seen:
            continue
        seen.add(c["link"])
        results.append(c)
    return results


class StatePortalHtmlScraper(BaseScraper):
    def __init__(
        self,
        portal_url: str,
        state_code: str,
        *,
        max_items: int | None = None,
        lookback_days: int | None = None,
    ):
        settings = get_settings()
        self.portal_url = portal_url.rstrip("/")
        self.state_code = state_code
        self.max_items = max_items if max_items is not None else settings.ingest_max_items_per_source
        self.lookback_days = lookback_days if lookback_days is not None else settings.ingest_lookback_days

    async def fetch(self) -> list[dict[str, Any]]:
        parsed = urlparse(self.portal_url)
        base = f"{parsed.scheme}://{parsed.netloc}"
        urls_to_try = [self.portal_url] + [f"{base}{p}" for p in _COMMON_PATHS]
        seen_pages: set[str] = set()
        all_rows: list[dict[str, Any]] = []
        seen_links: set[str] = set()

        async with create_async_client(timeout=30, user_agent=USER_AGENT) as client:
            for page_url in urls_to_try:
                if page_url in seen_pages or len(all_rows) >= self.max_items:
                    break
                seen_pages.add(page_url)
                try:
                    assert_safe_url(page_url)
                    res = await client.get(page_url)
                    if res.status_code >= 400:
                        logger.info("state portal page skipped status=%s url=%s", res.status_code, page_url)
                        continue
                    html = res.text
                except Exception as exc:
                    logger.info("state portal page fetch failed url=%s error=%s", page_url, exc)
                    continue

                links = _extract_links(html, page_url, relaxed=False, max_items=self.max_items)
                if not links:
                    links = _extract_links(html, page_url, relaxed=True, max_items=self.max_items)

                for item in links:
                    link = item["link"]
                    if link in seen_links:
                        continue

                    title = clean_job_title(item.get("title"))
                    if is_junk_job_title(title):
                        parent = clean_job_title(item.get("parentText"))
                        if parent and not is_junk_job_title(parent) and len(parent) >= len(title or ""):
                            title = parent
                    if is_tender_or_procurement(title, link):
                        continue
                    if is_portal_section_link(title, link):
                        continue
                    if is_junk_job_title(title, link):
                        continue
                    if is_result_archive_listing(title, link):
                        continue

                    published_dt = parse_published(item.get("published"))
                    if published_dt and not within_lookback(
                        published_dt, days=self.lookback_days, unknown_includes=False
                    ):
                        continue

                    seen_links.add(link)
                    dept_label = friendly_dept_from_host(parsed.netloc)
                    all_rows.append(
                        {
                            "id": link,
                            "title": title or clean_job_title(item.get("title")) or "Official notification",
                            "link": link,
                            "pdfUrls": item.get("pdfUrls") or [],
                            "state": self.state_code,
                            "dept": dept_label,
                            "sourceName": dept_label,
                            "published": item.get("published"),
                            "publishedAt": item.get("publishedAt"),
                        }
                    )
                    if len(all_rows) >= self.max_items:
                        return all_rows

        return all_rows
