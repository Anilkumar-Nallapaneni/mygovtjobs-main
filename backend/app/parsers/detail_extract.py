"""Extract vacancy rows and important dates from PDF content_sections."""

from __future__ import annotations

import re
from datetime import date
from typing import Any

_DATE_KEY_RE = re.compile(
    r"^(?:\d+[\.\):\-]\s*)?"
    r"(?:opening|closing|start|end|last)\s+(?:date|day)|"
    r"last\s+date|application\s+deadline|exam\s+date|"
    r"notification|advt|advertisement|correction|"
    r"fee\s+payment|document\s+verification|"
    r"cbt|written|interview|dv|pet|pmt",
    re.I,
)


def _clean(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def _parse_event_date(value: str) -> date | None:
    from app.services.job_persist_service import _parse_date

    return _parse_date(value)


def _vacancy_row(row: dict[str, Any]) -> dict[str, Any] | None:
    post = _clean(row.get("Post Name") or row.get("post") or row.get("post_name") or row.get("Name of Post"))
    vacancies_raw = _clean(
        row.get("Total Posts")
        or row.get("vacancies")
        or row.get("No of Posts")
        or row.get("No. of Posts")
        or row.get("total")
        or row.get("Vacancies")
    )
    if not post or not vacancies_raw:
        return None
    if re.fullmatch(r"total", post, re.I):
        return None
    vac_digits = re.sub(r"[^\d]", "", vacancies_raw)
    vacancies = int(vac_digits) if vac_digits else 0
    pay_level = _clean(row.get("Pay Level") or row.get("pay_level") or row.get("Pay Scale")) or None
    return {"post_name": post, "vacancies": vacancies, "pay_level": pay_level}


def _date_row(row: dict[str, Any]) -> dict[str, Any] | None:
    event = _clean(row.get("event") or row.get("Event") or row.get("label") or row.get("Label"))
    date_val = _clean(row.get("date") or row.get("Date") or row.get("value") or row.get("Value"))
    if not event or not date_val:
        return None
    if re.fullmatch(r"event", event, re.I) and re.fullmatch(r"date", date_val, re.I):
        return None
    parsed = _parse_event_date(date_val)
    if not parsed:
        return None
    return {"event_key": event, "event_date": parsed}


def _kv_date_row(row: dict[str, Any]) -> dict[str, Any] | None:
    label = _clean(row.get("label") or row.get("Label"))
    value = _clean(row.get("value") or row.get("Value"))
    if not label or not value or not _DATE_KEY_RE.search(label):
        return None
    parsed = _parse_event_date(value)
    if not parsed:
        return None
    return {"event_key": label, "event_date": parsed}


def extract_from_content_sections(
    sections: list[dict[str, Any]] | None,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], str | None]:
    """Return (posts, dates, primary_post_name) parsed from content_sections tables."""
    posts: list[dict[str, Any]] = []
    dates: list[dict[str, Any]] = []
    seen_posts: set[str] = set()
    seen_dates: set[str] = set()

    for section in sections or []:
        heading = _clean(section.get("heading"))
        for table in section.get("tables") or []:
            if not isinstance(table, list):
                continue
            for row in table:
                if not isinstance(row, dict):
                    continue

                date_row = _date_row(row) or _kv_date_row(row)
                if date_row:
                    key = f"{date_row['event_key']}::{date_row['event_date']}"
                    if key not in seen_dates:
                        seen_dates.add(key)
                        dates.append(date_row)
                    continue

                vac_row = _vacancy_row(row)
                if vac_row:
                    key = f"{vac_row['post_name']}::{vac_row['vacancies']}"
                    if key not in seen_posts:
                        seen_posts.add(key)
                        posts.append(vac_row)

        if re.search(r"important\s*dates", heading, re.I):
            for para in section.get("paragraphs") or []:
                for line in str(para).splitlines():
                    m = re.match(r"^([^:]{3,80}?)\s*:\s*(.+)$", _clean(line))
                    if not m:
                        continue
                    label, value = m.group(1).strip(), m.group(2).strip()
                    if not _DATE_KEY_RE.search(label):
                        continue
                    parsed = _parse_event_date(value)
                    if not parsed:
                        continue
                    key = f"{label}::{parsed}"
                    if key in seen_dates:
                        continue
                    seen_dates.add(key)
                    dates.append({"event_key": label, "event_date": parsed})

    post_names = [p["post_name"] for p in posts if p.get("post_name")]
    if not post_names:
        return posts, dates, None
    if len(post_names) == 1:
        return posts, dates, post_names[0]
    if len(post_names) <= 3:
        return posts, dates, ", ".join(post_names)
    return posts, dates, f"{post_names[0]} + {len(post_names) - 1} more"


def extract_post_name_from_title(title: str) -> str | None:
    text = _clean(title)
    if not text:
        return None
    patterns = (
        r"\bfor\s+the\s+post\s+of\s+(.+?)(?:\s+against|\s+in\s+|\s+at\s+|\.|,|$)",
        r"\brecruitment\s+of\s+(.+?)(?:\s+against|\s+in\s+|\.|,|$)",
        r"\bpost\s+name\s*[:-]\s*(.+?)(?:\.|,|$)",
    )
    for pattern in patterns:
        m = re.search(pattern, text, re.I)
        if m:
            candidate = _clean(m.group(1))
            if 2 <= len(candidate) <= 120:
                return candidate
    m = re.match(r"^(.+?)\s*[-–]\s*\d[\d,]*\s+posts?$", text, re.I)
    if m:
        return _clean(m.group(1)) or None
    return None
