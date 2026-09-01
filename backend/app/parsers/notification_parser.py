import json
import re
from typing import Any
from urllib.parse import unquote, urlparse

from app.parsers.pdf_dates import resolve_primary_dates, to_iso_date, to_published_datetime
from app.parsers.detail_extract import extract_from_content_sections
from app.scrapers.date_utils import row_published_at
from app.services.noise_filter import clean_job_title, friendly_dept, is_junk_job_title

from app.utils.official_hosts import looks_like_notification_document, pick_best_official_url
from app.utils.repo_paths import resolve_repo_path
from app.utils.vacancy_extract import extract_vacancies, resolve_vacancies
_ADVT_IN_TITLE = re.compile(r"\b([A-Z]{2,6}/[A-Z0-9/_-]{4,40})\b")
_DATE_DMY = re.compile(r"\b(\d{1,2})[./\s-](\d{1,2})[./\s-](\d{4})\b")
_MONTH_NAME = (
    r"(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|"
    r"Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)"
)
_DATE_UPTO = re.compile(
    r"(?:extended\s+)?(?:upto|until|up\s+to|by)\s+(\d{1,2})[./-](\d{1,2})[./-](\d{4})",
    re.I,
)
_DATE_DATED = re.compile(r"dated\s+(\d{1,2})[.\s/-](\d{1,2})[.\s/-](\d{4})", re.I)
_DATE_RANGE_TITLE = re.compile(
    r"(\d{1,2}[./-]\d{1,2}[./-]\d{4})\s*(?:TO|–|—|-)\s*(\d{1,2}[./-]\d{1,2}[./-]\d{4})",
    re.I,
)
_DATE_RANGE_MONTH_TITLE = re.compile(
    rf"(?:from|between|apply(?:ing)?\s+(?:online\s+)?(?:from)?)\s+"
    rf"(\d{{1,2}}(?:st|nd|rd|th)?[\s,\-]+{_MONTH_NAME}[\s,\-]+\d{{2,4}})"
    rf"\s*(?:to|–|—|-|and)\s+"
    rf"(\d{{1,2}}(?:st|nd|rd|th)?[\s,\-]+{_MONTH_NAME}[\s,\-]+\d{{2,4}})",
    re.I,
)
# Labeled apply-by dates in titles ("Last Date 30-08-2026", "Closing Date: 30 June 2026").
_LAST_DATE_TITLE = re.compile(
    rf"(?:last\s*date(?:\s+for\s+[A-Za-z\s]{{0,50}}?)?|"
    rf"closing\s*date|apply\s*(?:by|before|till)|on\s+or\s+before|"
    rf"registration\s+extended\s+(?:till|until|upto|up\s+to|to))"
    rf"(?:[:\s]+|\s+is\s+)(?:(\d{{1,2}})[./-](\d{{1,2}})[./-](\d{{4}})|"
    rf"(\d{{1,2}})(?:st|nd|rd|th)?[\s,\-]+({_MONTH_NAME})[\s,\-]+(\d{{4}}))",
    re.I,
)
_LAST_DATE_ISO_TITLE = re.compile(
    r"(?:closing\s*date|last\s*date)(?:\s+extension)?\s+(\d{4}-\d{2}-\d{2})",
    re.I,
)
_DATE_DATED_MONTH = re.compile(
    rf"dated\s+(\d{{1,2}})[.\s/-]+({_MONTH_NAME})[.\s/-]+(\d{{4}})",
    re.I,
)
_REG_FROM_TITLE = re.compile(
    rf"registration\s*from\s*"
    rf"(?:(\d{{1,2}})[./-](\d{{1,2}})[./-](\d{{4}})|"
    rf"(\d{{1,2}})[\s\-]+({_MONTH_NAME})[\s\-]+(\d{{4}}))"
    rf"(?:\s*(?:to|–|—|-)\s*"
    rf"(?:(\d{{1,2}})[./-](\d{{1,2}})[./-](\d{{4}})|"
    rf"(\d{{1,2}})[\s\-]+({_MONTH_NAME})[\s\-]+(\d{{4}})))?",
    re.I,
)
_WALK_IN_TITLE = re.compile(r"walk[\s\-]?in", re.I)
_MONTH_LOOKUP = {
    "jan": 1, "january": 1, "feb": 2, "february": 2, "mar": 3, "march": 3,
    "apr": 4, "april": 4, "may": 5, "jun": 6, "june": 6, "jul": 7, "july": 7,
    "aug": 8, "august": 8, "sep": 9, "sept": 9, "september": 9,
    "oct": 10, "october": 10, "nov": 11, "november": 11, "dec": 12, "december": 12,
}
_QUAL_IN_TITLE = re.compile(
    r"\b(Any\s+Graduate|Any\s+Post\s+Graduate|10\+2|12TH|10TH|MBA/?PGDM|B\.?Tech/?B\.?E|MBBS)\b",
    re.I,
)

_WEAK_TITLE = re.compile(
    r"^(english|hindi|tamil|telugu|bengali|marathi|gujarati|kannada|malayalam|punjabi|odia|assamese|urdu)"
    r"(\s*[\(\[]?\s*\d|\s*$)|^download\b|^click\s+here|^pdf\b|^notification$|^application\s+form\b",
    re.I,
)

TEMPLATE_PATH = resolve_repo_path("scripts", "parser_templates", "default_notification.json")


def _is_weak_title(title: str) -> bool:
    t = (title or "").strip()
    if len(t) < 10:
        return True
    return bool(_WEAK_TITLE.match(t))


def _title_from_document_url(url: str) -> str | None:
    """Derive a readable title when the portal anchor is e.g. 'English(676 KB)'."""
    if not url:
        return None
    path = unquote(urlparse(url).path)
    m = re.search(r"/([^/]+\.pdf)", path, re.I)
    segment = m.group(1) if m else path.rstrip("/").split("/")[-1]
    if not segment:
        return None
    name = re.sub(r"\.pdf.*$", "", segment, flags=re.I)
    name = re.sub(r"^\d{6,8}_", "", name)
    name = name.replace("+", " ").replace("_", " ").replace("-", " ")
    name = re.sub(r"\s+", " ", name).strip()
    if len(name) < 12:
        return None
    if not re.search(
        r"apprentice|engagement|recruit|advertisement|notification|vacanc|exam|bharti|apply|opening|post",
        name,
        re.I,
    ):
        return None
    return name.title() if name.isupper() else name


class NotificationParser:
    def __init__(self):
        self.template = json.loads(TEMPLATE_PATH.read_text(encoding="utf-8"))

    def _infer_category(self, title: str, dept: str | None) -> str | None:
        probe = f"{title} {dept or ''}"
        for rule in self.template.get("category_rules") or []:
            if re.search(rule.get("pattern", ""), probe, re.I):
                return rule.get("category")
        return None

    def _extract_dates_from_title(self, title: str) -> dict[str, Any]:
        """Split notification/posted vs apply-by dates when both appear in titles."""
        out: dict[str, Any] = {}
        if not title:
            return out

        def _ymd(day: str, month: str, year: str) -> str:
            return f"{int(year):04d}-{int(month):02d}-{int(day):02d}"

        def _month_iso(day: str, month_raw: str, year: str) -> str | None:
            month = _MONTH_LOOKUP.get(str(month_raw).strip().lower())
            if not month:
                return None
            return _ymd(day, str(month), year)

        dr = _DATE_RANGE_TITLE.search(title)
        if dr:
            out["published_date"] = to_iso_date(dr.group(1).replace(".", "-"))
            out["last_date"] = to_iso_date(dr.group(2).replace(".", "-"))
            return out

        drm = _DATE_RANGE_MONTH_TITLE.search(title)
        if drm:
            start = to_iso_date(drm.group(1))
            end = to_iso_date(drm.group(2))
            if start:
                out["published_date"] = start
            if end:
                out["last_date"] = end
            return out

        if labeled := _LAST_DATE_TITLE.search(title):
            if labeled.group(1) and labeled.group(2) and labeled.group(3):
                out["last_date"] = _ymd(labeled.group(1), labeled.group(2), labeled.group(3))
                return out
            if labeled.group(4) and labeled.group(5) and labeled.group(6):
                iso = _month_iso(labeled.group(4), labeled.group(5), labeled.group(6))
                if iso:
                    out["last_date"] = iso
                    return out

        if iso_close := _LAST_DATE_ISO_TITLE.search(title):
            out["last_date"] = iso_close.group(1)
            return out

        if upto := _DATE_UPTO.search(title):
            d, m, y = upto.groups()
            out["last_date"] = _ymd(d, m, y)
            return out

        if dated_m := _DATE_DATED_MONTH.search(title):
            iso = _month_iso(dated_m.group(1), dated_m.group(2), dated_m.group(3))
            if iso:
                if _WALK_IN_TITLE.search(title):
                    out["last_date"] = iso
                else:
                    out["published_date"] = iso
                return out

        if dated := _DATE_DATED.search(title):
            d, m, y = dated.groups()
            iso = _ymd(d, m, y)
            if _WALK_IN_TITLE.search(title):
                out["last_date"] = iso
            else:
                out["published_date"] = iso
            return out

        if reg := _REG_FROM_TITLE.search(title):
            if reg.group(1) and reg.group(2) and reg.group(3):
                out["published_date"] = _ymd(reg.group(1), reg.group(2), reg.group(3))
            elif reg.group(4) and reg.group(5) and reg.group(6):
                iso = _month_iso(reg.group(4), reg.group(5), reg.group(6))
                if iso:
                    out["published_date"] = iso
            if reg.group(7) and reg.group(8) and reg.group(9):
                out["last_date"] = _ymd(reg.group(7), reg.group(8), reg.group(9))
            elif reg.group(10) and reg.group(11) and reg.group(12):
                iso = _month_iso(reg.group(10), reg.group(11), reg.group(12))
                if iso:
                    out["last_date"] = iso
            return out

        dates = list(_DATE_DMY.finditer(title))
        if len(dates) >= 2:
            d, m, y = dates[0].groups()
            out["published_date"] = _ymd(d, m, y)
            d, m, y = dates[-1].groups()
            out["last_date"] = _ymd(d, m, y)
        return out

    def _extract_from_title(self, title: str) -> dict[str, Any]:
        """Parse common notification titles: vacancies, advt no., qualification, dates."""
        out: dict[str, Any] = {}
        if not title:
            return out
        vac = extract_vacancies(title, title=title)
        if vac:
            out["vacancies"] = vac
        adv = _ADVT_IN_TITLE.search(title)
        if adv and "/" in adv.group(1):
            out["advt_no"] = adv.group(1)
        qm = _QUAL_IN_TITLE.search(title)
        if qm:
            out["qualification"] = qm.group(1)
        out.update(self._extract_dates_from_title(title))
        return out

    def _extract_from_text(self, text: str) -> dict[str, Any]:
        out: dict[str, Any] = {}
        for key, cfg in (self.template.get("fields") or {}).items():
            for pat in cfg.get("patterns") or []:
                m = re.search(pat, text, re.I)
                if m and m.lastindex and m.lastindex >= 1:
                    out[key] = m.group(1).strip()
                    break
        return out

    def parse(self, raw: dict[str, Any], *, pdf_fields: dict[str, Any] | None = None, source_code: str | None = None) -> dict[str, Any]:
        """Map raw_ingest JSON → normalized job fields."""
        title = clean_job_title(raw.get("title") or "")
        if not title:
            title = "Government recruitment"
        apply_url = raw.get("link") or raw.get("applyUrl")
        pdf_urls = raw.get("pdfUrls") or raw.get("pdf_urls") or []

        if _is_weak_title(title) or is_junk_job_title(title):
            for candidate_url in [*pdf_urls, apply_url]:
                inferred = _title_from_document_url(candidate_url)
                if inferred and not is_junk_job_title(inferred):
                    title = clean_job_title(inferred)
                    break

        dept = friendly_dept(raw, source_code or raw.get("source"))
        state = raw.get("state") or "All India"

        title_fields = self._extract_from_title(title)
        text_probe = f"{title} {raw.get('summary') or ''}"
        text_fields = self._extract_from_text(text_probe)
        category = raw.get("category") or self._infer_category(title, dept)

        pdf = pdf_fields or {}
        pdf_apply_urls = list(pdf.get("apply_urls") or [])
        apply_candidates = [u for u in [apply_url, *pdf_apply_urls] if u]
        best_apply = pick_best_official_url(apply_candidates)
        if best_apply and not looks_like_notification_document(best_apply):
            apply_url = best_apply
        elif apply_url and looks_like_notification_document(str(apply_url)):
            apply_url = next(
                (
                    u
                    for u in pdf_apply_urls
                    if u and not looks_like_notification_document(str(u))
                ),
                None,
            )
        elif pdf_apply_urls and not apply_url:
            apply_url = next(
                (
                    u
                    for u in pdf_apply_urls
                    if u and not looks_like_notification_document(str(u))
                ),
                None,
            )

        published_dt = row_published_at(raw)
        if pdf.get("content_sections"):
            _, event_dates, _ = extract_from_content_sections(pdf.get("content_sections"))
            section_pub, section_last = resolve_primary_dates(event_dates)
            if section_pub and not published_dt:
                published_dt = to_published_datetime(section_pub)
            if section_last and not pdf.get("last_date"):
                pdf = {**pdf, "last_date": section_last.isoformat()}

        if not published_dt:
            published_dt = to_published_datetime(
                pdf.get("published_date") or title_fields.get("published_date")
            )
        published_iso = (
            published_dt.isoformat()
            if published_dt
            else raw.get("published") or raw.get("publishedAt")
        )

        merged_pdfs: list[str] = []
        seen_pdf: set[str] = set()

        def _add_pdf(u: str | None) -> None:
            if not u or u in seen_pdf:
                return
            seen_pdf.add(u)
            merged_pdfs.append(u)

        for u in pdf_urls:
            _add_pdf(u)
        if pdf.get("pdf_url"):
            _add_pdf(pdf["pdf_url"])
        if apply_url and re.search(r"\.pdf", apply_url, re.I):
            _add_pdf(apply_url)

        primary_pdf = merged_pdfs[0] if merged_pdfs else pdf.get("pdf_url")

        detail: dict[str, Any] = {
            "source": raw.get("source"),
            "data_origin": "official",
            "published": published_iso,
            "pdf_urls": merged_pdfs,
            "pdf_url": primary_pdf,
            "notification_url": raw.get("link") or apply_url,
        }
        if pdf.get("summary"):
            detail["summary"] = pdf["summary"]
        if pdf_apply_urls:
            detail["apply_urls"] = pdf_apply_urls
        if title_fields.get("advt_no"):
            detail["advt_no"] = title_fields["advt_no"]
        for key in ("application_fee", "how_to_apply", "selection_process", "fee"):
            if pdf.get(key):
                detail[key] = pdf[key]

        merged_text = " ".join(
            filter(
                None,
                [title, raw.get("summary"), pdf.get("summary")],
            )
        )
        stored = (
            pdf.get("vacancies")
            or title_fields.get("vacancies")
            or text_fields.get("vacancies")
            or raw.get("vacancies")
            or 0
        )
        vacancies = resolve_vacancies(int(stored) if stored else 0, title, merged_text)
        last_date = (
            pdf.get("last_date")
            or raw.get("last_date")
            or title_fields.get("last_date")
            or text_fields.get("last_date")
        )
        if last_date:
            last_date = to_iso_date(last_date) or last_date
        qualification = (
            pdf.get("qualification")
            or raw.get("qualification")
            or title_fields.get("qualification")
            or text_fields.get("qualification")
        )

        html_apply = None
        if apply_url and not re.search(r"\.pdf(\?|/|$)", str(apply_url), re.I):
            if not looks_like_notification_document(str(apply_url)):
                html_apply = apply_url
        if not html_apply:
            for u in pdf_apply_urls:
                if u and not looks_like_notification_document(str(u)):
                    html_apply = u
                    break

        return {
            "title": clean_job_title(title),
            "apply_url": html_apply,
            "pdf_urls": merged_pdfs,
            "dept": dept,
            "state": state,
            "category": category,
            "vacancies": vacancies,
            "qualification": qualification,
            "salary": pdf.get("salary") or raw.get("salary"),
            "age_limit": pdf.get("age_limit") or raw.get("age_limit"),
            "application_fee": pdf.get("application_fee") or raw.get("application_fee"),
            "how_to_apply": pdf.get("how_to_apply") or raw.get("how_to_apply"),
            "selection_process": pdf.get("selection_process") or raw.get("selection_process"),
            "last_date": last_date,
            "published_at": published_dt,
            "detail": detail,
        }
