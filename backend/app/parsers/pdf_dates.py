"""Extract notification (posted) and last (apply-by) dates from PDF / notice text."""

from __future__ import annotations

import re
from datetime import date, datetime, timedelta, timezone
from typing import Any

from app.scrapers.date_utils import parse_published
from app.services.job_persist_service import _parse_date

_OCR_DAY_TRANS = str.maketrans({"l": "1", "I": "1", "O": "0", "o": "0"})

_MONTH_NAME = (
    r"(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|"
    r"Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)"
)
_MONTH_LOOKUP = {
    "jan": 1, "january": 1, "feb": 2, "february": 2, "mar": 3, "march": 3,
    "apr": 4, "april": 4, "may": 5, "jun": 6, "june": 6, "jul": 7, "july": 7,
    "aug": 8, "august": 8, "sep": 9, "sept": 9, "september": 9,
    "oct": 10, "october": 10, "nov": 11, "november": 11, "dec": 12, "december": 12,
}

_DATE_TOKEN = re.compile(
    r"([l1I\d]{1,2})[./\s-](\d{1,2})[./\s-](\d{2,4})",
)
_DATE_MONTH_TOKEN = re.compile(
    rf"(\d{{1,2}})(?:st|nd|rd|th)?[\s,\-]+({_MONTH_NAME})[\s,\-]+(\d{{2,4}})",
    re.I,
)
_DATE_RANGE = re.compile(
    r"(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})\s*(?:TO|–|—|-)\s*(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})",
    re.I,
)
_DATE_RANGE_MONTH = re.compile(
    rf"(?:from|between)\s+"
    rf"(\d{{1,2}}(?:st|nd|rd|th)?[\s,\-]+{_MONTH_NAME}[\s,\-]+\d{{2,4}})"
    rf"\s*(?:to|–|—|-|and)\s+"
    rf"(\d{{1,2}}(?:st|nd|rd|th)?[\s,\-]+{_MONTH_NAME}[\s,\-]+\d{{2,4}})",
    re.I,
)
_DATED_LINE = re.compile(
    r"Dated\s*:\s*([l1I\d]{1,2})\s*[.\s/-]+\s*(\d{1,2})\s*[.\s/-]+\s*(\d{4})",
    re.I,
)
_PUBLISHED_PATTERNS = (
    re.compile(
        r"(?:notification\s+date|date\s+of\s+notification|issue\s+date|"
        r"published\s+on|advertisement\s+date|advt\.?\s+date|opening\s+date|"
        r"start\s+date\s+of\s+(?:online\s+)?application)[:\s]+"
        r"(\d{1,2}[./\s-]\d{1,2}[./\s-]\d{2,4})",
        re.I,
    ),
    re.compile(
        rf"(?:notification\s+date|date\s+of\s+notification|issue\s+date|"
        rf"published\s+on|advertisement\s+date|advt\.?\s+date|opening\s+date|"
        rf"start\s+date\s+of\s+(?:online\s+)?application)[:\s]+"
        rf"(\d{{1,2}}(?:st|nd|rd|th)?[\s,\-]+{_MONTH_NAME}[\s,\-]+\d{{2,4}})",
        re.I,
    ),
    re.compile(r"\bdated\s+(\d{1,2})[.\s/-](\d{1,2})[.\s/-](\d{4})\b", re.I),
    re.compile(
        rf"\bdated\s+(\d{{1,2}}(?:st|nd|rd|th)?[\s,\-/]+{_MONTH_NAME}[\s,\-/]+\d{{2,4}})\b",
        re.I,
    ),
    _DATED_LINE,
    re.compile(r"Date\s*:\s*(\d{1,2}[./-]\d{1,2}[./-]\d{4})", re.I),
    re.compile(
        r"opening\s+date(?:\s+of\s+online\s+application)?[^\d]{0,160}"
        r"(\d{1,2}[./-]\d{1,2}[./-]20\d{2})",
        re.I,
    ),
)
_LAST_PATTERNS = (
    re.compile(
        r"apply\s+online[\s\S]{0,220}?on\s+or\s+before\s+(\d{1,2}[./-]\d{1,2}[./-]\d{4})",
        re.I,
    ),
    re.compile(
        rf"apply\s+online[\s\S]{{0,220}}?on\s+or\s+before\s+"
        rf"(\d{{1,2}}(?:st|nd|rd|th)?[\s,\-]+{_MONTH_NAME}[\s,\-]+\d{{2,4}})",
        re.I,
    ),
    re.compile(
        r"(?:last\s*date(?:\s*for\s*(?:the\s+)?(?:submission\s+of\s+)?(?:online\s*)?(?:application|registration)s?)?|"
        r"closing\s*date|apply\s*(?:by|before|till)|submission\s*deadline|"
        r"अंतिम\s*तिथि)(?:[:\s]+|\s+is\s+)(\d{1,2}[./\s-]\d{1,2}[./\s-]\d{2,4})",
        re.I,
    ),
    re.compile(
        rf"(?:last\s*date(?:\s*for\s*(?:the\s+)?(?:submission\s+of\s+)?(?:online\s*)?(?:application|registration)s?)?|"
        rf"closing\s*date|apply\s*(?:by|before|till)|submission\s*deadline|"
        rf"अंतिम\s*तिथि)(?:[:\s]+|\s+is\s+)"
        rf"(\d{{1,2}}(?:st|nd|rd|th)?[\s,\-]+{_MONTH_NAME}[\s,\-]+\d{{2,4}})",
        re.I,
    ),
    re.compile(
        r"(?:extended\s+)?(?:on\s+or\s+before|upto|until|up\s+to)\s+"
        r"(\d{1,2}[./-]\d{1,2}[./-]\d{4})",
        re.I,
    ),
    re.compile(
        rf"(?:extended\s+)?(?:on\s+or\s+before|upto|until|up\s+to)\s+"
        rf"(\d{{1,2}}(?:st|nd|rd|th)?[\s,\-]+{_MONTH_NAME}[\s,\-]+\d{{2,4}})",
        re.I,
    ),
    # Walk-in / interview dates are apply-by for offline notices.
    re.compile(
        r"walk[\s\-]?in(?:\s+interview)?(?:\s+(?:date|on|scheduled))?\s*[:\-]?\s*"
        r"(\d{1,2}[./\s-]\d{1,2}[./\s-]\d{2,4})",
        re.I,
    ),
    re.compile(
        rf"walk[\s\-]?in[\s\S]{{0,220}}?"
        rf"(\d{{1,2}}(?:st|nd|rd|th)?[\s,\-]+{_MONTH_NAME}[\s,\-]+\d{{2,4}})",
        re.I,
    ),
    re.compile(
        r"(?:date\s+of\s+(?:walk[\s\-]?in|interview)|interview\s+date)\s*[:\-]?\s*"
        r"(\d{1,2}[./\s-]\d{1,2}[./\s-]\d{2,4})",
        re.I,
    ),
    re.compile(
        rf"(?:date\s+of\s+(?:walk[\s\-]?in|interview)|interview\s+date)\s*[:\-]?\s*"
        rf"(\d{{1,2}}(?:st|nd|rd|th)?[\s,\-]+{_MONTH_NAME}[\s,\-]+\d{{2,4}})",
        re.I,
    ),
    # Official CEN / PSU tables put words between the label and the date.
    re.compile(
        r"(?:closing\s+date(?:\s+for)?|end\s+date\s+of\s+online\s+application|"
        r"last\s+date\s+for\s+(?:the\s+)?(?:submission|online\s+application))"
        r"[^\d]{0,160}(\d{1,2}[./-]\d{1,2}[./-]20\d{2})",
        re.I,
    ),
)
_RELATIVE_LAST = re.compile(
    r"within\s+(?:a\s+period\s+of\s+)?(\d{1,3})\s+days?\s+from\s+the\s+date\s+of\s+publication",
    re.I,
)
# Project / tenure end dates must not beat real apply-by dates.
_PROJECT_END_HINT = re.compile(
    r"(?:project\s+(?:duration|period|tenure)|tenure\s+(?:upto|until|up\s+to)|"
    r"engagement\s+(?:upto|until|up\s+to)|contract\s+(?:period|upto|until)|"
    r"valid\s+(?:upto|until|up\s+to)|period\s+of\s+(?:the\s+)?project)",
    re.I,
)
_APPLY_HINT_NEAR = re.compile(
    r"(?:last\s*date|closing\s*date|apply\s*(?:by|before|till|online)|"
    r"on\s+or\s+before|walk[\s\-]?in|submission\s*deadline|registration)",
    re.I,
)
_RANGE_NOT_APPLY = re.compile(
    r"modification|scribe|fee\s+payment|correction\s+window|create\s+an\s+account",
    re.I,
)

_PUBLISHED_EVENT_RE = re.compile(
    r"notification|advt|advertisement|published|issued|opening|commencement|start",
    re.I,
)
_LAST_EVENT_RE = re.compile(
    r"last\s*date|closing|apply\s*end|submission|deadline|end\s+date|extended",
    re.I,
)


def to_iso_date(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, datetime):
        return value.date().isoformat()
    text = str(value).strip()
    if not text:
        return None
    month_m = _DATE_MONTH_TOKEN.search(text)
    if month_m:
        return _month_name_to_iso(month_m.group(1), month_m.group(2), month_m.group(3))
    parsed = _parse_date(value)
    return parsed.isoformat() if parsed else None


def _parts_to_iso(day_raw: str, month_raw: str, year_raw: str) -> str | None:
    day_s = str(day_raw).translate(_OCR_DAY_TRANS).strip()
    month_s = str(month_raw).translate(_OCR_DAY_TRANS).strip()
    year_s = str(year_raw).translate(_OCR_DAY_TRANS).strip()
    try:
        day = int(day_s)
        month = int(month_s)
        year = int(year_s)
        if year < 100:
            year += 2000
        return date(year, month, day).isoformat()
    except ValueError:
        return None


def _month_name_to_iso(day_raw: str, month_raw: str, year_raw: str) -> str | None:
    try:
        day = int(str(day_raw).strip())
        month = _MONTH_LOOKUP.get(str(month_raw).strip().lower())
        year = int(str(year_raw).strip())
        if not month:
            return None
        if year < 100:
            year += 2000
        return date(year, month, day).isoformat()
    except ValueError:
        return None


def _token_to_iso(raw: str) -> str | None:
    text = str(raw or "").strip()
    month_m = _DATE_MONTH_TOKEN.search(text)
    if month_m:
        return _month_name_to_iso(month_m.group(1), month_m.group(2), month_m.group(3))
    text = text.translate(_OCR_DAY_TRANS)
    text = re.sub(r"\s+", "", text.replace(".", "-").replace("/", "-"))
    m = _DATE_TOKEN.search(text)
    if not m:
        return to_iso_date(raw)
    return _parts_to_iso(m.group(1), m.group(2), m.group(3))


def _find_published(text: str) -> str | None:
    head = text[:4000]
    m = _DATED_LINE.search(head)
    if m:
        iso = _parts_to_iso(m.group(1), m.group(2), m.group(3))
        if iso:
            return iso
    for pat in _PUBLISHED_PATTERNS:
        m = pat.search(text)
        if not m:
            continue
        if m.lastindex and m.lastindex >= 3:
            iso = _parts_to_iso(m.group(1), m.group(2), m.group(3))
        else:
            iso = _token_to_iso(m.group(1))
        if iso:
            return iso
    return None


def _find_last(text: str, published: str | None) -> str | None:
    candidates: list[tuple[str, int]] = []
    for pat in _LAST_PATTERNS:
        for m in pat.finditer(text):
            iso = _token_to_iso(m.group(1))
            if not iso:
                continue
            window = text[max(0, m.start() - 80) : m.end() + 40]
            # Skip project/tenure end dates when they aren't near apply language.
            if _PROJECT_END_HINT.search(window) and not _APPLY_HINT_NEAR.search(window):
                continue
            priority = 0
            if _APPLY_HINT_NEAR.search(window):
                priority += 2
            if re.search(r"walk[\s\-]?in", window, re.I):
                priority += 3
            if re.search(r"last\s*date|closing\s*date|on\s+or\s+before", window, re.I):
                priority += 4
            candidates.append((iso, priority))

    rel = _RELATIVE_LAST.search(text)
    if rel and published:
        try:
            base = date.fromisoformat(published)
            candidates.append(((base + timedelta(days=int(rel.group(1)))).isoformat(), 3))
        except ValueError:
            pass

    if not candidates:
        return None
    # Prefer highest-priority apply language; among equals pick the nearest (soonest) date.
    candidates.sort(key=lambda item: (-item[1], item[0]))
    return candidates[0][0]


def prefer_apply_date(current: str | None, extracted: str | None, *, today: date | None = None) -> str | None:
    """
    Prefer a nearer apply/walk-in date from notice text over a distant stored last_date
    (often a project end date like 2027-03-31).
    """
    today = today or date.today()
    cur = to_iso_date(current)
    ext = to_iso_date(extracted)
    if not ext:
        return cur
    if not cur:
        return ext
    try:
        cur_d = date.fromisoformat(cur)
        ext_d = date.fromisoformat(ext)
    except ValueError:
        return cur
    # Prefer nearer extracted date when stored date is much farther (project end).
    if (ext_d < cur_d) and (cur_d - ext_d).days >= 30:
        # Allow recently-past walk-ins (up to 90 days) so wrong project-ends get corrected.
        if ext_d >= today - timedelta(days=90):
            return ext
    # Prefer extracted when current is implausibly far but extracted is within a year of today.
    if (cur_d - today).days > 180 and abs((ext_d - today).days) <= 180:
        return ext
    return cur


def extract_dates_from_text(text: str) -> dict[str, str | None]:
    """Return ISO `published_date` and `last_date` parsed from notice body text."""
    if not text or len(text.strip()) < 20:
        return {"published_date": None, "last_date": None}

    published: str | None = None
    last: str | None = None

    for m in (*_DATE_RANGE.finditer(text), *_DATE_RANGE_MONTH.finditer(text)):
        start = _token_to_iso(m.group(1))
        end = _token_to_iso(m.group(2))
        window = text[max(0, m.start() - 80) : m.end() + 40]
        # Date ranges next to project tenure are not apply windows.
        if _PROJECT_END_HINT.search(window) and not _APPLY_HINT_NEAR.search(window):
            continue
        # CEN tables list modification/scribe windows as ranges; those are not last-apply.
        if _RANGE_NOT_APPLY.search(window):
            continue
        if start and not published:
            published = start
        if end and not last:
            last = end

    if not published:
        published = _find_published(text)
    apply_last = _find_last(text, published)
    last = prefer_apply_date(last, apply_last)

    floor = date(date.today().year - 2, 1, 1).isoformat()
    if published and published < floor:
        published = None

    if published and last and published == last:
        # Prefer keeping last; try harder for a distinct posted date near top of notice.
        head_pub = _find_published(text[:2500])
        if head_pub and head_pub != last:
            published = head_pub
        elif _RELATIVE_LAST.search(text) and published:
            # last may be derived from published; keep both when relative rule used.
            pass
        else:
            published = None

    return {"published_date": published, "last_date": last}


def resolve_primary_dates(
    event_rows: list[dict[str, Any]] | None,
) -> tuple[date | None, date | None]:
    """Pick posted and apply-by dates from structured important-dates tables."""
    published: date | None = None
    last: date | None = None
    for row in event_rows or []:
        key = str(row.get("event_key") or "")
        event_date = row.get("event_date")
        if not isinstance(event_date, date):
            continue
        if _LAST_EVENT_RE.search(key):
            if last is None or event_date > last:
                last = event_date
        elif _PUBLISHED_EVENT_RE.search(key):
            if published is None or event_date < published:
                published = event_date
    return published, last


def to_published_datetime(value: Any) -> datetime | None:
    dt = parse_published(value)
    if dt:
        return dt
    iso = to_iso_date(value)
    if not iso:
        return None
    parsed = _parse_date(iso)
    if not parsed:
        return None
    return datetime(parsed.year, parsed.month, parsed.day, tzinfo=timezone.utc)
