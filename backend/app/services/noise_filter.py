"""Clean and classify job titles scraped from gov portals."""

import re
from html import unescape
from urllib.parse import urlparse

from bs4 import BeautifulSoup

# Portal menu / section links — not job notifications
_PORTAL_NAV_TITLE = re.compile(
    r"^(apply\s+online|notifications?|advertisements?|examination\s+syllabus|"
    r"recruitment\s+calendar|results?|tenders?\s*(?:&|and)\s*quotations?|"
    r"previous\s+question\s+papers?|important\s+orders?|download\s+admission\s+certificate|"
    r"role\s+and\s+functions|vision\s*(?:&|and)\s*mission|compendium\s+of\s+rules|"
    r"query\s+management|attestation|transparency|disclosure\s+under\s+rti|"
    r"commission\s*(?:&|and)\s*incumbency|promotion\s*(?:&|and)\s*disciplinary|"
    r"officers\s+in\b|rejection\s+notice|archive|view\s+archive|whats\s+new|"
    r"recruitment\s+notices?|syllabus|calendar|forms?(?:\s+download)?|downloads?|"
    r"faq|help|about\s+us|contact(?:\s+us)?|home|login|sign\s*up|sitemap|"
    r"governing\s+board|policies|rules|guidelines|circulars\s+withdrawn|"
    r"news\s*(?:&|and)\s*events|careers?|tenders?|gallery|tourism|"
    r"old\s+questions|answer\s+key|personal\s+interview|valid\s*/?\s*rejected\s+list|"
    r"direct\s+syllabus|rules\s+and\s+regulations|history\s+of\b|composition\s+of\b|"
    r"functions\s+of\b|biometric|attendance|photo\s+attendance|"
    r"submission\s+of\s+the\s+offline\s+application\s+form|"
    r"^direct\s+recruitment$|^schedule\s+of\s+examinations|^departmental\s+notification$|"
    r"^examination$|^question\s+departmental|^valid\s*/?\s*rejected\s+lists|"
    r"^lde\s+(results|schedule)|^officers\s+in\b|constitutional\s+provision|"
    r"^biodata\s+of\b|public\s+service\s+commission$)",
    re.I,
)

_GENERIC_SECTION_URL = re.compile(r"/Pages/View_(?:Content|Archive)\.aspx\?id=", re.I)

_JOB_HINT = re.compile(
    r"\d|post|vacanc|group|assistant|clerk|constable|engineer|teacher|"
    r"officer|exam|bharti|recruit|notification\s+(?:no|for)|advt|direct\s+recruit|"
    r"apprentice|resident|specialist|selection|engagement|bharti|naukri",
    re.I,
)

_PDF_SIZE_SUFFIX = re.compile(r"[\s\-–—]*PDF\s*size:\s*\([^)]*\)\s*\.?\s*$", re.I)

_TENDER = re.compile(
    r"\be-?tenders?\b|\btenders?\b|\bprocurement\b|\bquotations?\b|\brfp\b|"
    r"bid\s+invit|\bnotice\s+tender\b|\bvendor\s+for\b",
    re.I,
)
_TENDER_URL = re.compile(
    r"/tenders?(?:/|$|\?|s\b)|/e-?tender|/procurement|downloadtender",
    re.I,
)

_GOV_ADMIN_NOISE = re.compile(
    r"certificate\s+no\.?\s*rc\d|"
    r"appeal\s+no\.?\s*\d+\s+of\s+\d+|"
    r"foreign\s+visits\s+undertaken|"
    r"details\s+of\s+foreign\s+visits|"
    r"pension\s*&\s*group\s*schemes|"
    r"general\s+remittance\s+order|"
    r"remittance\s+order\s+dated|"
    r"withdrawn\s+products$|"
    r"achievements\s+of\s+department\s+of\s+space|"
    r"soil\s+moisture\s+products|"
    r"geomagnetic\s+disturbances|"
    r"on-?orbit\s+observations|"
    r"\bcopyright\b.*\b(?:designed|developed)\b|"
    r"\btoll\s*[- ]?free\s+helpline\b|"
    r"\btrade\s+fair\b|"
    r"\bcounselling\s+results\s+declared\b|"
    r"\bwaiting\s+list\s+for\s+offline\b|"
    r"\bimplementation\s+of\s+multiple\s+nav|"
    r"\bremittance\s+advice\b|"
    r"\bdefaulter\b.*\bpan\b|"
    r"\brecovery\s+certificate\b|"
    r"\bnotice\s+of\s+demand\b|"
    r"\bmatter\s+of\s+investigation\b|"
    r"\bisro\s+(?:showcased|conducts|inaugurat)|"
    r"\bmission\s+life\s+of\s+\d+\s+years\b|"
    r"\bsuccessfully\s+completed\s+its\s+mission\b|"
    r"\bsea\s+level\s+test\s+of\s+cryogenic\b|"
    r"\bawareness\s+training\s*\(\s*start\b|"
    r"\bpaid\s+internship\b|"
    r"इंटर्नश|सशुल्क\s+इंटर्नश",
    re.I,
)

# Bare portal chrome ("Online Registration extended till …") — not a named recruitment.
# Keep out of _GOV_ADMIN_NOISE so real titles like "SSC CGL Recruitment — Online
# Registration extended till …" still pass looks_like_job_notification.
_BARE_REGISTRATION_EXTENSION = re.compile(
    r"^online\s+registration\s+extended\s+(?:till|until|upto|up\s+to|to)\b",
    re.I,
)

_JUNK_TITLE = re.compile(
    r"^application\s+form\b|^download\b|^click\s+here\b|^view\b|^pdf\b|"
    r"^english\s*\(|^hindi\s*\(|^notification$|^form$|"
    r"chairman,?\s|pu\s+r\.?\s*lalram|old\s+questions|answer\s+key\s+\d{4}|"
    r"^question\s+departmental|^schedule\s+of\s+examinations|^direct\s+recruitment$|"
    r"^departmental\s+notification$|^examination$|^lde\s+results|"
    r"^valid\s*/?\s*rejected\s+lists|constitutional\s+provision|^biodata\s+of\b|"
    r"public\s+service\s+commission$|^recruitmentfile$|previous\s+year\s+question|"
    r"sample\s+question|examination\s+rules|instructions?\s+to\s+candidat|"
    r"postwise\s+syllabus|judgements?\s+related|diabetic\s+manual|rechecking\s+of|"
    r"tentative\s+schedule|departmental\s+notification\d|conduct\s+of\s+examinations|"
    r"screening\s+notification\s+[ng]{1,2}$|^schedule\s+of\s+examination|"
    r"status\s+of\s+(?:lateral\s+)?recruitment|stock\s+exchange|great\s+place\s+to\s+work|"
    r"^demo\s+files|question\s+paper\s+for\s+descriptive|scheme\s+of\s+examinations\s+for\s+all",
    re.I,
)

_WEAK_LINK_TEXT = re.compile(
    r"^(english|hindi|tamil|telugu|bengali|marathi|gujarati|kannada|malayalam|punjabi|"
    r"odia|assamese|urdu)(\s*[\(\[]?\s*\d|\s*$)",
    re.I,
)

# Friendly department labels from scraper registry codes
SOURCE_LABELS: dict[str, str] = {
    "esic": "ESIC — Employees' State Insurance Corporation",
    "isro-rss": "ISRO — Indian Space Research Organisation",
    "isro": "ISRO — Indian Space Research Organisation",
    "upsc-rss": "Union Public Service Commission (UPSC)",
    "ssc-rss": "Staff Selection Commission (SSC)",
    "ibps-rss": "Institute of Banking Personnel Selection (IBPS)",
    "pib-rss": "Press Information Bureau (PIB)",
    "employment-news-rss": "Employment News",
    "railway-rss": "Railway Recruitment Boards",
    "niti": "NITI Aayog",
}


def is_tender_or_procurement(title: str | None = None, url: str | None = None) -> bool:
    """Procurement / e-tender notices — not recruitment jobs."""
    t = clean_job_title(title)
    if t and _TENDER.search(t):
        return True
    if url and _TENDER_URL.search(url):
        return True
    return False


_POSTGRES_CONTROL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")


def strip_postgres_control_chars(text: str | None) -> str:
    """Remove NUL and other control chars Postgres TEXT/JSONB cannot store."""
    if not text:
        return ""
    return _POSTGRES_CONTROL.sub("", text)


_HTML_TAG = re.compile(r"</?[a-z][^>]*>", re.I)
_NON_TEXT_KEYS = {
    "apply_url",
    "href",
    "notification_url",
    "pdf_url",
    "primary_pdf_url",
    "source_url",
    "url",
}


def contains_html_markup(value: str | None) -> bool:
    """Return True when a persisted display value still contains an HTML tag."""
    return bool(value and _HTML_TAG.search(value))


def clean_plain_text(value: str | None) -> str:
    """Convert scraped display content to normalized plain text."""
    raw = strip_postgres_control_chars(value).strip()
    if not raw:
        return ""
    if contains_html_markup(raw):
        soup = BeautifulSoup(raw, "html.parser")
        for hidden in soup(["script", "style"]):
            hidden.decompose()
        text = soup.get_text(" ", strip=True)
    else:
        text = unescape(raw)
    return re.sub(r"\s+", " ", text).strip()


def sanitize_source_text_fields(value, *, field_name: str | None = None):
    """Recursively remove source HTML while preserving URL-valued fields."""
    if isinstance(value, str):
        if field_name and (
            field_name.lower() in _NON_TEXT_KEYS
            or field_name.lower().endswith("_url")
            or field_name.lower().endswith("_urls")
            or field_name.lower().endswith("urls")
        ):
            return strip_postgres_control_chars(value).strip()
        return clean_plain_text(value)
    if isinstance(value, dict):
        return {
            key: sanitize_source_text_fields(item, field_name=str(key))
            for key, item in value.items()
        }
    if isinstance(value, list):
        return [sanitize_source_text_fields(item, field_name=field_name) for item in value]
    return value


def sanitize_json_for_postgres(value):
    """Recursively strip control characters from strings in JSON-bound dicts/lists."""
    if isinstance(value, str):
        return strip_postgres_control_chars(value)
    if isinstance(value, dict):
        return {k: sanitize_json_for_postgres(v) for k, v in value.items()}
    if isinstance(value, list):
        return [sanitize_json_for_postgres(v) for v in value]
    return value


def clean_job_title(title: str | None) -> str:
    """Strip portal chrome (Read More, PDFsize suffixes, stray punctuation)."""
    t = clean_plain_text(title)
    if not t:
        return ""
    t = re.sub(r"\s*Read\s+More\s*$", "", t, flags=re.I)
    t = re.sub(
        r"\s+Click\s+Here\s+to\s+(?:Apply\s+Online|Download(?:\s+the)?\s+(?:Form|Notification|Advertisement|PDF)).*$",
        "",
        t,
        flags=re.I,
    )
    t = _PDF_SIZE_SUFFIX.sub("", t)
    t = re.sub(r"[\s\-–—]*PDF\s*size:\s*\(\)\s*\.?\s*$", "", t, flags=re.I)
    t = re.sub(r"[\s\-–—]*PDF\s*$", "", t, flags=re.I)
    # "Advt. No. HSFC:01:RMT:2026 Dated.10.08.2026 Recruitment of …" → keep the real title
    stripped = re.sub(
        r"^(?:Advt\.?\s*No\.?\s*[:\-]?\s*[A-Za-z0-9:()/_./\-]+\s*)+(?:Dated?\.?\s*[\d./\-]+\s*)?",
        "",
        t,
        flags=re.I,
    ).strip(" .-–—")
    if len(stripped) >= 24 and _JOB_HINT.search(stripped):
        t = stripped
    t = re.sub(r"\s+", " ", t).strip(" .-–—")
    return t


def is_portal_nav_title(title: str | None) -> bool:
    t = clean_job_title(title)
    if not t or len(t) < 6:
        return True
    if _PORTAL_NAV_TITLE.match(t):
        return True
    if len(t) < 24 and not _JOB_HINT.search(t):
        return True
    return False


def is_junk_job_title(title: str | None, url: str | None = None) -> bool:
    """True when anchor text is not a real recruitment notification title."""
    t = clean_job_title(title)
    if not t or len(t) < 10:
        return True
    if is_tender_or_procurement(t, url):
        return True
    if is_portal_nav_title(t):
        return True
    if _JUNK_TITLE.search(t):
        return True
    if _WEAK_LINK_TEXT.match(t):
        return True
    if re.search(r"pdf\s*size", t, re.I):
        return True
    # Truncated scrape fragments (e.g. "ng direct recruitment")
    if re.match(r"^[a-z]{1,3}\s", t) and not re.search(r"\d", t):
        return True
    if re.search(r"\s+g$", t) and len(t) < 30:
        return True
    return False


_RESULT_ARCHIVE = re.compile(
    r"validity\s+of\s+(?:the\s+)?selection|shortlisting\s+of\s+candidates|"
    r"document\s+verification|dv\s+schedule|answer\s+key|marksheet|"
    r"roll\s*no\.?\s*roll|sl\.?\s*no\.?\s*roll|tentative\s+exam\s+date|"
    r"schedule\s+of\s+(?:document\s+verification|dv)|written\s+examination\s*\(objective\)|"
    r"final\s+result\s+of|result\s+notification\s+of|list\s+of\s+applications\s+found|"
    r"provisional\s+panel|frequently\s+asked\s+questions|\bfaq\b|"
    r"cutoff\s+marks|cut-?off\s+marks",
    re.I,
)


def is_result_archive_listing(title: str | None, url: str | None = None) -> bool:
    """DV schedules, roll lists, answer keys — not open recruitments."""
    t = clean_job_title(title)
    if not t:
        return False
    if _RESULT_ARCHIVE.search(t):
        return True
    probe = f"{t} {url or ''}"
    if re.search(r"roll\s*no|answer\s*key|dv\s+schedule|marksheet", probe, re.I):
        if not re.search(r"\d+\s+posts?|recruit(?:ment)?\s+of|vacanc|notification\s+for", probe, re.I):
            return True
    return False


_STRONG_JOB = re.compile(
    r"advt\.?\s*no|notification\s+(?:no\.?|for|\d{4})|vacanc|"
    r"\d+\s+posts?|recruit(?:ment)?\s+of|direct\s+recruit|apprentice|"
    r"result\s+of\s+.+\s+(?:examination|exam)|written\s+examination|"
    r"interview\s+dated|senior\s+resident|selection\s+panel|postponement\s+of|"
    r"group[\s-]*[civ\d]+|assistant\s+director|constable|clerk|teacher",
    re.I,
)


def looks_like_job_notification(title: str | None, url: str | None = None) -> bool:
    """Stricter check — title reads like an actual vacancy/result notice, not a portal page."""
    t = clean_job_title(title)
    if t and _GOV_ADMIN_NOISE.search(t):
        return False
    # Digit-only extension headlines match _JOB_HINT via the date; still not a job.
    if t and _BARE_REGISTRATION_EXTENSION.match(t) and not _STRONG_JOB.search(t):
        return False
    if is_tender_or_procurement(t, url):
        return False
    if is_junk_job_title(t, url):
        return False
    if _STRONG_JOB.search(t):
        return True
    if len(t) >= 42 and _JOB_HINT.search(t):
        return True
    return False


def is_portal_section_link(title: str | None, url: str | None) -> bool:
    if is_junk_job_title(title):
        return True
    if url and _GENERIC_SECTION_URL.search(url) and len(clean_job_title(title)) < 40:
        if not _JOB_HINT.search(title or ""):
            return True
    try:
        parsed = urlparse(url or "")
        path = (parsed.path or "").rstrip("/")
        if path in ("", "/") and is_portal_nav_title(title):
            return True
        # Generic recruitment listing pages without a specific notification
        if path.rstrip("/").endswith("/recruitmentfile") and is_junk_job_title(title):
            return True
    except Exception:
        pass
    return False


def friendly_dept(raw: dict, source_code: str | None = None) -> str:
    """Human-readable department — not raw hostname."""
    if raw.get("sourceName") and not str(raw["sourceName"]).startswith("www."):
        return str(raw["sourceName"])
    code = source_code or raw.get("source") or ""
    if code in SOURCE_LABELS:
        return SOURCE_LABELS[code]
    dept = raw.get("dept") or ""
    if dept.startswith("www."):
        dept = dept[4:]
    for suffix in (".gov.in", ".nic.in", ".ac.in", ".org.in"):
        if dept.endswith(suffix):
            dept = dept[: -len(suffix)]
    dept = dept.replace("-", " ").replace(".", " ").strip()
    if dept:
        return dept.upper() if len(dept) <= 6 else dept.title()
    return "Official notification"


def friendly_dept_from_host(host: str) -> str:
    h = (host or "").lower().replace("www.", "")
    for code, label in SOURCE_LABELS.items():
        if code.replace("-rss", "") in h:
            return label
    host_labels = {
        "mpsc.gov.in": "Maharashtra Public Service Commission (MPSC)",
        "upsc.gov.in": SOURCE_LABELS["upsc-rss"],
        "ssc.nic.in": SOURCE_LABELS["ssc-rss"],
        "ibps.in": SOURCE_LABELS["ibps-rss"],
    }
    for key, label in host_labels.items():
        if key in h:
            return label
    stem = h.replace(".gov.in", "").replace(".nic.in", "").replace(".ac.in", "").replace(".org.in", "")
    return stem.replace("-", " ").replace(".", " ").title() or "Official notification"
