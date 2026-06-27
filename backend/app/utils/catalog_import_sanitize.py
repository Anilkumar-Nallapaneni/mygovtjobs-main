"""Sanitize scraped recruitment catalog JSON — strip aggregator branding, keep official content."""

from __future__ import annotations

import re
from typing import Any

# Block known job-aggregator hosts (patterns only — not exposed in product UI).
_BLOCKED_URL_PATTERNS = [
    re.compile(r"freejobalert\.com", re.I),
    re.compile(r"img2\.freejobalert\.com", re.I),
    re.compile(r"t\.me/freejobalert", re.I),
    re.compile(r"fjajobsbot", re.I),
    re.compile(r"instagram\.com/freejobalert", re.I),
    re.compile(r"youtube\.com/@freejobalert", re.I),
    re.compile(r"whatsapp\.com/channel", re.I),
]

_BLOCKED_TEXT_PATTERNS = [
    re.compile(r"follow\s*us", re.I),
    re.compile(r"join\s*whatsapp", re.I),
    re.compile(r"join\s*telegram", re.I),
    re.compile(r"join\s*instagram", re.I),
    re.compile(r"join\s*youtube", re.I),
    re.compile(r"never\s*miss\s*a\s*govt\s*job", re.I),
    re.compile(r"freejobalert", re.I),
    re.compile(r"\bfja\b", re.I),
    re.compile(r"get\s*custom\s*govt\s*job\s*alerts", re.I),
    re.compile(r"join\s*now", re.I),
    re.compile(r"download\s*mobile\s*app", re.I),
    re.compile(r"view\s*details", re.I),
]

_TEXT_STRIP_PATTERNS = [
    re.compile(r"www\.freejobalert\.com", re.I),
    re.compile(r"download\s*mobile\s*app", re.I),
    re.compile(r"🔔"),
    re.compile(r"⚡"),
]


def is_blocked_url(url: str) -> bool:
    if not url:
        return True
    if re.search(r"freejobalert", url, re.I):
        return True
    return any(p.search(url) for p in _BLOCKED_URL_PATTERNS)


def is_blocked_text(text: str) -> bool:
    trimmed = (text or "").strip()
    if not trimmed:
        return True
    return any(p.search(trimmed) for p in _BLOCKED_TEXT_PATTERNS)


def clean_display_text(text: str) -> str | None:
    cleaned = (text or "").strip()
    for pattern in _TEXT_STRIP_PATTERNS:
        cleaned = pattern.sub("", cleaned)
    cleaned = re.sub(r"\s{2,}", " ", cleaned).strip()
    if not cleaned or is_blocked_text(cleaned):
        return None
    return cleaned


def _clean_link(link: dict[str, Any]) -> dict[str, str] | None:
    url = (link.get("url") or "").strip()
    if not url or is_blocked_url(url):
        return None
    label = (link.get("text") or "Official Link").strip()
    if is_blocked_text(label):
        return None
    return {"label": label, "url": url}


def _dedupe_links(links: list[dict[str, str]]) -> list[dict[str, str]]:
    seen: set[str] = set()
    out: list[dict[str, str]] = []
    for link in links:
        url = link["url"]
        if url in seen:
            continue
        seen.add(url)
        out.append(link)
    return out


def _clean_tables(tables: list[list[dict[str, str]]]) -> list[list[dict[str, str]]]:
    cleaned_tables: list[list[dict[str, str]]] = []
    for table in tables or []:
        rows: list[dict[str, str]] = []
        for row in table or []:
            cleaned_row: dict[str, str] = {}
            for key, value in (row or {}).items():
                cleaned = clean_display_text(str(value))
                if cleaned:
                    cleaned_row[str(key)] = cleaned
            if cleaned_row:
                rows.append(cleaned_row)
        if rows:
            cleaned_tables.append(rows)
    return cleaned_tables


def _clean_lists(lists: list[list[str]]) -> list[list[str]]:
    out: list[list[str]] = []
    for lst in lists or []:
        cleaned = [c for item in (lst or []) if (c := clean_display_text(str(item)))]
        if cleaned:
            out.append(cleaned)
    return out


def _clean_sections(sections: list[dict[str, Any]] | None) -> list[dict[str, Any]]:
    if not sections:
        return []

    result: list[dict[str, Any]] = []
    for section in sections:
        heading = (section.get("heading") or "").strip()
        if not heading or is_blocked_text(heading):
            continue

        paragraphs = [
            p
            for item in (section.get("paragraphs") or [])
            if (p := clean_display_text(str(item)))
        ]
        links = _dedupe_links(
            [
                link
                for item in (section.get("links") or [])
                if (link := _clean_link(item))
            ]
        )
        tables = _clean_tables(section.get("tables") or [])
        lists = _clean_lists(section.get("lists") or [])

        if not (paragraphs or tables or lists or links):
            continue

        result.append(
            {
                "heading": heading,
                "paragraphs": paragraphs,
                "tables": tables,
                "lists": lists,
                "links": links,
            }
        )
    return result


_URL_IN_TEXT = re.compile(r"https?://[^\s)\]\"'<>]+", re.I)


def _links_from_text(text: str) -> list[dict[str, str]]:
    out: list[dict[str, str]] = []
    for match in _URL_IN_TEXT.finditer(text or ""):
        url = match.group(0).rstrip(".,;)")
        if link := _clean_link({"url": url, "text": "Official Link"}):
            out.append(link)
    return out


def collect_apply_links(raw: dict[str, Any]) -> list[dict[str, str]]:
    detail = raw.get("detail") or {}
    candidates: list[dict[str, str]] = []

    for key in ("apply_links", "links"):
        for item in detail.get(key) or []:
            if link := _clean_link(item):
                candidates.append(link)

    for section in detail.get("sections") or []:
        for item in section.get("links") or []:
            if link := _clean_link(item):
                candidates.append(link)
        for paragraph in section.get("paragraphs") or []:
            candidates.extend(_links_from_text(str(paragraph)))

    candidates.extend(_links_from_text(str(detail.get("summary") or "")))

    return _dedupe_links(candidates)


def sanitize_raw_job(raw: dict[str, Any]) -> dict[str, Any]:
    listing = raw.get("listing") or {}
    detail = raw.get("detail") or {}

    return {
        "id": str(listing.get("job_id") or raw.get("job_id") or ""),
        "board": (listing.get("recruitment_board") or "").strip(),
        "post_name": (listing.get("exam_post_name") or "").strip(),
        "qualification": (listing.get("qualification") or "").strip(),
        "advt_no": (listing.get("advt_no") or "").strip(),
        "last_date": (listing.get("last_date") or "").strip(),
        "section": (listing.get("section") or "").strip(),
        "post_date": (listing.get("post_date") or "").strip(),
        "source_page": (listing.get("source_page") or "").strip(),
        "title": (detail.get("title") or listing.get("exam_post_name") or "").strip(),
        "summary": clean_display_text(detail.get("summary") or "") or "",
        "important_dates": detail.get("important_dates") or [],
        "sections": _clean_sections(detail.get("sections")),
        "apply_links": collect_apply_links(raw),
    }
