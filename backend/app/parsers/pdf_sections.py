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
    r"FREQUENTLY\s+ASKED\s+QUESTIONS(?:\s+AND\s+ANSWERS)?|FAQs?|"
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
_JUNK_KV_LABEL = re.compile(r"^(?:answer|question|ans\.?|q\.?\s*\d+|no\.?\s*isro|no\.)$", re.I)
_FAQ_BLOCK_START = re.compile(
    r"frequently\s+asked\s+questions(?:\s+and\s+answers)?|\bFAQs?\b",
    re.I,
)
_FAQ_QA_LINE = re.compile(r"^\s*(?:\d+[\.\)]\s+)?.+\?\s*$")
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


def _mask_colons_in_brackets(line: str) -> str:
    """Replace colons inside [...] so Paper Code : CS does not become a KV split."""

    def repl(m: re.Match[str]) -> str:
        return m.group(0).replace(":", "\uff1a")

    return re.sub(r"\[[^\]]*\]", repl, line or "")


def _join_soft_wrapped_lines(text: str) -> str:
    """Join soft-wrapped continuation lines so KV values are not cut mid-sentence."""
    lines = (text or "").replace("\r", "\n").split("\n")
    if len(lines) <= 1:
        return text or ""
    out: list[str] = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            out.append("")
            continue
        if not out or not out[-1].strip():
            out.append(stripped)
            continue
        prev = out[-1]
        # Continue previous line when this looks like a wrap (lowercase / no new KV / not heading).
        looks_continuation = (
            not _HEADING_RE.match(stripped)
            and not re.match(r"^(?:[-•*]|\d+[\.\)])\s+", stripped)
            and not _KV_LINE.match(_mask_colons_in_brackets(stripped))
            and (
                stripped[0].islower()
                or prev.rstrip().endswith((",", ";", ":", "-"))
                or (
                    not prev.rstrip().endswith((".", "?", "!"))
                    and len(prev) > 40
                    and not stripped[0].isupper()
                )
            )
        )
        if looks_continuation:
            out[-1] = f"{prev} {stripped}"
        else:
            out.append(stripped)
    return "\n".join(out)


def _is_junk_kv_label(label: str) -> bool:
    lab = _clean_line(label)
    if not lab:
        return True
    if _JUNK_KV_LABEL.match(lab):
        return True
    if re.search(r"\[?\s*paper\s*code\s*$", lab, re.I):
        return True
    if re.match(r"^\[?paper\s*code", lab, re.I):
        return True
    return False


def _peel_faq_block(text: str) -> tuple[str, str]:
    """Split body into (main_text, faq_text). FAQ is kept as paragraphs, never KV tables."""
    body = text or ""
    m = _FAQ_BLOCK_START.search(body)
    if not m:
        # Numbered Q&A densify without an FAQ heading.
        lines = body.splitlines()
        answer_hits = sum(1 for ln in lines if re.match(r"^\s*answer\s*:", ln, re.I))
        if answer_hits < 3:
            return body, ""
        # Find first numbered question-ish line before answers accumulate.
        start = 0
        for i, ln in enumerate(lines):
            if re.match(r"^\s*\d+[\.\)]\s+.+\?", ln) or re.match(r"^\s*answer\s*:", ln, re.I):
                start = i
                break
        main = "\n".join(lines[:start]).strip()
        faq = "\n".join(lines[start:]).strip()
        return main, faq
    main = body[: m.start()].strip()
    faq = body[m.start() :].strip()
    return main, faq


def _extract_kv_table(text: str) -> list[dict[str, str]] | None:
    rows: list[dict[str, str]] = []
    joined = _join_soft_wrapped_lines(text)
    for line in joined.splitlines():
        line = line.strip()
        if not line:
            continue
        bullet = re.match(r"^(?:[-•*]|\d+[\.\)])\s+(.+)$", line)
        if bullet:
            line = bullet.group(1).strip()
        # Skip FAQ answer/question lines even when colon-split would otherwise match.
        if re.match(r"^(?:answer|question)\s*:", line, re.I):
            continue
        masked = _mask_colons_in_brackets(line)
        m = _KV_LINE.match(masked)
        if not m:
            continue
        label = _clean_line(m.group(1).replace("\uff1a", ":"))
        value = _clean_line(m.group(2).replace("\uff1a", ":"))
        if len(label) < 2 or len(value) < 1:
            continue
        if label.lower() in ("http", "https"):
            continue
        if _is_junk_kv_label(label):
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

    # Never turn FAQ Q&A into key/value fact cards.
    if _FAQ_BLOCK_START.search(heading) or re.search(r"\bfaqs?\b", heading, re.I):
        return tables

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


def _make_section(heading: str, chunk: str, *, allow_tables: bool = True) -> dict[str, Any] | None:
    if len(chunk) < _MIN_SECTION_CHARS:
        return None
    bullets = _bullet_lines(chunk)
    paragraphs = _paragraph_chunks(chunk)
    if bullets:
        bullet_set = {b.lower() for b in bullets}
        paragraphs = [
            p
            for p in paragraphs
            if p.lower() not in bullet_set and not re.match(r"^(?:[-•*]|\d+[\.\)])\s+", p)
        ]
    tables = _extract_tables_from_chunk(chunk, heading) if allow_tables else []
    if not paragraphs and not bullets and not tables:
        return None
    heading_out = heading.strip()
    if heading_out.isupper() and not re.fullmatch(r"FAQs?", heading_out, re.I):
        heading_out = heading_out.title()
    elif re.fullmatch(r"faqs?", heading_out, re.I):
        heading_out = "FAQ"
    return {
        "heading": heading_out,
        "paragraphs": paragraphs,
        "tables": tables,
        "lists": [bullets] if bullets else [],
        "links": _extract_links(chunk),
    }


def text_to_content_sections(text: str, *, pdf_url: str | None = None) -> list[dict[str, Any]]:
    """Split PDF text into UI sections (heading, paragraphs, lists, links)."""
    body = _restore_heading_breaks(text or "").strip()
    if len(body) < 40:
        return []

    # Peel FAQ blocks out of the main flow so Answer: lines never become Overview KV cards.
    main_body, faq_body = _peel_faq_block(body)
    working = main_body or body

    matches = list(_HEADING_RE.finditer(working))
    sections: list[dict[str, Any]] = []

    if not matches:
        paragraphs = _paragraph_chunks(working)
        if paragraphs:
            sections.append(
                {
                    "heading": "Notification",
                    "paragraphs": paragraphs,
                    "tables": _extract_tables_from_chunk(working, "Notification"),
                    "lists": [],
                    "links": _extract_links(working),
                }
            )
    else:
        intro = working[: matches[0].start()].strip()
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
            end = matches[i + 1].start() if i + 1 < len(matches) else len(working)
            chunk = working[start:end].strip()
            is_faq = bool(_FAQ_BLOCK_START.search(heading) or re.search(r"\bfaqs?\b", heading, re.I))
            sec = _make_section(heading, chunk, allow_tables=not is_faq)
            if sec:
                sections.append(sec)

    if faq_body:
        faq_sec = _make_section("FAQ", faq_body, allow_tables=False)
        if faq_sec:
            # Prefer short Q&A list items when numbered questions exist.
            qa_items: list[str] = []
            for line in faq_body.splitlines():
                line = _clean_line(line)
                if not line:
                    continue
                if re.match(r"^\d+[\.\)]\s+", line) or _FAQ_QA_LINE.match(line) or re.match(
                    r"^answer\s*:", line, re.I
                ):
                    qa_items.append(line)
            if len(qa_items) >= 3:
                faq_sec["lists"] = [qa_items[:40]]
                # Keep a short intro paragraph only.
                faq_sec["paragraphs"] = faq_sec["paragraphs"][:1]
            sections.append(faq_sec)

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
