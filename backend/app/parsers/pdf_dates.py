"""Extract notification (posted) and last (apply-by) dates from PDF / notice text."""

from __future__ import annotations

import re
from datetime import date, datetime, timedelta, timezone
from typing import Any

from app.scrapers.date_utils import parse_published
from app.services.job_persist_service import _parse_date

_OCR_DAY_TRANS = str.maketrans({"l": "1", "I": "1", "O": "0", "o": "0"})

_DATE_TOKEN = re.compile(
    r"([l1I\d]{1,2})[./\s-](\d{1,2})[./\s-](\d{2,4})",
)
_DATE_RANGE = re.compile(
    r"(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})\s*(?:TO|–|—|-)\s*(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})",
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
    re.compile(r"\bdated\s+(\d{1,2})[.\s/-](\d{1,2})[.\s/-](\d{4})\b", re.I),
    _DATED_LINE,
    re.compile(r"Date\s*:\s*(\d{1,2}[./-]\d{1,2}[./-]\d{4})", re.I),
)
_LAST_PATTERNS = (
    re.compile(
        r"apply\s+online[\s\S]{0,220}?on\s+or\s+before\s+(\d{1,2}[./-]\d{1,2}[./-]\d{4})",
        re.I,
    ),
    re.compile(
        r"(?:last\s*date(?:\s*for\s*(?:online\s*)?(?:application|registration))?|"
        r"closing\s*date|apply\s*(?:by|before|till)|submission\s*deadline|"
        r"अंतिम\s*तिथि)[:\s]+(\d{1,2}[./\s-]\d{1,2}[./\s-]\d{2,4})",
        re.I,
    ),
    re.compile(
        r"(?:extended\s+)?(?:on\s+or\s+before|upto|until|up\s+to)\s+"
        r"(\d{1,2}[./-]\d{1,2}[./-]\d{4})",
        re.I,
    ),
)
_RELATIVE_LAST = re.compile(
    r"within\s+(?:a\s+period\s+of\s+)?(\d{1,3})\s+days?\s+from\s+the\s+date\s+of\s+publication",
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


def _token_to_iso(raw: str) -> str | None:
    text = str(raw or "").strip().translate(_OCR_DAY_TRANS)
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
    for pat in _LAST_PATTERNS:
        m = pat.search(text)
        if m:
            iso = _token_to_iso(m.group(1))
            if iso:
                return iso

    rel = _RELATIVE_LAST.search(text)
    if rel and published:
        try:
            base = date.fromisoformat(published)
            return (base + timedelta(days=int(rel.group(1)))).isoformat()
        except ValueError:
            pass
    return None


def extract_dates_from_text(text: str) -> dict[str, str | None]:
    """Return ISO `published_date` and `last_date` parsed from notice body text."""
    if not text or len(text.strip()) < 20:
        return {"published_date": None, "last_date": None}

    published: str | None = None
    last: str | None = None

    for m in _DATE_RANGE.finditer(text):
        start = _token_to_iso(m.group(1))
        end = _token_to_iso(m.group(2))
        if start and not published:
            published = start
        if end and not last:
            last = end

    if not published:
        published = _find_published(text)
    if not last:
        last = _find_last(text, published)

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
