"""Extract structured fields from government notification PDFs."""

import re
from typing import Any

from app.config import get_settings
from app.parsers.pdf_dates import extract_dates_from_text
from app.parsers.pdf_fetch import fetch_pdf_text
from app.parsers.pdf_sections import text_to_content_sections
from app.services.noise_filter import sanitize_json_for_postgres
from app.utils.vacancy_extract import extract_vacancies, sanitize_vacancies

_MAX_BYTES = 20 * 1024 * 1024  # re-export for tests that import from here

_VACANCY = re.compile(
    r"(\d{1,6})\s*(?:posts?|vacancies|vacancy|पद|positions?|training\s+seats?)|"
    r"(?:total\s*\*+\s*|total\s+)(\d{1,6})",
    re.I,
)
_LAST_DATE = re.compile(
    r"(?:last\s*date|closing\s*date|apply\s*by|अंतिम\s*तिथि)[:\s]+(\d{1,2}[\-/\.]\d{1,2}[\-/\.]\d{2,4})",
    re.I,
)
_QUAL = re.compile(
    r"(?:qualification|eligibility|essential\s*qualification|योग्यता)[:\s]+(.{10,200}?)(?:\n|$)",
    re.I,
)
_SALARY = re.compile(r"(?:pay\s*scale|salary|emoluments|level[\-\s]*\d+)[:\s]+(.{5,120}?)(?:\n|$)", re.I)
_AGE = re.compile(r"(?:age\s*limit|age\s*as\s*on)[:\s]+(.{5,80}?)(?:\n|$)", re.I)
_URL = re.compile(r"https?://[^\s<>\"']+", re.I)
_APPLY_HINT = re.compile(
    r"apply|register|recruit|career|login|online|portal|form|admission|candidate",
    re.I,
)


def _apply_url_score(url: str) -> int:
    low = url.lower()
    score = 0
    if re.search(r"\.pdf(\?|/|$)", low):
        score -= 100
    if re.search(r"viewpdf\.aspx|viewfile\.aspx", low):
        score -= 80
    if _APPLY_HINT.search(low):
        score += 25
    if "forms.gle" in low or "docs.google.com/forms" in low:
        score += 30
    if re.search(r"/(apply|registration|register|recruit|career|careers|login|portal)/", low):
        score += 20
    return score


def extract_fields(text: str, *, pdf_url: str | None = None) -> dict[str, Any]:
    if not text or len(text.strip()) < 20:
        return {}

    out: dict[str, Any] = {}
    vac = extract_vacancies(text)
    if vac:
        out["vacancies"] = vac
    elif _VACANCY.search(text):
        m = _VACANCY.search(text)
        num = m.group(1) or m.group(2)
        if num:
            out["vacancies"] = sanitize_vacancies(int(num))

    ld = _LAST_DATE.search(text)
    if ld:
        out["last_date"] = ld.group(1)

    date_fields = extract_dates_from_text(text)
    if date_fields.get("last_date") and not out.get("last_date"):
        out["last_date"] = date_fields["last_date"]
    if date_fields.get("published_date"):
        out["published_date"] = date_fields["published_date"]

    qual = _QUAL.search(text)
    if qual:
        out["qualification"] = qual.group(1).strip()[:500]

    sal = _SALARY.search(text)
    if sal:
        out["salary"] = sal.group(1).strip()[:200]

    age = _AGE.search(text)
    if age:
        out["age_limit"] = age.group(1).strip()[:120]

    urls = _URL.findall(text)
    if urls:
        ranked = sorted(
            dict.fromkeys(u.rstrip(".,;)]") for u in urls),
            key=lambda u: _apply_url_score(u),
            reverse=True,
        )
        out["apply_urls"] = [u for u in ranked if _apply_url_score(u) > -50][:8]

    out["summary"] = " ".join(text.split())[:12_000]
    sections = text_to_content_sections(text, pdf_url=pdf_url)
    if sections:
        out["content_sections"] = sections
    return sanitize_json_for_postgres(out)


async def parse_pdf_url(url: str) -> dict[str, Any]:
    settings = get_settings()
    try:
        text = await fetch_pdf_text(url, ocr_enabled=settings.pdf_ocr_enabled)
        fields = extract_fields(text, pdf_url=url)
        if not fields.get("content_sections"):
            fields["content_sections"] = text_to_content_sections(text, pdf_url=url)
        fields["pdf_url"] = url
        return fields
    except Exception:
        return {"pdf_url": url}
