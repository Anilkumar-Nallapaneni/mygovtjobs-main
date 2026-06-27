"""Extract post/vacancy counts from notification titles and PDF/HTML text."""

from __future__ import annotations

import re

# Group 1 = numeric count in every pattern below.
_VACANCY_PATTERNS: list[re.Pattern[str]] = [
    re.compile(
        r"[–—\-]\s*([\d,]+)\s*(?:posts?|vacancies|vacancy|bharti|positions?|seats?)\b",
        re.I,
    ),
    re.compile(r"\b([\d,]+)\s+(?:posts?|vacancies|vacancy|positions?|seats?)\b", re.I),
    re.compile(r"\b([\d,]+)\s*posts?\b", re.I),
    re.compile(r"\b([\d,]+)\s*vacancies?\b", re.I),
    re.compile(r"(?:for|of)\s+([\d,]+)\s+(?:posts?|vacancies|vacancy)\b", re.I),
    re.compile(
        r"(?:total|maximum|max|upto|up\s+to)\s*[:\-]?\s*([\d,]+)\s*(?:posts?|vacancies|vacancy|positions?)?\b",
        re.I,
    ),
    re.compile(r"no\.?\s*of\s*(?:posts?|vacancies)\s*[:\-]?\s*([\d,]+)\b", re.I),
    re.compile(r"recruitment\s+(?:of|for)\s+([\d,]+)\b", re.I),
    re.compile(r"(?:notification|advertisement|advt\.?|notice)[:\s]+([\d,]+)\s+posts?\b", re.I),
    re.compile(r":\s*([\d,]+)\s+posts?\s+of\b", re.I),
    re.compile(r"\b([\d,]+)\s+posts?\s+of\b", re.I),
    re.compile(r"\(([\d,]+)\s*(?:posts?|vacancies)\)", re.I),
    re.compile(r"\b([\d,]+)\s*(?:\+\s*)?(?:regular|temporary)?\s*posts?\b", re.I),
]

_TOTAL_PATTERN = re.compile(r"total\s*(?:no\.?\s*of\s*)?(?:posts?|vacancies|vacancy)\s*[:\-]?\s*([\d,]+)", re.I)


def _parse_num(raw: str) -> int:
    try:
        return int(str(raw).replace(",", "").replace(" ", "").strip())
    except ValueError:
        return 0


def is_probable_year(n: int, context: str) -> bool:
    if not (1900 <= n <= 2035):
        return False
    ctx = context or ""
    s = str(n)
    if s not in ctx:
        return False
    # e.g. "05 Posts" — year-sized number used as a real post count
    if re.search(
        rf"(?:{s}\s*(?:posts?|vacancies|vacancy|positions?|seats?)"
        rf"|(?:posts?|vacancies|vacancy|positions?|seats?)\s*(?:of\s*)?{s}\b)",
        ctx,
        re.I,
    ):
        return False
    return True


def _plausible(n: int, context: str) -> bool:
    return 1 <= n <= 250_000 and not is_probable_year(n, context)


def extract_vacancies(*chunks: str | None, title: str = "") -> int:
    """Best-effort vacancy count from title + body snippets (not roll-list score tables)."""
    parts = [c for c in chunks if c and str(c).strip()]
    blob = " ".join(parts)
    if not blob.strip():
        return 0

    title_ctx = title or (parts[0] if parts else blob)

    # Roll/result tables — do not treat score columns as vacancies.
    if re.search(r"\bSl\s*No\.?\s*Roll\s*No\b", blob, re.I) and not re.search(
        r"\b\d{1,6}\s*(?:posts?|vacancies|vacancy|bharti)\b", blob, re.I
    ):
        blob_for_scan = title_ctx
    else:
        blob_for_scan = blob

    totals: list[int] = []
    found: list[int] = []

    for m in _TOTAL_PATTERN.finditer(blob_for_scan):
        n = _parse_num(m.group(1))
        if _plausible(n, title_ctx):
            totals.append(n)

    if totals:
        return max(totals)

    for pat in _VACANCY_PATTERNS:
        for m in pat.finditer(blob_for_scan):
            n = _parse_num(m.group(1))
            if _plausible(n, title_ctx):
                found.append(n)

    if not found:
        return 0
    return max(found)


def sanitize_vacancies(count: int, title: str = "", context: str = "") -> int:
    n = int(count) if count else 0
    ctx = " ".join(filter(None, [title, context])).strip() or title
    if not _plausible(n, ctx):
        return 0
    return n


def resolve_vacancies(
    stored: int,
    title: str = "",
    context: str = "",
) -> int:
    """Prefer title/body extraction; ignore year-like stored counts (e.g. Advt 06/2025)."""
    merged = " ".join(filter(None, [title, context])).strip()
    from_text = extract_vacancies(title, title=title) or (
        extract_vacancies(merged, title=title) if merged and merged != title else 0
    )
    raw = int(stored) if stored else 0
    stored_n = sanitize_vacancies(raw, title, context)
    ctx = merged or title
    if 1900 <= raw <= 2035 and (is_probable_year(raw, ctx) or str(raw) not in ctx):
        stored_n = 0

    if from_text > 0:
        if not stored_n or from_text <= stored_n:
            return sanitize_vacancies(from_text, title, context)
        title_only = extract_vacancies(title, title=title)
        if title_only > 0:
            return sanitize_vacancies(title_only, title, context)
        return sanitize_vacancies(from_text, title, context)
    return stored_n
