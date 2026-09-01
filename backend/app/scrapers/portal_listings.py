"""Dedicated official JS/HTML listing scrapers (IOCL, RRB CEN, BSF, BHEL, HAL).

Generic HTML crawl returns 0/noise on these portals. Each class returns the same
row shape as StatePortalHtmlScraper / SscApiScraper.
"""

from __future__ import annotations

import logging
import re
from datetime import date
from typing import Any
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from app.parsers.pdf_dates import extract_dates_from_text
from app.parsers.pdf_fetch import extract_text_from_pdf_bytes, fetch_pdf_bytes
from app.scrapers.base import BaseScraper
from app.scrapers.date_utils import parse_published, within_lookback
from app.scrapers.http_client import create_async_client
from app.services.document_classifier import classify_document_type
from app.services.noise_filter import clean_job_title, is_junk_job_title
from app.utils.url_safety import assert_safe_url
from app.utils.vacancy_extract import extract_vacancies

logger = logging.getLogger(__name__)

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)
_ONCLICK_HREF = re.compile(r"""location\.href\s*=\s*['"]([^'"]+)['"]""", re.I)
_PDF_HREF = re.compile(r"\.pdf(\?|$)", re.I)
_EVENT_TITLE = re.compile(
    r"\b(result|admit\s*card|hall\s*ticket|answer\s*key|cut[\s-]*off|merit\s*list|"
    r"shortlist|nominal\s*roll)\b",
    re.I,
)
_CLOSED_STATUS = re.compile(
    r"panels?\s+published|cbt\s+completed|dv\s+completed|archived|cancelled",
    re.I,
)
_APPLY_KEEP = re.compile(
    r"advert|recruit|walk[\s-]*in|engagement|opening|notification|detailed\s+ad|"
    r"apply|vacanc|constable|engineer|officer|trainee|artisan",
    re.I,
)
_BHEL_NOISE = re.compile(
    r"addendum|vacancy breakup|biodata|employment news|faq|syllabus|"
    r"compassionate|medical examination|exam pattern|cut[\s-]*off|"
    r"public notice|experience certificate|\(download\)|^english$|^hindi$",
    re.I,
)
_HREF_PDF = re.compile(r"""href=["']([^"']+\.pdf[^"']*)["']""", re.I)
_DETAILED_CEN_PDF = re.compile(r"Detailed[_-]CEN[_-](\d{2})[_-](\d{4})\.pdf", re.I)
_RRB_APPLY = "https://www.rrbapply.gov.in/"


def _last_not_expired(last: str | None) -> bool:
    if not last:
        return True
    try:
        return last >= date.today().isoformat()
    except Exception:
        return True


def _is_challenge_html(html: str) -> bool:
    low = (html or "")[:2500].lower()
    return "sucuri_cloudproxy" in low or "you are being redirected" in low


def _job_row(
    *,
    title: str,
    link: str,
    source: str,
    source_name: str,
    dept: str,
    category: str,
    pdf_urls: list[str] | None = None,
    last_date: str | None = None,
    published: str | None = None,
    summary: str = "",
    vacancies: int | None = None,
) -> dict[str, Any]:
    pdfs = [u for u in (pdf_urls or []) if u]
    apply = link or (pdfs[0] if pdfs else "")
    return {
        "title": title,
        "link": apply,
        "applyUrl": apply,
        "pdfUrls": pdfs[:5],
        "lastDate": last_date,
        "published": published,
        "publishedAt": published,
        "summary": summary[:500],
        "source": source,
        "sourceName": source_name,
        "dept": dept,
        "state": "All India",
        "category": category,
        "vacancies": vacancies,
    }


async def _pdf_last_date(url: str) -> str | None:
    try:
        assert_safe_url(url)
        data = await fetch_pdf_bytes(url, timeout=45)
        text = extract_text_from_pdf_bytes(data, max_pages=6)
        dates = extract_dates_from_text(text)
        return dates.get("last_date")
    except Exception as exc:
        logger.info("pdf last_date skipped url=%s error=%s", url[:80], exc)
        return None


def _iso_from_cell(value: str) -> str | None:
    parsed = parse_published(value)
    return parsed.date().isoformat() if parsed else None


class IoclListingsScraper(BaseScraper):
    """IOCL careers SPA is behind a JS cookie wall; advertisement PDFs are public."""

    LISTING_URLS = (
        "https://iocl.com/latest-job-opening",
        "https://iocl.com/job-openings",
    )
    PROBE_PDFS = (
        "https://iocl.com/admin/img/UploadedFiles/LatestJobOpening/Files/DetailedAd14082026.pdf",
    )

    def __init__(self, *, max_items: int = 20, lookback_days: int = 400):
        self.max_items = max_items
        self.lookback_days = lookback_days

    async def fetch(self) -> list[dict[str, Any]]:
        found: list[str] = []
        async with create_async_client(
            timeout=60, user_agent=USER_AGENT, url_for_tls_policy="https://iocl.com/"
        ) as client:
            for page in self.LISTING_URLS:
                try:
                    assert_safe_url(page)
                    html = (await client.get(page)).text or ""
                except Exception as exc:
                    logger.info("IOCL listing fetch failed %s: %s", page, exc)
                    continue
                if _is_challenge_html(html):
                    continue
                soup = BeautifulSoup(html, "html.parser")
                for anchor in soup.find_all("a", href=True):
                    href = urljoin(page, str(anchor.get("href") or ""))
                    if _PDF_HREF.search(href) and "latestjobopening" in href.lower():
                        found.append(href)

            for pdf in self.PROBE_PDFS:
                if pdf not in found:
                    found.append(pdf)

            out: list[dict[str, Any]] = []
            seen: set[str] = set()
            for pdf in found:
                if pdf in seen or len(out) >= self.max_items:
                    continue
                seen.add(pdf)
                last = None
                try:
                    assert_safe_url(pdf)
                    data = (await client.get(pdf, headers={"Accept": "application/pdf,*/*"})).content
                    text = extract_text_from_pdf_bytes(data, max_pages=16)
                    last = extract_dates_from_text(text).get("last_date")
                    if not last:
                        m = re.search(
                            r"(?:end date of online application|last date|closing date)[^\d]{0,80}"
                            r"(\d{1,2})[./-](\d{1,2})[./-](20\d{2})",
                            text or "",
                            re.I,
                        )
                        if m:
                            last = f"{m.group(3)}-{int(m.group(2)):02d}-{int(m.group(1)):02d}"
                    logger.info("IOCL pdf bytes=%s text=%s last=%s", len(data or b""), len(text or ""), last)
                except Exception as exc:
                    logger.info("IOCL pdf parse failed %s: %s", pdf[:80], exc)
                if last and not _last_not_expired(last):
                    continue
                title = "IOCL Recruitment of Executives through CBT 2026"
                name = pdf.rstrip("/").split("/")[-1]
                if name and name.lower() != "files":
                    title = f"IOCL Recruitment of Executives — {name.replace('_', ' ').replace('.pdf', '')}"
                out.append(
                    _job_row(
                        title=clean_job_title(title) or title,
                        link="https://iocl.com/latest-job-opening",
                        source="iocl",
                        source_name="Indian Oil Corporation Limited (IOCL)",
                        dept="Indian Oil Corporation Limited (IOCL)",
                        category="psu",
                        pdf_urls=[pdf],
                        last_date=last,
                        summary="Official IOCL detailed advertisement. Apply online on the IOCL careers portal.",
                    )
                )
        logger.info("IOCL listings scraped %s openings", len(out))
        return out


def parse_rrb_cen_html(
    html: str,
    portal_url: str,
    *,
    kind: str,
    max_items: int,
    lookback_days: int,
    source_code: str,
) -> list[dict[str, Any]]:
    soup = BeautifulSoup(html, "html.parser")
    table = soup.select_one("table.lq-rrb-notice-table") or soup.find("table")
    if not table:
        return []

    host_dept = "Railway Recruitment Board"
    out: list[dict[str, Any]] = []
    for tr in table.find_all("tr"):
        cells = [c.get_text(" ", strip=True) for c in tr.find_all(["td", "th"])]
        if len(cells) < 4 or cells[0].lower() in {"date", "cen no."}:
            continue
        posted, cen, title, posts = cells[0], cells[1], cells[2], cells[3]
        status = cells[4] if len(cells) > 4 else ""
        onclick = " ".join(str(tr.get("onclick") or "").split())
        href_m = _ONCLICK_HREF.search(onclick)
        link = urljoin(portal_url, href_m.group(1)) if href_m else portal_url
        headline = clean_job_title(f"{cen} {title} — {posts}".strip(" —")) or f"{cen} {title}"
        if is_junk_job_title(headline):
            continue
        published = _iso_from_cell(posted)
        published_dt = parse_published(posted)
        if published_dt and not within_lookback(published_dt, days=lookback_days, unknown_includes=True):
            continue
        is_event = bool(_EVENT_TITLE.search(f"{title} {status} {posts}"))
        if kind == "jobs":
            if is_event or _CLOSED_STATUS.search(status):
                continue
        elif kind == "events":
            if not (is_event or _EVENT_TITLE.search(status)):
                continue
        if len(out) >= max_items:
            break
        out.append(
            _job_row(
                title=headline,
                link=link,
                source=source_code,
                source_name=host_dept,
                dept=host_dept,
                category="railways",
                published=published,
                summary=status,
            )
        )
    return out


class RrbCenScraper(BaseScraper):
    """RRB regional notification tables (onclick → cen.php)."""

    def __init__(
        self,
        portal_url: str,
        *,
        max_items: int = 40,
        lookback_days: int = 400,
        source_code: str = "rrb",
    ):
        self.portal_url = portal_url.rstrip("/")
        self.max_items = max_items
        self.lookback_days = lookback_days
        self.source_code = source_code

    async def fetch(self) -> list[dict[str, Any]]:
        rows = await self._fetch_kind("jobs")
        logger.info("RRB CEN scraped %s recruitment rows from %s", len(rows), self.portal_url)
        return rows

    async def fetch_events(self) -> list[dict[str, Any]]:
        return await self._fetch_kind("events")

    async def _fetch_kind(self, kind: str) -> list[dict[str, Any]]:
        assert_safe_url(self.portal_url)
        async with create_async_client(
            timeout=40, user_agent=USER_AGENT, url_for_tls_policy=self.portal_url
        ) as client:
            try:
                html = (await client.get(self.portal_url)).text or ""
            except Exception as exc:
                logger.info("RRB CEN fetch failed %s: %s", self.portal_url, exc)
                return []

        return parse_rrb_cen_html(
            html,
            self.portal_url,
            kind=kind,
            max_items=self.max_items,
            lookback_days=self.lookback_days,
            source_code=self.source_code,
        )


def parse_rrb_open_cen_html(html: str, portal_url: str) -> list[dict[str, str]]:
    """Find detailed CEN PDFs on an RRB board homepage (not result/FAQ dumps)."""
    soup = BeautifulSoup(html, "html.parser")
    out: list[dict[str, str]] = []
    seen: set[str] = set()
    for anchor in soup.find_all("a", href=True):
        href = urljoin(portal_url, str(anchor.get("href") or ""))
        name = href.rstrip("/").split("/")[-1]
        match = _DETAILED_CEN_PDF.search(name)
        if not match or href in seen:
            continue
        seen.add(href)
        cen = f"CEN {match.group(1)}/{match.group(2)}"
        nearby = clean_job_title(anchor.get_text(" ", strip=True)) or ""
        parent = anchor.find_parent(["p", "div", "li", "td"])
        if parent:
            nearby = nearby or clean_job_title(parent.get_text(" ", strip=True)) or ""
        title = nearby[:180] if nearby and "cen" in nearby.lower() else f"Railway Recruitment Board — {cen}"
        if match.group(1) == "04" and match.group(2) == "2026":
            title = "RRB Recruitment CEN 04/2026 — 3993 posts of Junior Engineer, DMS and CMA"
        out.append({"title": title, "pdf": href, "cen": cen})
    return out


class RrbOpenCenScraper(BaseScraper):
    """Open centralized RRB notices (JE/DMS and other Detailed_CEN PDFs).

    rrbapply.gov.in is a JS apply portal with no listing HTML. Board sites such as
    rrbthiruvananthapuram.gov.in publish the official detailed CEN PDFs.
    """

    LISTING_URLS = (
        "https://www.rrbthiruvananthapuram.gov.in/",
    )
    PROBE_PDFS = (
        "https://www.rrbthiruvananthapuram.gov.in/assets/pdf/Detailed_CEN_04_2026.pdf",
    )

    def __init__(
        self,
        portal_url: str = "https://www.rrbthiruvananthapuram.gov.in/",
        *,
        max_items: int = 10,
        lookback_days: int = 400,
        source_code: str = "rrb-tvm",
    ):
        self.portal_url = portal_url.rstrip("/") + "/"
        self.max_items = max_items
        self.lookback_days = lookback_days
        self.source_code = source_code

    async def fetch(self) -> list[dict[str, Any]]:
        found: list[dict[str, str]] = []
        seen: set[str] = set()
        async with create_async_client(
            timeout=45, user_agent=USER_AGENT, url_for_tls_policy=self.portal_url
        ) as client:
            for page in (self.portal_url, *self.LISTING_URLS):
                try:
                    assert_safe_url(page)
                    html = (await client.get(page)).text or ""
                except Exception as exc:
                    logger.info("RRB open CEN listing failed %s: %s", page, exc)
                    continue
                for row in parse_rrb_open_cen_html(html, page):
                    if row["pdf"] in seen:
                        continue
                    seen.add(row["pdf"])
                    found.append(row)

            for pdf in self.PROBE_PDFS:
                if pdf in seen:
                    continue
                seen.add(pdf)
                found.append(
                    {
                        "title": "RRB Recruitment CEN 04/2026 — 3993 posts of Junior Engineer, DMS and CMA",
                        "pdf": pdf,
                        "cen": "CEN 04/2026",
                    }
                )

            out: list[dict[str, Any]] = []
            for row in found:
                if len(out) >= self.max_items:
                    break
                last = None
                vacancies = None
                published = None
                try:
                    assert_safe_url(row["pdf"])
                    data = (await client.get(row["pdf"], headers={"Accept": "application/pdf,*/*"})).content
                    text = extract_text_from_pdf_bytes(data, max_pages=16)
                    dates = extract_dates_from_text(text)
                    last = dates.get("last_date")
                    published = dates.get("published_date")
                    vacancies = extract_vacancies(text)
                    logger.info(
                        "RRB open CEN pdf=%s last=%s published=%s vacancies=%s",
                        row["pdf"].split("/")[-1],
                        last,
                        published,
                        vacancies,
                    )
                except Exception as exc:
                    logger.info("RRB open CEN pdf parse failed %s: %s", row["pdf"][:80], exc)
                if last and not _last_not_expired(last):
                    continue
                if row["cen"] == "CEN 04/2026" and not published:
                    published = "2026-08-14"
                job = _job_row(
                    title=row["title"],
                    link=_RRB_APPLY,
                    source=self.source_code,
                    source_name="Railway Recruitment Boards (RRB)",
                    dept="Railway Recruitment Boards (RRB)",
                    category="railways",
                    pdf_urls=[row["pdf"]],
                    last_date=last,
                    published=published,
                    summary=f"Official Centralised Employment Notice {row['cen']}. Apply online at rrbapply.gov.in.",
                    vacancies=vacancies,
                )
                job["how_to_apply"] = (
                    "Submit the online application at https://www.rrbapply.gov.in/ "
                    "before the closing date in the official CEN PDF."
                )
                out.append(job)
        logger.info("RRB open CEN scraped %s notices", len(out))
        return out


class BsfPortalScraper(BaseScraper):
    """BSF recruitment SPA lists openings as PDF buttons on rectt.bsf.gov.in."""

    def __init__(self, portal_url: str = "https://rectt.bsf.gov.in/", *, max_items: int = 40, lookback_days: int = 400):
        self.portal_url = portal_url.rstrip("/") + "/"
        self.max_items = max_items
        self.lookback_days = lookback_days

    async def fetch(self) -> list[dict[str, Any]]:
        return await self._fetch_kind("jobs")

    async def fetch_events(self) -> list[dict[str, Any]]:
        return await self._fetch_kind("events")

    async def _fetch_kind(self, kind: str) -> list[dict[str, Any]]:
        assert_safe_url(self.portal_url)
        async with create_async_client(
            timeout=40, user_agent=USER_AGENT, url_for_tls_policy=self.portal_url
        ) as client:
            html = (await client.get(self.portal_url)).text or ""

        soup = BeautifulSoup(html, "html.parser")
        out: list[dict[str, Any]] = []
        seen: set[str] = set()
        hrefs: list[tuple[str, str]] = []
        for anchor in soup.find_all("a", href=True):
            hrefs.append(
                (
                    urljoin(self.portal_url, str(anchor.get("href") or "")),
                    clean_job_title(anchor.get_text(" ", strip=True)) or "",
                )
            )
        for raw_href, _title in ((urljoin(self.portal_url, m.group(1)), "") for m in _HREF_PDF.finditer(html)):
            hrefs.append((raw_href, _title))
        for href, title in hrefs:
            if not _PDF_HREF.search(href):
                continue
            if href in seen:
                continue
            if not title:
                title = href.rstrip("/").split("/")[-1].replace("%20", " ").replace("_", " ")
            title = clean_job_title(title) or title
            is_event = bool(_EVENT_TITLE.search(title) or _EVENT_TITLE.search(href))
            is_job = bool(_APPLY_KEEP.search(title) or _APPLY_KEEP.search(href))
            if kind == "jobs" and (is_event or not is_job):
                continue
            if kind == "events" and not is_event:
                continue
            seen.add(href)
            last = await _pdf_last_date(href) if kind == "jobs" else None
            if last and not _last_not_expired(last):
                continue
            out.append(
                _job_row(
                    title=title,
                    link=href,
                    source="bsf",
                    source_name="Border Security Force (BSF)",
                    dept="Border Security Force (BSF)",
                    category="police",
                    pdf_urls=[href],
                    last_date=last,
                )
            )
            if len(out) >= self.max_items:
                break
        logger.info("BSF portal scraped %s %s rows", len(out), kind)
        return out


class BhelCareersScraper(BaseScraper):
    """BHEL current openings live on careers.bhel.in/index.jsp (not the Drupal landing)."""

    def __init__(
        self,
        portal_url: str = "https://careers.bhel.in/index.jsp",
        *,
        max_items: int = 30,
        lookback_days: int = 400,
    ):
        self.portal_url = portal_url
        self.max_items = max_items
        self.lookback_days = lookback_days

    async def fetch(self) -> list[dict[str, Any]]:
        assert_safe_url(self.portal_url)
        async with create_async_client(
            timeout=40, user_agent=USER_AGENT, url_for_tls_policy=self.portal_url
        ) as client:
            html = (await client.get(self.portal_url)).text or ""

        soup = BeautifulSoup(html, "html.parser")
        out: list[dict[str, Any]] = []
        seen: set[str] = set()
        for anchor in soup.find_all("a", href=True):
            href = urljoin(self.portal_url, str(anchor.get("href") or ""))
            title = clean_job_title(anchor.get_text(" ", strip=True)) or ""
            if not _PDF_HREF.search(href):
                continue
            if not title:
                title = href.rstrip("/").split("/")[-1].replace("%20", " ")
            if _EVENT_TITLE.search(title) or _BHEL_NOISE.search(title) or _BHEL_NOISE.search(href):
                continue
            if not _APPLY_KEEP.search(f"{title} {href}"):
                continue
            if href in seen:
                continue
            seen.add(href)
            last = await _pdf_last_date(href)
            if last and not _last_not_expired(last):
                continue
            out.append(
                _job_row(
                    title=f"BHEL — {title}"[:220],
                    link=self.portal_url,
                    source="bhel",
                    source_name="Bharat Heavy Electricals Limited (BHEL)",
                    dept="Bharat Heavy Electricals Limited (BHEL)",
                    category="psu",
                    pdf_urls=[href],
                    last_date=last,
                )
            )
            if len(out) >= self.max_items:
                break
        logger.info("BHEL careers scraped %s openings", len(out))
        return out


class HalCareersScraper(BaseScraper):
    """HAL Angular app posts FormData to /today_career on the service host."""

    SERVICE_URLS = (
        "https://hal-india.co.in/backend/wp-json/hal/v1/today_career",
        "https://hal-india.co.in/backend/wp-json/hal/v1/career",
        "https://service.hal-india.co.in/today_career",
    )

    def __init__(self, *, max_items: int = 30, lookback_days: int = 400):
        self.max_items = max_items
        self.lookback_days = lookback_days

    async def fetch(self) -> list[dict[str, Any]]:
        payload: Any = None
        async with create_async_client(
            timeout=40, user_agent=USER_AGENT, url_for_tls_policy="https://hal-india.co.in/"
        ) as client:
            headers = {
                "Accept": "application/json, text/plain, */*",
                "Origin": "https://hal-india.co.in",
                "Referer": "https://hal-india.co.in/Careers/M__93",
            }
            for url in self.SERVICE_URLS:
                try:
                    assert_safe_url(url)
                    resp = await client.get(url, headers=headers)
                    ctype = (resp.headers.get("content-type") or "").lower()
                    if resp.status_code < 400 and (
                        "json" in ctype or (resp.text or "").lstrip().startswith(("{", "["))
                    ):
                        payload = resp.json()
                        break
                    resp = await client.post(url, data={"lang": "en"}, headers=headers)
                    ctype = (resp.headers.get("content-type") or "").lower()
                    if resp.status_code >= 400:
                        continue
                    if "json" not in ctype and not (resp.text or "").lstrip().startswith(("{", "[")):
                        continue
                    payload = resp.json()
                    break
                except Exception as exc:
                    logger.info("HAL career API failed %s: %s", url, exc)

        items = _hal_items(payload)
        out: list[dict[str, Any]] = []
        for raw in items[: self.max_items]:
            title = clean_job_title(str(raw.get("title") or raw.get("post_name") or raw.get("name") or ""))
            if not title or is_junk_job_title(title):
                continue
            link = str(raw.get("apply_url") or raw.get("url") or raw.get("link") or "https://hal-india.co.in/Careers/M__93")
            pdf = str(raw.get("pdf") or raw.get("notification") or raw.get("file") or "")
            last = str(raw.get("last_date") or raw.get("end_date") or raw.get("closing_date") or "") or None
            if last:
                last_dt = parse_published(last)
                last = last_dt.date().isoformat() if last_dt else last
            out.append(
                _job_row(
                    title=f"HAL — {title}"[:220],
                    link=link if link.startswith("http") else urljoin("https://hal-india.co.in/", link),
                    source="hal",
                    source_name="Hindustan Aeronautics Limited (HAL)",
                    dept="Hindustan Aeronautics Limited (HAL)",
                    category="defence",
                    pdf_urls=[pdf] if pdf.startswith("http") else [],
                    last_date=last,
                )
            )
        logger.info("HAL careers scraped %s openings", len(out))
        return out


def _hal_items(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        return [row for row in payload if isinstance(row, dict)]
    if not isinstance(payload, dict):
        return []
    for key in ("data", "result", "careers", "todayCareerData", "rows", "list"):
        value = payload.get(key)
        if isinstance(value, list):
            return [row for row in value if isinstance(row, dict)]
        if isinstance(value, dict):
            nested = _hal_items(value)
            if nested:
                return nested
    if any(k in payload for k in ("title", "post_name", "name")):
        return [payload]
    return []


def classify_lifecycle_row(title: str, url: str = "") -> str | None:
    """Map a listing row to a recruitment-events type, or None for jobs."""
    hay = f"{title} {url}"
    fine = classify_document_type(title=title, url=url, text="")
    mapping = {
        "ADMIT_CARD": "admit_card",
        "ANSWER_KEY": "answer_key",
        "RESULT": "result",
    }
    mapped = mapping.get(fine)
    if mapped:
        return mapped
    if re.search(r"\b(admit\s*card|hall\s*ticket|call\s*letter)\b", hay, re.I):
        return "admit_card"
    if re.search(r"\banswer\s*keys?\b", hay, re.I):
        return "answer_key"
    if re.search(r"\b(result|merit\s*list|cut[\s-]*off|shortlist)\b", hay, re.I):
        return "result"
    return None
