"""Parse notification dates and filter by ingest lookback window."""

from __future__ import annotations

import re
from datetime import date, datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from typing import Any

_DATE_IN_TEXT = re.compile(
    r"(\d{1,2}[\-/\.]\d{1,2}[\-/\.]\d{2,4}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})",
    re.I,
)


def lookback_cutoff(days: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=max(1, days))


def parse_published(value: Any, _depth: int = 0) -> datetime | None:
    """Best-effort parse of RSS/HTML published strings."""
    if _depth > 6:
        return None
    if value is None:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, date):
        return datetime(value.year, value.month, value.day, tzinfo=timezone.utc)

    text = str(value).strip()
    if not text:
        return None

    try:
        return parsedate_to_datetime(text).astimezone(timezone.utc)
    except Exception:
        pass

    for fmt in (
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d",
        "%d-%m-%Y",
        "%d/%m/%Y",
        "%d.%m.%Y",
        "%d %b %Y",
        "%d %B %Y",
    ):
        try:
            dt = datetime.strptime(text.replace("Z", "+0000"), fmt)
            return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
        except ValueError:
            continue

    m = _DATE_IN_TEXT.search(text)
    if m:
        fragment = m.group(1).strip()
        if fragment and fragment != text:
            return parse_published(fragment, _depth + 1)

    return None


def extract_date_from_title(title: str) -> datetime | None:
    return parse_published(title)


def within_lookback(
    published: datetime | None,
    *,
    days: int,
    unknown_includes: bool = True,
) -> bool:
    """True if item should be kept for the lookback window."""
    if published is None:
        return unknown_includes
    return published >= lookback_cutoff(days)


def row_published_at(raw: dict[str, Any]) -> datetime | None:
    for key in ("published", "publishedAt", "pubDate", "updated"):
        dt = parse_published(raw.get(key))
        if dt:
            return dt
    return extract_date_from_title(raw.get("title") or "")
