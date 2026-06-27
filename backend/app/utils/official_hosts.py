"""Recognize official recruitment hosts (gov + major PSU/bank career portals)."""

from __future__ import annotations

import re
from urllib.parse import urlparse

_BLOCKED_AGGREGATOR_NAMES = (
    "freejobalert",
    "sarkariresult",
    "sarkarijob",
    "sarkarinaukri",
    "governmentjob",
    "indgovtjobs",
    "rojgarresult",
    "jobriya",
    "fresherslive",
)
_BLOCKED_AGGREGATOR_PATTERN = "|".join(re.escape(name) for name in _BLOCKED_AGGREGATOR_NAMES)
_BLOCKED_AGGREGATOR = re.compile(r"(?:^|\.)(?:" + _BLOCKED_AGGREGATOR_PATTERN + r")\.", re.I)

_GOV_TLD = re.compile(r"\.(gov|nic|ac|org|res)\.in$", re.I)
_EDU_IN = re.compile(r"\.edu\.in$", re.I)
_ERNOM_IN = re.compile(r"\.ernet\.in$", re.I)
_BANK_IN = re.compile(r"\.bank\.in$", re.I)
_COOP_TLD = re.compile(r"\.coop$", re.I)
_GOOGLE_FILE_RE = re.compile(r"drive\.google\.com/file/d/|docs\.google\.com/forms/", re.I)
_SAIL_S3_RE = re.compile(r"aima-web-images\.s3\.ap-south-1\.amazonaws\.com/sailcareers\.com/", re.I)

# Career / notification portals (not .gov.in but official employers)
_OFFICIAL_STEMS = (
    "aaiclas.aero",
    "afspanchwati.com",
    "allahabadhighcourt.in",
    "andrewyule.com",
    "annauniv.edu",
    "aweil.in",
    "apprenticeshipindia.gov.in",
    "balmerlawrie.com",
    "bankofbaroda.co.in",
    "bankofbaroda.in",
    "bceceboard.bihar.gov.in",
    "bcclweb.in",
    "bfsissc.com",
    "bfuhs.ggsmch.org",
    "biharsports.org",
    "bobcaps.in",
    "braithwaiteindia.com",
    "bsnl.co.in",
    "canarabank.com",
    "careers.cdac.in",
    "careers.nfl.co.in",
    "cdac.in",
    "centralbankofindia.co.in",
    "coalindia.in",
    "cochinshipyard.in",
    "cswcrtiweb.org",
    "csu-puri.edu.in",
    "dicmedia.digitalindiacorporation.in",
    "dredge-india.com",
    "drdo.gov.in",
    "delhimetrorail.com",
    "demo-appiness.com",
    "dhsgsu.edu.in",
    "ecil.co.in",
    "eil.co.in",
    "employmentnews.gov.in",
    "fact.co.in",
    "fddiindia.com",
    "g03.tcsion.com",
    "glidersindia.com",
    "gujaratmetrorail.com",
    "hal-india.co.in",
    "hdfcbank.com",
    "hindustancopper.com",
    "hrrl.in",
    "hslvizag.in",
    "hpptcl.com",
    "ibps.in",
    "icar-crri.in",
    "icgeb.org",
    "icicibank.com",
    "iprcl.in",
    "icsi.edu",
    "idbi.bank.in",
    "ilpgt.com",
    "indianbank.in",
    "indianrailways.gov.in",
    "iob.in",
    "irctc.com",
    "isro.gov.in",
    "jkicds.com",
    "kksgovwc.org",
    "kvk4.in",
    "kochimetro.org",
    "konkanrailway.com",
    "kribhco.net",
    "kvafsu.edu.in",
    "licindia.in",
    "lifecarehll.com",
    "mahatransco.in",
    "mahanadicoal.in",
    "manipurpollution.org",
    "mmrcl.com",
    "mpmetrorail.com",
    "meconlimited.co.in",
    "midhani-india.in",
    "nabard.org",
    "nabcons.com",
    "nabfins.org",
    "nalcoindia.com",
    "ncdc.in",
    "nclcil.in",
    "ncrtc.co.in",
    "nhsrcindia.org",
    "nimhans.edu.in",
    "nitt.edu",
    "nplindia.in",
    "npcil.nic.in",
    "ntpc.co.in",
    "oil-india.com",
    "ongcindia.com",
    "optcl.co.in",
    "pcbassam.org",
    "pau.edu",
    "portals.secl-cil.in",
    "pnbindia.in",
    "pspcl.in",
    "purabi.coop",
    "punepeoples.bank.in",
    "rbi.org.in",
    "railtel.in",
    "railtelindia.com",
    "rcfltd.com",
    "recruitment.ggsmch.org",
    "recruitment.mmrcl.com",
    "recruitment.nhsrcindia.org",
    "recruitment.purabi.coop",
    "recruitment.thsti.in",
    "rites.com",
    "rvnl.org",
    "rrbapply.gov.in",
    "rrbcdg.gov.in",
    "sailcareers.com",
    "sainikschoolgoalpara.org",
    "sainikschooljhansi.com",
    "sbi.bank.in",
    "scdrc.chdadmnrectt.in",
    "secl-cil.in",
    "ssgopalganj.in",
    "stpi.in",
    "sbi.co.in",
    "sdclindia.com",
    "sebi.gov.in",
    "ssc.gov.in",
    "ssc.nic.in",
    "tcsion.com",
    "tezu.ernet.in",
    "theacms.in",
    "udupicsl.com",
    "unionbankofindia.co.in",
    "upsc.gov.in",
    "virtualofficeerp.com",
    "wbsetcl.in",
    "westerncoal.in",
    "yesbank.in",
)

_PSU_PREFIX = re.compile(
    r"^(www\.)?(upsc|ssc|rrb|ibps|isro|drdo|bel|coalindia|ntpc|nhai|esic|aiims|jipmer|nimhans|npcil|pib|bsnl|ecil|hal|ongc|oil|irctc|nfl|eil)\.",
    re.I,
)


def hostname_of(url: str) -> str:
    try:
        return (urlparse(url).hostname or "").lower()
    except Exception:
        return ""


def is_blocked_aggregator_host(url: str) -> bool:
    host = hostname_of(url)
    return bool(host and _BLOCKED_AGGREGATOR.search(host))


def is_official_recruitment_host(url: str) -> bool:
    if not url or url == "#":
        return False
    if is_blocked_aggregator_host(url):
        return False
    host = hostname_of(url)
    if not host:
        return False
    if _GOV_TLD.search(host) or host.endswith(".gov"):
        return True
    if _EDU_IN.search(host) or _ERNOM_IN.search(host):
        return True
    if _BANK_IN.search(host) or _COOP_TLD.search(host):
        return True
    if host in ("drive.google.com", "docs.google.com") and _GOOGLE_FILE_RE.search(url):
        return True
    if host == "forms.gle":
        return True
    if _SAIL_S3_RE.search(url):
        return True
    if _PSU_PREFIX.match(host):
        return True
    if host == "pib.gov.in" or host.endswith(".pib.gov.in"):
        return True
    for stem in _OFFICIAL_STEMS:
        if host == stem or host.endswith("." + stem):
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
