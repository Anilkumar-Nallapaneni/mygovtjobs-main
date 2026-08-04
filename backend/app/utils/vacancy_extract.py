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
    # "two (02) posts" / "(02) posts of Upper Division Clerk"
    re.compile(r"\(\s*0*([1-9]\d{0,5})\s*\)\s*(?:posts?|vacancies|vacancy|positions?)\b", re.I),
    re.compile(
        r"filling\s+up\s+of\s+(?:two|three|four|five|six|seven|eight|nine|ten|\d+)\s*"
        r"(?:\(\s*0*([1-9]\d{0,5})\s*\)\s*)?(?:posts?|vacancies)",
        re.I,
    ),
    # "Apply Online for 12,256 Group B & C Vacancies"
    re.compile(r"\b([\d,]+)\s+group\s+[a-z0-9].{0,40}?vacanc", re.I | re.S),
    re.compile(r"apply\s+online\s+for\s+([\d,]+)\b", re.I),
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

_WORD_COUNTS = {
    "one": 1,
    "two": 2,
    "three": 3,
    "four": 4,
    "five": 5,
    "six": 6,
    "seven": 7,
    "eight": 8,
    "nine": 9,
    "ten": 10,
}
_WORD_POSTS = re.compile(
    r"\b(one|two|three|four|five|six|seven|eight|nine|ten)\s+"
    r"(?:\(\s*0*\d+\s*\)\s*)?(?:posts?|vacancies|vacancy|positions?)\b",
    re.I,
)

_TOTAL_PATTERN = re.compile(r"total\s*(?:no\.?\s*of\s*)?(?:posts?|vacancies|vacancy)\s*[:\-]?\s*([\d,]+)", re.I)

# Address pin glued to a "Posts:" section header (e.g. "Haryana - 122001\nPosts :")
_PINCODE_BEFORE_POSTS = re.compile(r"[-–—]\s*(\d{6})\s*(?:\n\s*)?Posts\s*:", re.I)
_SALARY_NEARBY = re.compile(r"(?:rs\.?|inr|₹|remuneration|emolument|pay\s*scale|per\s*month|p\.?m\.?)", re.I)


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
    # "03.06.2026 VACANCY CIRCULAR" — calendar date, not a post count
    if re.search(rf"\d{{1,2}}[./-]\d{{1,2}}[./-]{s}\s+vacancy\s+circular\b", ctx, re.I):
        return True
    if re.search(rf"\b{s}\s+vacancy\s+circular\b", ctx, re.I):
        return True
    # e.g. "05 Posts" — year-sized number used as a real post count
    if re.search(
        rf"(?:{s}\s*(?:posts?|vacancies|vacancy|positions?|seats?)"
        rf"|(?:posts?|vacancies|vacancy|positions?|seats?)\s*(?:of\s*)?{s}\b)",
        ctx,
        re.I,
    ):
        # Still a year when the only "vacancy" hit is the circular header
        if re.search(rf"{s}\s+vacancy\s+circular\b", ctx, re.I) and not re.search(
            rf"{s}\s*(?:posts?|vacancies|vacancy|positions?|seats?)\b(?!\s+circular)",
            ctx,
            re.I,
        ):
            return True
        return False
    return True


def is_probable_date_year_vacancy_false_positive(match: re.Match[str], blob: str) -> bool:
    """Reject '03.06.2026 VACANCY CIRCULAR' style date+header hits."""
    n = _parse_num(match.group(1))
    if not (1900 <= n <= 2035):
        return False
    start = max(0, match.start() - 16)
    end = min(len(blob), match.end() + 24)
    window = blob[start:end]
    if re.search(rf"\d{{1,2}}[./-]\d{{1,2}}[./-]{n}\s+vacancy\s+circular\b", window, re.I):
        return True
    if re.search(rf"\b{n}\s+vacancy\s+circular\b", window, re.I):
        return True
    return False


def is_probable_salary_false_positive(match: re.Match[str], blob: str) -> bool:
    n = _parse_num(match.group(1))
    if not (1000 <= n <= 500_000):
        return False
    start = max(0, match.start() - 32)
    end = min(len(blob), match.end() + 32)
    return bool(_SALARY_NEARBY.search(blob[start:end]))


def is_probable_pincode_posts_false_positive(match: re.Match[str], blob: str) -> bool:
    """Reject 6-digit pincodes immediately before a 'Posts:' heading (not a vacancy count)."""
    n = _parse_num(match.group(1))
    if not (100000 <= n <= 999999):
        return False
    start = max(0, match.start() - 24)
    end = min(len(blob), match.end() + 16)
    window = blob[start:end]
    return bool(re.search(r"-\s*(\d{6})\s*(?:\n\s*)?Posts\s*:", window, re.I))


def _plausible(n: int, context: str, *, match: re.Match[str] | None = None, blob: str = "") -> bool:
    if match and blob:
        if is_probable_pincode_posts_false_positive(match, blob):
            return False
        if is_probable_salary_false_positive(match, blob):
            return False
        if is_probable_date_year_vacancy_false_positive(match, blob):
            return False
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
        if _plausible(n, title_ctx, match=m, blob=blob_for_scan):
            totals.append(n)

    if totals:
        return max(totals)

    for pat in _VACANCY_PATTERNS:
        for m in pat.finditer(blob_for_scan):
            raw = m.group(1) if m.lastindex else ""
            n = _parse_num(raw)
            if _plausible(n, title_ctx, match=m, blob=blob_for_scan):
                found.append(n)

    for m in _WORD_POSTS.finditer(blob_for_scan):
        n = _WORD_COUNTS.get(m.group(1).lower(), 0)
        if _plausible(n, title_ctx):
            found.append(n)

    posts_line_sum = 0
    if _PINCODE_BEFORE_POSTS.search(blob_for_scan):
        posts_block = _PINCODE_BEFORE_POSTS.split(blob_for_scan, maxsplit=1)[-1][:1200]
        numbered = re.findall(r"[-–—]\s*(\d{1,4})\s*(?:\n|$|\()", posts_block)
        subtotals = [_parse_num(x) for x in numbered if 1 <= _parse_num(x) <= 500]
        if subtotals:
            posts_line_sum = sum(subtotals)

    if posts_line_sum and (not found or posts_line_sum > max(found)):
        return sanitize_vacancies(posts_line_sum, title_ctx, blob_for_scan)

    if not found:
        return 0
    return max(found)


def _vacancy_context_blob(title: str = "", context: str = "") -> str:
    raw = " ".join(filter(None, [title, context])).strip()
    try:
        from urllib.parse import unquote

        return unquote(raw.replace("+", " "))
    except Exception:
        return raw


# Result/cutoff/shortlist docs embed candidate counts — not open vacancies.
# "Vacancy circular" is a real recruitment format and must stay countable.
_NON_VACANCY_DOC = re.compile(
    r"\b(?:"
    r"exam\s*schedule|tentative\s*exam|admit\s*card|hall\s*ticket|merit\s*list|"
    r"cut[\s-]?off|result(?:\s*(?:notice|against|for|of))?|answer\s*key|corrigendum|"
    r"hackathon|publish[_\s-]?report|shortlist(?:ing|ed)?|"
    r"provisionally\s*(?:in-?)?eligible|list\s+of\s+candidates|"
    r"candidates?\s+(?:admitted|shortlisted|selected|qualified)|"
    r"seating\s*plan|press\s*(?:note|release)|waiting\s*list|score\s*card|"
    r"rejection\s*list|document\s*verification|circular\s*:"
    r")\b",
    re.I,
)
_VACANCY_CIRCULAR = re.compile(r"\bvacancy\s+circular\b", re.I)


def is_non_vacancy_document(title: str = "", context: str = "") -> bool:
    blob = _vacancy_context_blob(title, context)
    if _VACANCY_CIRCULAR.search(blob):
        return False
    return bool(_NON_VACANCY_DOC.search(blob))


def sanitize_vacancies(count: int, title: str = "", context: str = "") -> int:
    n = int(count) if count else 0
    if is_non_vacancy_document(title, context):
        return 0
    ctx = _vacancy_context_blob(title, context) or title
    if not _plausible(n, ctx):
        return 0
    return n


def resolve_vacancies(
    stored: int,
    title: str = "",
    context: str = "",
    *,
    posts_sum: int = 0,
) -> int:
    """Prefer title/body extraction; posts breakdown is the floor when present."""
    merged = " ".join(filter(None, [title, context])).strip()
    raw = int(stored) if stored else 0
    stored_n = sanitize_vacancies(raw, title, context)
    ctx = merged or title
    if 1900 <= raw <= 2035 and (is_probable_year(raw, ctx) or str(raw) not in ctx):
        stored_n = 0

    title_only = extract_vacancies(title, title=title)
    if posts_sum > 0:
        safe_posts = sanitize_vacancies(posts_sum, title, context)
        if not safe_posts:
            return 0
        if title_only >= safe_posts:
            return sanitize_vacancies(title_only, title, context)
        if stored_n >= safe_posts and stored_n <= max(safe_posts * 2, 5000):
            return stored_n
        return safe_posts

    from_text = extract_vacancies(title, title=title) or (
        extract_vacancies(merged, title=title) if merged and merged != title else 0
    )
    safe_from = sanitize_vacancies(from_text, title, context) if from_text > 0 else 0
    anchor = stored_n

    if safe_from > 0:
        if not anchor:
            if title_only > 0:
                return sanitize_vacancies(title_only, title, context)
            if safe_from > 5000:
                return 0
            return safe_from
        if safe_from > anchor:
            if anchor < 5000 and safe_from > anchor * 2:
                if title_only > 0 and title_only <= anchor * 3:
                    return sanitize_vacancies(title_only, title, context)
                return sanitize_vacancies(anchor, title, context)
            if title_only > 0:
                return sanitize_vacancies(title_only, title, context)
            return safe_from
        if safe_from < anchor and safe_from < 10:
            if 1900 <= anchor <= 2035:
                return safe_from if safe_from > 0 else (sanitize_vacancies(title_only, title, context) if title_only else 0)
            return anchor
        return safe_from
    return anchor
