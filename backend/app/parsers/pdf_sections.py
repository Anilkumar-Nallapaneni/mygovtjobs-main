"""Turn government notification PDF plain text into content_sections for the job detail UI."""

from __future__ import annotations

import re
from typing import Any

_HEADING_RE = re.compile(
    r"^\s*(?:\d+[\.\):\-]\s*)?"
    r"(?:"
    r"IMPORTANT\s+DATES?|DATE\s+OF\s+EXAM(?:INATION)?|SCHEDULE\s+OF\s+ACTIVIT(?:Y|IES)|"
    r"ELIGIBILITY(?:\s+CRITERIA)?|QUALIFICATION|EDUCATIONAL\s+QUALIFICATION|"
    r"ESSENTIAL\s+QUALIFICATION|DESIRABLE\s+QUALIFICATION|"
    r"AGE\s+LIMIT|AGE\s+CRITERIA|RELAXATION(?:\s+IN\s+AGE)?|"
    r"APPLICATION\s+FEE|EXAM(?:INATION)?\s+FEE|REGISTRATION\s+FEE|FEE\s+DETAILS?|"
    r"SELECTION\s+PROCESS|MODE\s+OF\s+SELECTION|"
    r"HOW\s+TO\s+APPLY|APPLICATION\s+PROCEDURE|APPLY\s+ONLINE|"
    r"VACANCY\s+DETAILS?|POST\s+DETAILS?|NAME\s+OF\s+(?:THE\s+)?POST|"
    r"PAY\s+SCALE|SALARY|EMOLUMENTS|REMUNERATION|STIPEND|"
    r"GENERAL\s+INSTRUCTIONS?|INSTRUCTIONS?\s+TO\s+CANDIDATES?|"
    r"DOCUMENTS?\s+(?:REQUIRED|TO\s+BE\s+PRODUCED)|"
    r"SYLLABUS|EXAM(?:INATION)?\s+PATTERN|SCHEME\s+OF\s+EXAM(?:INATION)?|"
    r"RESERVATION|VACANCY|OVERVIEW|INTRODUCTION|NOTIFICATION|"
    r"CONTACT\s+DETAILS?|HELP(?:DESK|LINE)?"
    r")\s*$",
    re.I | re.M,
)

_URL_RE = re.compile(r"https?://[^\s<>\"']+", re.I)
_MAX_PARAGRAPH = 2400
_MIN_SECTION_CHARS = 24
_FEE_HEADING = re.compile(r"fee|charges|payment", re.I)
_VACANCY_HEADING = re.compile(r"vacanc|post\s+name|name\s+of\s+(?:the\s+)?post|pay\s+scale", re.I)
_KV_LINE = re.compile(r"^([^:]{2,80}?)\s*:\s*(.+)$")
_COL_SPLIT = re.compile(r"\s{2,}|\t|\|")
_INLINE_HEADING_NAMES = (
    r"IMPORTANT\s+DATES?|DATE\s+OF\s+EXAM(?:INATION)?|SCHEDULE\s+OF\s+ACTIVIT(?:Y|IES)|"
    r"ELIGIBILITY(?:\s+CRITERIA)?|QUALIFICATION|EDUCATIONAL\s+QUALIFICATION|"
    r"ESSENTIAL\s+QUALIFICATION|DESIRABLE\s+QUALIFICATION|"
    r"AGE\s+LIMIT|AGE\s+CRITERIA|RELAXATION(?:\s+IN\s+AGE)?|"
    r"APPLICATION\s+FEE|EXAM(?:INATION)?\s+FEE|REGISTRATION\s+FEE|FEE\s+DETAILS?|"
    r"SELECTION\s+PROCESS|MODE\s+OF\s+SELECTION|"
    r"HOW\s+TO\s+APPLY|APPLICATION\s+PROCEDURE|APPLY\s+ONLINE|"
    r"VACANCY\s+DETAILS?|POST\s+DETAILS?|NAME\s+OF\s+(?:THE\s+)?POST|"
    r"PAY\s+SCALE|SALARY|EMOLUMENTS|REMUNERATION|STIPEND|"
    r"GENERAL\s+INSTRUCTIONS?|INSTRUCTIONS?\s+TO\s+CANDIDATES?|"
    r"DOCUMENTS?\s+(?:REQUIRED|TO\s+BE\s+PRODUCED)|"
    r"SYLLABUS|EXAM(?:INATION)?\s+PATTERN|SCHEME\s+OF\s+EXAM(?:INATION)?|"
    r"RESERVATION|CONTACT\s+DETAILS?|HELP(?:DESK|LINE)?"
)
_INLINE_HEADING_BREAK = re.compile(
    rf"(?<![A-Za-z0-9])({_INLINE_HEADING_NAMES})(?=\s*[:.\-]|\s+[A-Z0-9])",
    re.I,
)


def _restore_heading_breaks(text: str) -> str:
    """Insert newlines before known headings when PDF text was collapsed to one line."""
    body = (text or "").replace("\r", "\n")
    stripped = body.strip()
    if not stripped:
        return body
    # Already has line structure / headings — don't break vacancy/fee tables.
    if "\n" in stripped and len(list(_HEADING_RE.finditer(body))) >= 1:
        return body
    # Only rewrite truly collapsed walls of text.
    if stripped.count("\n") <= 1 and len(stripped) >= 120:
        return _INLINE_HEADING_BREAK.sub(r"\n\n\1\n", body)
    return body


def _clean_line(line: str) -> str:
    return re.sub(r"\s+", " ", (line or "").strip())


def _paragraph_chunks(text: str) -> list[str]:
    raw = (text or "").replace("\r", "\n")
    parts = re.split(r"\n\s*\n+", raw)
    out: list[str] = []
    for part in parts:
        chunk = _clean_line(part)
        if len(chunk) < 20:
            continue
        while len(chunk) > _MAX_PARAGRAPH:
            cut = chunk.rfind(". ", 0, _MAX_PARAGRAPH)
            if cut < 80:
                cut = _MAX_PARAGRAPH
            out.append(chunk[: cut + 1].strip())
            chunk = chunk[cut + 1 :].strip()
        if chunk:
            out.append(chunk)
    return out


def _extract_links(text: str) -> list[dict[str, str]]:
    links: list[dict[str, str]] = []
    seen: set[str] = set()
    for url in _URL_RE.findall(text or ""):
        url = url.rstrip(".,;)")
        if url in seen:
            continue
        seen.add(url)
        if re.search(r"\.pdf(\?|/|$)|viewpdf\.aspx", url, re.I):
            label = "Download Notification PDF"
        elif re.search(
            r"apply|register|recruit|career|login|online|portal|forms\.gle|docs\.google\.com/forms",
            url,
            re.I,
        ):
            label = "Apply Online"
        else:
            label = "Official Link"
        links.append({"label": label, "url": url})
    return links


def _split_columns(line: str) -> list[str]:
    parts = [_clean_line(p) for p in _COL_SPLIT.split(line or "") if _clean_line(p)]
    return parts


def _row_dict(headers: list[str], values: list[str]) -> dict[str, str]:
    if len(headers) == 2 and len(values) == 2:
        left, right = headers[0].lower(), values[0].lower()
        if left in ("label", "particular", "category", "item") or right in ("value", "amount", "fee"):
            return {"label": values[0], "value": values[1]}
    out: dict[str, str] = {}
    for idx, header in enumerate(headers):
        if idx < len(values):
            out[header] = values[idx]
    return out


def _extract_kv_table(text: str) -> list[dict[str, str]] | None:
    rows: list[dict[str, str]] = []
    for line in (text or "").splitlines():
        line = line.strip()
        if not line:
            continue
        bullet = re.match(r"^(?:[-•*]|\d+[\.\)])\s+(.+)$", line)
        if bullet:
            line = bullet.group(1).strip()
        m = _KV_LINE.match(line)
        if not m:
            continue
        label = _clean_line(m.group(1))
        value = _clean_line(m.group(2))
        if len(label) < 2 or len(value) < 1:
            continue
        if label.lower() in ("http", "https"):
            continue
        rows.append({"label": label, "value": value})
    return rows if len(rows) >= 2 else None


def _extract_column_tables(text: str) -> list[list[dict[str, str]]]:
    lines = (text or "").replace("\r", "\n").splitlines()
    tables: list[list[dict[str, str]]] = []
    idx = 0
    while idx < len(lines):
        block: list[list[str]] = []
        while idx < len(lines):
            raw = lines[idx]
            if not raw.strip():
                if block:
                    idx += 1
                    break
                idx += 1
                continue
            cols = _split_columns(raw)
            if len(cols) >= 2:
                block.append(cols)
                idx += 1
                continue
            break

        if len(block) >= 2:
            header = block[0]
            body_rows: list[dict[str, str]] = []
            start = 1
            headerish = sum(1 for cell in header if re.search(r"[A-Za-z]{3,}", cell)) >= max(1, len(header) // 2)
            if not headerish:
                start = 0
                header = [f"Col {i + 1}" for i in range(len(block[0]))]

            for row in block[start:]:
                if len(row) < 2:
                    continue
                if len(row) != len(header):
                    if len(row) == 2:
                        body_rows.append({"label": row[0], "value": row[1]})
                    continue
                body_rows.append(_row_dict(header, row))

            if len(body_rows) >= 2:
                tables.append(body_rows)
        else:
            idx += 1
    return tables


def _extract_fee_rows(text: str) -> list[dict[str, str]] | None:
    rows: list[dict[str, str]] = []
    for line in (text or "").splitlines():
        line = _clean_line(line)
        if not line:
            continue
        m = re.match(
            r"^(general|ur|obc|sc|st|ews|female|pwd|ex[\-\s]?servicemen|ph|others?)"
            r"\s*[:\-]\s*(.+)$",
            line,
            re.I,
        )
        if m:
            rows.append({"label": m.group(1).title(), "value": m.group(2).strip()})
    return rows if len(rows) >= 2 else None


def _extract_tables_from_chunk(text: str, heading: str = "") -> list[list[dict[str, str]]]:
    tables: list[list[dict[str, str]]] = []
    seen: set[str] = set()

    def add(table: list[dict[str, str]] | None) -> None:
        if not table:
            return
        key = "|".join(f"{r.get('label', '')}:{r.get('value', '')}" for r in table[:4])
        if key in seen:
            return
        seen.add(key)
        tables.append(table)

    if _FEE_HEADING.search(heading):
        add(_extract_fee_rows(text))
    if _VACANCY_HEADING.search(heading):
        for table in _extract_column_tables(text):
            add(table)

    add(_extract_kv_table(text))
    for table in _extract_column_tables(text):
        add(table)

    return tables


def _bullet_lines(text: str) -> list[str]:
    items: list[str] = []
    for line in (text or "").splitlines():
        line = _clean_line(line)
        if not line:
            continue
        m = re.match(r"^(?:[-•*]|\d+[\.\)])\s+(.+)$", line)
        if m:
            items.append(m.group(1).strip())
    return items


def text_to_content_sections(text: str, *, pdf_url: str | None = None) -> list[dict[str, Any]]:
    """Split PDF text into UI sections (heading, paragraphs, lists, links)."""
    body = _restore_heading_breaks(text or "").strip()
    if len(body) < 40:
        return []

    matches = list(_HEADING_RE.finditer(body))
    sections: list[dict[str, Any]] = []

    if not matches:
        paragraphs = _paragraph_chunks(body)
        if not paragraphs:
            return []
        sections.append(
            {
                "heading": "Notification",
                "paragraphs": paragraphs,
                "tables": _extract_tables_from_chunk(body, "Notification"),
                "lists": [],
                "links": _extract_links(body),
            }
        )
    else:
        intro = body[: matches[0].start()].strip()
        intro_paras = _paragraph_chunks(intro)
        if intro_paras:
            sections.append(
                {
                    "heading": "Introduction",
                    "paragraphs": intro_paras,
                    "tables": _extract_tables_from_chunk(intro, "Introduction"),
                    "lists": [],
                    "links": _extract_links(intro),
                }
            )

        for i, match in enumerate(matches):
            heading = _clean_line(match.group(0))
            start = match.end()
            end = matches[i + 1].start() if i + 1 < len(matches) else len(body)
            chunk = body[start:end].strip()
            if len(chunk) < _MIN_SECTION_CHARS:
                continue
            bullets = _bullet_lines(chunk)
            paragraphs = _paragraph_chunks(chunk)
            if bullets:
                # Drop paragraph lines that were already captured as bullets.
                bullet_set = {b.lower() for b in bullets}
                paragraphs = [
                    p
                    for p in paragraphs
                    if p.lower() not in bullet_set
                    and not re.match(r"^(?:[-•*]|\d+[\.\)])\s+", p)
                ]
            tables = _extract_tables_from_chunk(chunk, heading)
            if not paragraphs and not bullets and not tables:
                continue
            sections.append(
                {
                    "heading": heading.title() if heading.isupper() else heading,
                    "paragraphs": paragraphs,
                    "tables": tables,
                    "lists": [bullets] if bullets else [],
                    "links": _extract_links(chunk),
                }
            )

    if pdf_url:
        pdf_links = [
            {"label": "Download Official Notification PDF", "url": pdf_url},
        ]
        has_pdf = any(
            re.search(r"\.pdf(\?|/|$)", str(link.get("url") or ""), re.I)
            for sec in sections
            for link in sec.get("links") or []
        )
        if not has_pdf:
            if sections:
                sections[0].setdefault("links", []).extend(pdf_links)
            else:
                sections.append(
                    {
                        "heading": "Notification PDF",
                        "paragraphs": ["Download the official notification PDF for complete details."],
                        "tables": [],
                        "lists": [],
                        "links": pdf_links,
                    }
                )

    return sections
