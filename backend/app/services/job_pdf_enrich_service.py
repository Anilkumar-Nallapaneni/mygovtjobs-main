"""Read official PDFs for a job and persist structured detail (vacancies, sections, dates)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.job import Job
from app.parsers.notification_parser import NotificationParser
from app.parsers.pdf_enrich import merge_pdf_fields
from app.parsers.pdf_sections import text_to_content_sections
from app.scrapers.pdf_discover import ensure_pdf_urls
from app.services.job_child_service import sync_job_children
from app.services.job_persist_service import _parse_date
from app.services.noise_filter import sanitize_json_for_postgres, strip_postgres_control_chars
from app.utils.job_details_storage import upload_job_detail_json
from app.utils.official_hosts import looks_like_notification_document, pick_best_official_url
from app.utils.slim_detail import slim_detail_for_db
from app.utils.vacancy_extract import sanitize_vacancies


def job_row_for_pdf_prep(job: Job) -> dict[str, Any]:
    """Plain row for PDF fetch — safe to use after the DB session is closed."""
    return {
        "title": job.title,
        "apply_url": job.apply_url,
        "detail": dict(job.detail or {}),
    }


@dataclass
class PdfEnrichmentPrep:
    pdf_fields: dict[str, Any]
    norm: dict[str, Any]


@dataclass
class PdfEnrichmentResult:
    changed: bool
    full_detail: dict[str, Any] | None = None


def _sections_from_summary(summary: str, *, pdf_url: str | None = None) -> list[dict[str, Any]]:
    text = str(summary or "").strip()
    if len(text) < 40:
        return []
    sections = text_to_content_sections(text, pdf_url=pdf_url)
    if sections:
        return sections
    return [
        {
            "heading": "Notification",
            "paragraphs": [text[:12_000]],
            "tables": [],
            "lists": [],
            "links": [],
        }
    ]


def _ensure_pdf_list(detail: dict[str, Any], url: str | None) -> None:
    if not url:
        return
    pdfs = list(detail.get("pdf_urls") or detail.get("pdfUrls") or [])
    if url not in pdfs:
        pdfs.insert(0, url)
    detail["pdf_urls"] = pdfs[:8]
    if not detail.get("pdf_url"):
        detail["pdf_url"] = url


async def prepare_pdf_enrichment(row: dict[str, Any], parser: NotificationParser) -> PdfEnrichmentPrep:
    """Download/parse PDFs (slow network I/O) without holding a DB connection."""
    detail = dict(row.get("detail") or {})
    pdf_urls = list(detail.get("pdf_urls") or detail.get("pdfUrls") or [])
    apply_url = row.get("apply_url")
    if apply_url and ".pdf" in str(apply_url).lower():
        pdf_urls.insert(0, apply_url)

    pdf_urls = await ensure_pdf_urls(
        pdf_urls,
        apply_url if apply_url and ".pdf" not in str(apply_url).lower() else None,
    )
    pdf_fields = await merge_pdf_fields(pdf_urls) if pdf_urls else {}
    norm = parser.parse(
        {
            "title": row.get("title"),
            "link": apply_url,
            "pdfUrls": pdf_urls,
            "source": detail.get("source"),
        },
        pdf_fields=pdf_fields,
    )
    return PdfEnrichmentPrep(pdf_fields=pdf_fields, norm=norm)


async def apply_pdf_enrichment(
    session: AsyncSession,
    job: Job,
    parser: NotificationParser,
    prep: PdfEnrichmentPrep,
    *,
    upload_storage: bool = True,
) -> PdfEnrichmentResult:
    """Persist prepared PDF fields — keep DB session open only for writes."""
    _ = parser
    pdf_fields = prep.pdf_fields
    norm = prep.norm
    detail = dict(job.detail or {})
    changed = False
    nd = norm.get("detail") or {}
    new_vac = int(norm.get("vacancies") or 0)
    old_vac = int(job.vacancies or 0)
    if new_vac and (not old_vac or sanitize_vacancies(old_vac, job.title or "") == 0):
        job.vacancies = new_vac
        changed = True
    if norm.get("last_date"):
        parsed_last = _parse_date(norm["last_date"])
        if parsed_last and parsed_last != job.last_date:
            job.last_date = parsed_last
            changed = True
    pub = norm.get("published_at")
    if pub:
        if isinstance(pub, datetime):
            parsed_pub = pub if pub.tzinfo else pub.replace(tzinfo=timezone.utc)
        else:
            parsed_pub = _parse_date(pub)
            if parsed_pub:
                parsed_pub = datetime(
                    parsed_pub.year, parsed_pub.month, parsed_pub.day, tzinfo=timezone.utc
                )
            else:
                parsed_pub = None
        if parsed_pub and (
            not job.published_at
            or (job.last_date and job.published_at.date() == job.last_date)
        ):
            job.published_at = parsed_pub
            changed = True
        if parsed_pub and nd.get("published"):
            detail["published"] = nd["published"]
            changed = True

    if norm.get("qualification") and not job.qualification:
        job.qualification = strip_postgres_control_chars(norm["qualification"]) or None
        changed = True
    if pdf_fields.get("salary") and not job.salary:
        job.salary = strip_postgres_control_chars(pdf_fields["salary"]) or None
        changed = True
    if pdf_fields.get("age_limit") and not job.age_limit:
        job.age_limit = strip_postgres_control_chars(pdf_fields["age_limit"]) or None
        changed = True

    if nd.get("pdf_url") and not detail.get("pdf_url"):
        detail["pdf_url"] = nd["pdf_url"]
        changed = True
    if nd.get("pdf_urls") and not detail.get("pdf_urls"):
        detail["pdf_urls"] = nd["pdf_urls"]
        changed = True
    if pdf_fields.get("summary"):
        prev = str(detail.get("summary") or "")
        chunk = str(pdf_fields["summary"]).strip()
        if chunk and chunk not in prev:
            detail["summary"] = chunk[:12_000]
            changed = True
    if pdf_fields.get("content_sections"):
        detail["content_sections"] = pdf_fields["content_sections"]
        detail["memorized_at"] = datetime.now(timezone.utc).isoformat()
        changed = True
    elif pdf_fields.get("summary") and len(str(pdf_fields.get("summary") or "").strip()) >= 40:
        detail["memorized_at"] = datetime.now(timezone.utc).isoformat()
        changed = True
    if pdf_fields.get("apply_urls"):
        detail["apply_urls"] = pdf_fields["apply_urls"]
        changed = True
        best_apply = pick_best_official_url(
            list(pdf_fields.get("apply_urls") or [])
            + ([job.apply_url] if job.apply_url else [])
        )
        if best_apply and not looks_like_notification_document(best_apply):
            if job.apply_url != best_apply:
                job.apply_url = best_apply
                changed = True

    # Never keep a PDF (or notification document) as the apply destination.
    if job.apply_url and looks_like_notification_document(str(job.apply_url)):
        _ensure_pdf_list(detail, job.apply_url)
        best_apply = pick_best_official_url(list(detail.get("apply_urls") or []))
        job.apply_url = (
            best_apply
            if best_apply and not looks_like_notification_document(best_apply)
            else None
        )
        changed = True

    if changed:
        if not detail.get("content_sections"):
            summary = str(detail.get("summary") or "").strip()
            if len(summary) >= 40:
                built = _sections_from_summary(
                    summary,
                    pdf_url=str(detail.get("pdf_url") or "") or None,
                )
                if built:
                    detail["content_sections"] = built

        full_detail = dict(detail)
        if job.slug and (full_detail.get("content_sections") or full_detail.get("summary")):
            payload = job_to_detail_payload(job, full_detail)
            if upload_storage:
                upload_job_detail_json(str(job.slug), payload)

        detail = slim_detail_for_db(full_detail, status=str(job.status or "live"))
        if full_detail.get("memorized_at"):
            detail["memorized_at"] = full_detail["memorized_at"]
        if full_detail.get("detail_source"):
            detail["detail_source"] = full_detail["detail_source"]
        job.detail = sanitize_json_for_postgres(detail)

        if full_detail.get("content_sections"):
            # Temporarily restore sections for child sync, then keep slim on job.detail.
            job.detail = sanitize_json_for_postgres(full_detail)
            await sync_job_children(session, job)
            job.detail = sanitize_json_for_postgres(detail)

        return PdfEnrichmentResult(changed=True, full_detail=full_detail)

    return PdfEnrichmentResult(changed=False, full_detail=None)


async def enrich_job_from_pdfs(
    session: AsyncSession,
    job: Job,
    parser: NotificationParser,
    *,
    upload_storage: bool = True,
) -> bool:
    """Fetch PDFs, merge fields into job.detail, sync child rows. Returns True if mutated."""
    prep = await prepare_pdf_enrichment(job_row_for_pdf_prep(job), parser)
    result = await apply_pdf_enrichment(session, job, parser, prep, upload_storage=upload_storage)
    return result.changed


def job_to_detail_payload(job: Job, detail: dict | None = None) -> dict:
    """Serialize job + detail for static JSON / Supabase Storage."""
    d = detail if detail is not None else dict(job.detail or {})
    return {
        "id": str(job.id),
        "slug": job.slug,
        "title": job.title,
        "dept": job.dept,
        "category": job.category,
        "state_codes": list(job.state_codes or []),
        "vacancies": job.vacancies or 0,
        "qualification": job.qualification,
        "salary": job.salary,
        "age_limit": job.age_limit,
        "last_date": job.last_date.isoformat() if job.last_date else None,
        "apply_url": job.apply_url,
        "status": job.status,
        "published_at": job.published_at.isoformat() if job.published_at else None,
        "detail": d,
    }
