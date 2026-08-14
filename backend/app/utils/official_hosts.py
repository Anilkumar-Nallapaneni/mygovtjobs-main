"""Recognize official recruitment hosts (gov + major PSU/bank career portals).

Host allow/block lists are loaded from shared/official-hosts.json so frontend,
backend, and audit scripts stay aligned.
"""

from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path
from urllib.parse import urlparse

_REPO_ROOT = Path(__file__).resolve().parents[3]
_SHARED_HOSTS_PATH = _REPO_ROOT / "shared" / "official-hosts.json"


@lru_cache(maxsize=1)
def _catalog() -> dict:
    return json.loads(_SHARED_HOSTS_PATH.read_text(encoding="utf-8"))


def _blocked_host_re() -> re.Pattern[str]:
    names = list(_catalog()["blockedAggregators"]) + list(_catalog()["blockedCommercialBoards"])
    pattern = "|".join(re.escape(name) for name in names)
    return re.compile(rf"(?:^|\.)(?:{pattern})\.", re.I)


def _psu_prefix_re() -> re.Pattern[str]:
    prefixes = "|".join(re.escape(p) for p in _catalog()["psuPrefixes"])
    return re.compile(rf"^(www\.)?(?:{prefixes})\.", re.I)


_GOV_TLD = re.compile(r"\.(gov|nic|ac|org|res|edu)\.in$", re.I)
_ERNET_IN = re.compile(r"\.ernet\.in$", re.I)
_BANK_IN = re.compile(r"\.bank\.in$", re.I)
_COOP_TLD = re.compile(r"\.coop$", re.I)
_GOOGLE_FILE_RE = re.compile(r"drive\.google\.com/file/d/|docs\.google\.com/forms/", re.I)
_FORMS_SHORT_RE = re.compile(r"^https?://(www\.)?forms\.gle/", re.I)
_SAIL_S3_RE = re.compile(r"aima-web-images\.s3\.ap-south-1\.amazonaws\.com/sailcareers\.com/", re.I)
_GOV_CC_TLD = re.compile(r"\.gov\.[a-z]{2,}$", re.I)


def hostname_of(url: str) -> str:
    try:
        return (urlparse(url).hostname or "").lower()
    except Exception:
        return ""


def is_blocked_aggregator_host(url: str) -> bool:
    host = hostname_of(url)
    return bool(host and _blocked_host_re().search(host))


def is_official_recruitment_host(url: str) -> bool:
    if not url or url == "#":
        return False
    if is_blocked_aggregator_host(url):
        return False
    host = hostname_of(url)
    if not host:
        return False
    if _GOV_TLD.search(host) or host.endswith(".gov") or _GOV_CC_TLD.search(host):
        return True
    if _ERNET_IN.search(host) or _BANK_IN.search(host) or _COOP_TLD.search(host):
        return True
    if host in ("drive.google.com", "docs.google.com") and _GOOGLE_FILE_RE.search(url):
        return True
    if host == "forms.gle" or _FORMS_SHORT_RE.search(url):
        return True
    if _SAIL_S3_RE.search(url):
        return True
    if _psu_prefix_re().match(host):
        return True
    if host == "pib.gov.in" or host.endswith(".pib.gov.in"):
        return True
    for stem in _catalog()["officialStems"]:
        if host == stem or host.endswith("." + stem):
            return True
    # Hindi / IDN government hosts (punycode) serving DRDO, NIC, etc.
    path = (urlparse(url).path or "").lower()
    if "xn--" in host and re.search(r"/(drdo|nic|gov)/", path):
        return True
    return False


_PDF_PATH = re.compile(
    r"\.pdf(\?|#|$)|/pdf/|/writereaddata/|/documents/|/attachments/|/uploads/|notification.*\.pdf|advt.*\.pdf",
    re.I,
)
_PDF_VIEWER = re.compile(r"viewpdf\.aspx|viewfile\.aspx|getfile\.aspx", re.I)


def looks_like_notification_document(url: str) -> bool:
    if not url:
        return False
    low = url.lower()
    if ".pdf" in low:
        return True
    if _PDF_VIEWER.search(url):
        return True
    return bool(_PDF_PATH.search(url))


def collect_official_pdf_urls(detail: dict, apply_url: str | None = None) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []

    def add(u: str | None) -> None:
        if not u or not isinstance(u, str):
            return
        u = u.strip()
        if not u or u in seen:
            return
        if not is_official_recruitment_host(u) or not looks_like_notification_document(u):
            return
        seen.add(u)
        out.append(u)

    for key in ("pdf_url", "pdfUrl", "notification_url"):
        add(detail.get(key))
    for key in ("pdf_urls", "pdfUrls"):
        raw = detail.get(key)
        if isinstance(raw, list):
            for item in raw:
                add(item if isinstance(item, str) else None)
    if apply_url:
        add(apply_url)
    return out


def pick_best_official_url(urls: list[str]) -> str | None:
    """Prefer apply/careers/notification paths over generic homepages."""
    clean = [u for u in urls if is_official_recruitment_host(u)]
    if not clean:
        return None

    def score(u: str) -> int:
        low = u.lower()
        s = 0
        if low.endswith(".pdf") or ".pdf?" in low:
            s -= 100
        if re.search(r"apply|recruit|career|notification|advt|register|online|login", low):
            s += 10
        if "/career" in low or "/recruit" in low or "/apply" in low:
            s += 8
        if low.count("/") > 4:
            s += 2
        return s

    html = [u for u in clean if not (u.lower().endswith(".pdf") or ".pdf?" in u.lower())]
    pool = html or clean
    return max(pool, key=score)
