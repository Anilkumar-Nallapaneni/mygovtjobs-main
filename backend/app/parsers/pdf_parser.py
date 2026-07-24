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
    r"(?:essential\s*qualification|educational\s*qualification|qualification|eligibility|योग्यता)"
    r"[:\s]+(.{8,300}?)(?:\n|$)",
    re.I,
)
_SALARY_LABEL = re.compile(
    r"(?:pay\s*scale|pay\s*matrix|salary|emoluments|remuneration|consolidated\s*pay|"
    r"scale\s*of\s*pay|monthly\s*pay|stipend|honorarium)"
    r"[:\s]+(.{5,160}?)(?:\n|$)",
    re.I,
)
_SALARY_INLINE = re.compile(
    r"(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d+)?)\s*(?:[-–—/]|to)?\s*(?:rs\.?|inr|₹)?\s*([\d,]*)",
    re.I,
)
_AGE = re.compile(r"(?:age\s*limit|age\s*as\s*on)[:\s]+(.{5,80}?)(?:\n|$)", re.I)
_ADDRESS = re.compile(
    r"(?:office\s*address|postal\s*address|correspondence\s*address|address\s*for\s*correspondence|"
    r"head\s*office|registered\s*office|corporate\s*office|address)"
    r"[:\s]+(.{8,220}?)(?:\n\s*\n|\n[A-Z][A-Z\s]{4,}|\n(?:phone|tel|email|website|pin)|$)",
    re.I | re.S,
)
_PINCODE = re.compile(
    r"(?:pin(?:\s*code)?|postal\s*code)\s*[:\-]?\s*(\d{6})\b|\b([1-9]\d{5})\b",
    re.I,
)
_URL = re.compile(r"https?://[^\s<>\"']+", re.I)
_APPLY_HINT = re.compile(
    r"apply|register|recruit|career|login|online|portal|form|admission|candidate",
    re.I,
)
_WEAK_FIELD = re.compile(
    r"^(?:—|-|n/?a|tba|pending|not\s*specified|see\s*(?:official\s*)?notification|as\s*per\s*notification)\.?$",
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


def is_weak_field(value: Any) -> bool:
    """True when a stored field is empty or a placeholder, not real notice data."""
    raw = str(value or "").strip()
    if not raw:
        return True
    return bool(_WEAK_FIELD.match(raw))


def _clean_line(value: str, *, max_len: int) -> str:
    cleaned = re.sub(r"\s+", " ", value).strip(" :;,-")
    return cleaned[:max_len]


def _extract_salary(text: str) -> str | None:
    labeled = _SALARY_LABEL.search(text)
    if labeled:
        candidate = _clean_line(labeled.group(1), max_len=200)
        if candidate and not is_weak_field(candidate) and re.search(r"\d", candidate):
            # Prefer a clean INR snippet when the labeled line is verbose.
            inline_in_label = _SALARY_INLINE.search(candidate)
            if inline_in_label and len(candidate) > 40:
                low = inline_in_label.group(1)
                high = inline_in_label.group(2) or ""
                if high:
                    return f"Rs. {low} - {high}"
                return f"Rs. {low}"
            return candidate
    # Fall back to first clear INR amount / range in the notice.
    inline = _SALARY_INLINE.search(text)
    if not inline:
        return None
    low = inline.group(1).replace(",", "")
    high = (inline.group(2) or "").replace(",", "")
    if not low.isdigit():
        return None
    amount = int(low)
    if amount < 100 or amount > 10_000_000:
        return None
    if high.isdigit() and int(high) >= amount:
        return f"Rs. {inline.group(1)} - {inline.group(2)}"
    return f"Rs. {inline.group(1)}"


def _extract_address_fields(text: str) -> dict[str, str]:
    out: dict[str, str] = {}
    addr = _ADDRESS.search(text)
    if addr:
        street = _clean_line(
            re.split(r"\b(?:pin(?:\s*code)?|postal\s*code|phone|tel|email|website)\b", addr.group(1), flags=re.I)[
                0
            ].replace("\n", ", "),
            max_len=220,
        )
        has_street_hint = bool(
            re.search(
                r"\b(road|rd|street|lane|marg|nagar|complex|bhawan|bhavan|sector|plot|block|building|office)\b",
                street,
                re.I,
            )
        )
        # Prefer addresses with street hints or punctuation/digits (not bare city names).
        if len(street) >= 12 and (has_street_hint or not re.fullmatch(r"[A-Za-z\s,]+", street)):
            out["street_address"] = street
            out["streetAddress"] = street

    search_space = out.get("street_address") or ""
    pin_labeled = re.search(r"(?:pin(?:\s*code)?|postal\s*code)\s*[:\-]?\s*(\d{6})\b", text, re.I)
    city_pin = re.search(
        r"\b([A-Za-z][A-Za-z.\s]{2,40}?)\s*[-–—]\s*(\d{6})\b",
        text,
    )
    if pin_labeled:
        out["postal_code"] = pin_labeled.group(1)
        out["postalCode"] = pin_labeled.group(1)
        out["pincode"] = pin_labeled.group(1)
    elif city_pin:
        out["postal_code"] = city_pin.group(2)
        out["postalCode"] = city_pin.group(2)
        out["pincode"] = city_pin.group(2)
    else:
        pin_near = _PINCODE.search(search_space) if search_space else None
        if pin_near:
            pin = pin_near.group(1) or pin_near.group(2)
            if pin:
                out["postal_code"] = pin
                out["postalCode"] = pin
                out["pincode"] = pin

    # Letterhead / HQ lines: "... Bhawan / Complex ..., CITY-PIN"
    if "streetAddress" not in out:
        letterhead = re.search(
            r"([^\n]{10,160}?\b(?:bhawan|bhavan|complex|building|quarters?|road|nagar|marg)\b[^\n]{0,80}?"
            r"(?:[A-Za-z][A-Za-z.\s]{2,30}\s*[-–—]\s*\d{6}|\b\d{6}\b))",
            text,
            re.I,
        )
        if letterhead:
            street = _clean_line(
                re.split(r"\b(?:phone|tel|fax|email|web(?:site)?|cin)\b", letterhead.group(1), flags=re.I)[0],
                max_len=220,
            )
            if len(street) >= 12:
                out["street_address"] = street
                out["streetAddress"] = street
                if "postalCode" not in out:
                    pin_m = re.search(r"\b(\d{6})\b", street)
                    if pin_m:
                        out["postal_code"] = pin_m.group(1)
                        out["postalCode"] = pin_m.group(1)
                        out["pincode"] = pin_m.group(1)
    return out


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
        q = _clean_line(qual.group(1), max_len=500)
        if q and not is_weak_field(q):
            out["qualification"] = q

    salary = _extract_salary(text)
    if salary:
        out["salary"] = salary

    age = _AGE.search(text)
    if age:
        a = _clean_line(age.group(1), max_len=120)
        if a and not is_weak_field(a):
            out["age_limit"] = a

    out.update(_extract_address_fields(text))

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
