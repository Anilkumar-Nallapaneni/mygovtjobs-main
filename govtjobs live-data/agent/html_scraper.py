"""Scrape recruitment links from official government portal HTML pages."""

from __future__ import annotations

import re
from typing import Any
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup

_STRICT = re.compile(
    r"recruit|vacanc|notif|advert|career|employment|bharti|naukri|exam|admit|result|apply|"
    r"opening|posting|appointment|walk-?in|directorate|commission|board|notification|job",
    re.I,
)
_PATH = re.compile(
    r"recruit|vacanc|notif|advert|career|employment|bharti|exam|admit|result|apply|"
    r"opening|posting|notice|job|cwe|archive|walkin",
    re.I,
)
_TENDER_URL = re.compile(r"/tenders?(?:/|$|\?|s\b)|/e-?tender|/procurement|downloadtender", re.I)
_TENDER_TEXT = re.compile(
    r"\be-?tenders?\b|\btenders?\b|\bprocurement\b|\bquotations?\b|\bnotice\s+tender\b",
    re.I,
)
_SKIP = re.compile(
    r"^(mailto:|javascript:|#)|facebook\.com|twitter\.com|instagram\.com|"
    r"youtube\.com/watch|linkedin\.com/share|play\.google|apps\.apple|"
    r"\.(jpg|jpeg|png|gif|svg|css|js)(\?|$)",
    re.I,
)

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
]


def _host_key(url: str) -> str:
    try:
        host = urlparse(url).hostname or ""
        return host.removeprefix("www.")
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
    if re.search(r"login|signup|register|privacy|terms|contact|sitemap|gallery|tourism", probe):
        score -= 5
    if _TENDER_URL.search(abs_url) or _TENDER_TEXT.search(text):
        score -= 20
    if re.match(
        r"^(apply\s+online|notifications?|advertisements?|examination\s+syllabus|"
        r"recruitment\s+calendar|results?)$",
        text.strip(),
        re.I,
    ):
        score -= 8
    return score


def common_recruitment_paths(base_url: str) -> list[str]:
    try:
        origin = f"{urlparse(base_url).scheme}://{urlparse(base_url).netloc}"
    except Exception:
        return []
    return [f"{origin}{p}" for p in _COMMON_PATHS]


def extract_job_links(html: str, page_url: str, *, max_items: int = 50, relaxed: bool = False) -> list[dict[str, Any]]:
    strict = _collect_anchors(html, page_url, max_items=max_items, relaxed=False)
    if strict:
        return strict
    if relaxed:
        return _collect_anchors(html, page_url, max_items=max_items, relaxed=True)
    return _collect_anchors(html, page_url, max_items=max_items, relaxed=True)


def _collect_anchors(html: str, page_url: str, *, max_items: int, relaxed: bool) -> list[dict[str, Any]]:
    soup = BeautifulSoup(html, "lxml")
    page_host = _host_key(page_url)
    min_score = 1 if relaxed else 2
    max_items = min(60, max(1, max_items))
    candidates: list[dict[str, Any]] = []

    for anchor in soup.find_all("a", href=True):
        href_raw = (anchor.get("href") or "").strip()
        if not href_raw or _SKIP.search(href_raw):
            continue
        abs_url = urljoin(page_url, href_raw)
        if not abs_url.lower().startswith(("http://", "https://")):
            continue

        text = re.sub(r"\s+", " ", anchor.get_text(strip=True) or anchor.get("title") or "")
        score = _score_link(text, abs_url, page_host)

        if relaxed:
            same_gov = (
                (page_host.endswith(".gov.in") or page_host.endswith(".nic.in"))
                and (".gov.in" in abs_url or ".nic.in" in abs_url or _host_key(abs_url) == page_host)
            ) or _host_key(abs_url) == page_host
            if score < min_score and not (same_gov and (_PATH.search(abs_url) or re.search(r"\.pdf", abs_url, re.I))):
                continue
        elif score < min_score:
            continue

        pdf_urls = [abs_url] if re.search(r"\.pdf(\?|$)", abs_url, re.I) else []
        candidates.append(
            {
                "title": text or abs_url.rstrip("/").split("/")[-1] or "Official notification",
                "link": abs_url,
                "pdfUrls": pdf_urls,
                "score": score,
            }
        )

    candidates.sort(key=lambda c: c["score"], reverse=True)
    seen: set[str] = set()
    results: list[dict[str, Any]] = []
    for item in candidates:
        if len(results) >= max_items:
            break
        if item["link"] in seen:
            continue
        seen.add(item["link"])
        results.append(item)
    return results
