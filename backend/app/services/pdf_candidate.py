"""Select and validate primary recruitment notification PDFs."""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any
from urllib.parse import unquote


POSITIVE_PDF_TERMS: dict[str, int] = {
    "detailed-advertisement": 40,
    "detailed advertisement": 40,
    "advertisement": 35,
    "recruitment": 35,
    "notification": 30,
    "vacancy": 25,
    "engagement": 20,
    "advt": 20,
}

NEGATIVE_PDF_TERMS: dict[str, int] = {
    "result": -80,
    "marks": -70,
    "answer-key": -70,
    "answer key": -70,
    "admit-card": -70,
    "admit card": -70,
    "hall-ticket": -70,
    "application-form": -30,
    "application form": -30,
    "declaration": -50,
    "corrigendum": -20,
    "recruitment-rules": -80,
    "recruitment rules": -80,
    "tender": -100,
    "syllabus": -15,
}


def score_pdf_candidate(url: str, label: str = "") -> int:
    text = unquote(f"{url} {label}").lower()
    score = 0
    for term, value in POSITIVE_PDF_TERMS.items():
        if term in text:
            score += value
    for term, value in NEGATIVE_PDF_TERMS.items():
        if term in text:
            score += value
    if text.strip().endswith(".pdf") or ".pdf?" in text or ".pdf/" in text:
        score += 5
    return score


def select_primary_pdf(
    candidates: list[str] | list[tuple[str, str]] | None,
    *,
    min_score: int = 0,
) -> tuple[str | None, int, list[tuple[str, int]]]:
    """
    Return (best_url, best_score, scored_list).
    Each candidate may be a URL string or (url, label).
    """
    scored: list[tuple[str, int]] = []
    for item in candidates or []:
        if isinstance(item, tuple):
            url, label = item[0], item[1] if len(item) > 1 else ""
        else:
            url, label = str(item), ""
        url = str(url or "").strip()
        if not url:
            continue
        scored.append((url, score_pdf_candidate(url, label)))

    if not scored:
        return None, -999, []

    scored.sort(key=lambda x: x[1], reverse=True)
    best_url, best_score = scored[0]
    if best_score < min_score:
        return None, best_score, scored
    return best_url, best_score, scored


def is_real_pdf(content: bytes, content_type: str = "", *, min_bytes: int = 10_000) -> bool:
    ctype = (content_type or "").lower()
    if content_type and "html" in ctype and "pdf" not in ctype:
        return False
    if not content.startswith(b"%PDF"):
        return False
    if len(content) < min_bytes:
        return False
    if content_type and "pdf" not in ctype and "octet-stream" not in ctype and "binary" not in ctype:
        # Some gov servers omit content-type; allow empty / octet-stream.
        if ctype.strip():
            return False
    return True


def validate_extracted_dates(
    published_at: date | None,
    last_date: date | None,
    *,
    today: date | None = None,
) -> list[str]:
    errors: list[str] = []
    today = today or date.today()

    if published_at and published_at > today + timedelta(days=1):
        errors.append("Publication date is in the future")

    if published_at and published_at.year < today.year - 2:
        errors.append("Publication date is implausibly old")

    if last_date and published_at and last_date < published_at:
        errors.append("Last date is before publication date")

    if last_date and last_date > today + timedelta(days=365):
        errors.append("Last date is implausibly distant")

    return errors


def enrichment_meets_quality(
    *,
    summary: str = "",
    sections: list[Any] | None = None,
    fields: dict[str, Any] | None = None,
    min_summary_chars: int = 200,
    min_field_hits: int = 2,
) -> tuple[bool, list[str]]:
    """Reject weak PDF extractions (40-char summaries are not enough)."""
    reasons: list[str] = []
    summary = str(summary or "").strip()
    sections = sections or []
    fields = fields or {}

    useful_fields = (
        "vacancies",
        "qualification",
        "salary",
        "age_limit",
        "last_date",
        "application_fee",
        "selection_process",
    )
    hits = sum(1 for key in useful_fields if fields.get(key))
    if fields.get("last_date") or fields.get("deadline"):
        hits = max(hits, 1)

    has_sections = bool(sections)
    if has_sections and (hits >= min_field_hits or len(summary) >= min_summary_chars):
        return True, []

    if len(summary) >= min_summary_chars and hits >= min_field_hits:
        return True, []

    if len(summary) < min_summary_chars and not has_sections:
        reasons.append(f"Summary too short ({len(summary)} < {min_summary_chars})")
    if hits < min_field_hits:
        reasons.append(f"Only {hits} recruitment fields extracted (need {min_field_hits})")
    if not has_sections and not reasons:
        reasons.append("No structured content sections")
    return False, reasons
