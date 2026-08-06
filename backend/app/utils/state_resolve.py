"""Resolve job state_codes from explicit fields, source ids, and text/host hints."""

from __future__ import annotations

import re
from typing import Any
from urllib.parse import urlparse

# Internal ids used by frontend STATES / browse filters.
VALID_STATE_IDS = frozenset(
    {
        "jk",
        "la",
        "hp",
        "pb",
        "hr",
        "dl",
        "ch",
        "uk",
        "rj",
        "up",
        "br",
        "sk",
        "wb",
        "as",
        "ar",
        "nl",
        "mn",
        "mz",
        "tr",
        "ml",
        "ne",
        "jh",
        "od",
        "mp",
        "cg",
        "gj",
        "dd",
        "mh",
        "ga",
        "tg",
        "ap",
        "ka",
        "kl",
        "ld",
        "tn",
        "py",
        "an",
    }
)

# State-wise AI employee buckets (same brain, different filters).
STATE_BUCKETS: dict[str, frozenset[str]] = {
    "north": frozenset({"jk", "la", "hp", "pb", "hr", "dl", "ch", "uk", "up", "rj"}),
    "west": frozenset({"gj", "mh", "ga", "dd"}),
    "south": frozenset({"tg", "ap", "ka", "kl", "tn", "py", "ld"}),
    "east": frozenset({"br", "wb", "jh", "od", "an"}),
    "northeast": frozenset({"as", "ar", "nl", "mn", "mz", "tr", "ml", "sk", "ne"}),
    "central": frozenset({"mp", "cg"}),
    # Empty set = jobs with no state tag (All-India / central / banking / rail).
    "all-india": frozenset(),
}

# Longest-match host/org hints (order matters — more specific first).
_HOST_STATE_HINTS: list[tuple[str, str | None]] = [
    ("keralapsc", "kl"),
    ("kerala", "kl"),
    ("tamilnadupsc", "tn"),
    ("tnpsc", "tn"),
    ("mpsc.gov", "mh"),
    ("maharashtra", "mh"),
    ("upsc.gov", None),
    ("ssc.nic", None),
    ("isro.gov", None),
    ("jpsc.gov", "jh"),
    ("jharkhand", "jh"),
    ("apsc.nic", "as"),
    ("assam", "as"),
    ("wbpsc", "wb"),
    ("west bengal", "wb"),
    ("gpsc.gujarat", "gj"),
    ("gujarat", "gj"),
    ("kpsc.kar", "ka"),
    ("karnataka", "ka"),
    ("tspsc", "tg"),
    ("telangana", "tg"),
    ("appsc.gov", "ap"),
    ("andhra pradesh", "ap"),
    ("opsc.gov", "od"),
    ("ossc.gov", "od"),
    ("odisha", "od"),
    ("mppsc", "mp"),
    ("madhya pradesh", "mp"),
    ("ppsc.gov", "pb"),
    ("punjab", "pb"),
    ("hpsc.gov", "hp"),
    ("himachal", "hp"),
    ("ukpsc", "uk"),
    ("uttarakhand", "uk"),
    ("uppsc", "up"),
    ("uttar pradesh", "up"),
    ("bpsc.bih", "br"),
    ("bihar", "br"),
    ("rpsc.raj", "rj"),
    ("rajasthan", "rj"),
    ("cgpsc", "cg"),
    ("chhattisgarh", "cg"),
    ("delhi", "dl"),
    ("dsssb", "dl"),
    ("goa", "ga"),
    ("mizoram", "mz"),
    ("manipur", "mn"),
    ("nagaland", "nl"),
    ("meghalaya", "ml"),
    ("tripura", "tr"),
    ("arunachal", "ar"),
    ("sikkim", "sk"),
    ("raigarh", "cg"),
    ("paradip", "od"),
    ("chandigarh", "ch"),
    ("mohali", "pb"),
    ("madras", "tn"),
    ("chennai", "tn"),
    ("tezpur", "as"),
]

_NAME_TO_CODE: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"\buttar\s+pradesh\b|\buppsc\b|\bupsssc\b", re.I), "up"),
    (re.compile(r"\bmadhya\s+pradesh\b|\bmppsc\b", re.I), "mp"),
    (re.compile(r"\bandhra\s+pradesh\b|\bappsc\b", re.I), "ap"),
    (re.compile(r"\btelangana\b|\btspsc\b", re.I), "tg"),
    (re.compile(r"\btamil\s+nadu\b|\btnpsc\b", re.I), "tn"),
    (re.compile(r"\bkarnataka\b|\bkpsc\b", re.I), "ka"),
    (re.compile(r"\bkerala\b", re.I), "kl"),
    (re.compile(r"\bmaharashtra\b|\bmpsc\b", re.I), "mh"),
    (re.compile(r"\bgujarat\b|\bgpsc\b", re.I), "gj"),
    (re.compile(r"\brajasthan\b|\brpsc\b", re.I), "rj"),
    (re.compile(r"\bbihar\b|\bbpsc\b", re.I), "br"),
    (re.compile(r"\bwest\s+bengal\b|\bwbpsc\b", re.I), "wb"),
    (re.compile(r"\bodisha\b|\bopsc\b|\bossc\b", re.I), "od"),
    (re.compile(r"\bjharkhand\b|\bjpsc\b", re.I), "jh"),
    (re.compile(r"\bchhattisgarh\b|\bcgpsc\b|\braigarh\b", re.I), "cg"),
    (re.compile(r"\buttarakhand\b|\bukpsc\b", re.I), "uk"),
    (re.compile(r"\bpunjab\b|\bppsc\b|\bmohali\b", re.I), "pb"),
    (re.compile(r"\bharyana\b|\bhpsc\b", re.I), "hr"),
    (re.compile(r"\bhimachal\b|\bhppsc\b", re.I), "hp"),
    (re.compile(r"\bdelhi\b|\bdsssb\b", re.I), "dl"),
    (re.compile(r"\bassam\b|\bapsc\b|\btezpur\b", re.I), "as"),
    (re.compile(r"\bchandigarh\b", re.I), "ch"),
]


def normalize_state_codes(codes: Any) -> list[str]:
    if not codes:
        return []
    out: list[str] = []
    for c in codes:
        code = str(c or "").strip().lower()[:8]
        if code in ("all", "all india", "india", ""):
            continue
        if code in VALID_STATE_IDS and code not in out:
            out.append(code)
    return out


def _from_source_code(source: str) -> list[str]:
    code = str(source or "").lower()
    if code.startswith("psc-"):
        st = code[4:8]
        if st in VALID_STATE_IDS:
            return [st]
    m = re.match(r"^([a-z]{2})-rss$", code)
    if m and m.group(1) in VALID_STATE_IDS:
        return [m.group(1)]
    return []


def _from_host_probe(probe: str) -> list[str]:
    p = str(probe or "").lower()
    if not p:
        return []
    for hint, state_id in _HOST_STATE_HINTS:
        if hint in p:
            return [state_id] if state_id else []
    for pattern, state_id in _NAME_TO_CODE:
        if pattern.search(p):
            return [state_id]
    return []


def resolve_state_codes(
    *,
    state_codes: Any = None,
    title: str = "",
    dept: str = "",
    source: str = "",
    apply_url: str = "",
    source_url: str = "",
    primary_pdf_url: str = "",
    notification_url: str = "",
) -> list[str]:
    """Resolve browse state tags. Empty list = All-India / untagged central."""
    explicit = normalize_state_codes(state_codes)
    if explicit:
        return explicit

    from_source = _from_source_code(source)
    if from_source:
        return from_source

    hosts: list[str] = []
    for url in (apply_url, source_url, primary_pdf_url, notification_url):
        try:
            host = urlparse(str(url or "")).netloc.lower()
        except Exception:
            host = ""
        if host:
            hosts.append(host)

    probe = " ".join(
        [
            str(dept or ""),
            str(title or ""),
            str(source or ""),
            *hosts,
        ]
    )
    return _from_host_probe(probe)


def job_matches_bucket(state_codes: list[str], bucket: str) -> bool:
    """True when job belongs to a named AI employee bucket."""
    key = str(bucket or "").strip().lower()
    if key in ("", "all", "*"):
        return True
    if key not in STATE_BUCKETS:
        # Treat as single state id
        if key in VALID_STATE_IDS:
            return key in normalize_state_codes(state_codes)
        return False
    wanted = STATE_BUCKETS[key]
    codes = normalize_state_codes(state_codes)
    if key == "all-india":
        return len(codes) == 0
    if not codes:
        return False
    return bool(set(codes) & wanted)
