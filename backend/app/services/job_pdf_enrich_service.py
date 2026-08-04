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
from app.services.job_completeness_service import calculate_completeness
from app.services.job_persist_service import _parse_date
from app.services.noise_filter import sanitize_json_for_postgres, strip_postgres_control_chars
from app.services.pdf_candidate import (
    enrichment_meets_quality,
    select_primary_pdf,
    validate_extracted_dates,
)
from app.utils.job_details_storage import upload_job_detail_json
from app.utils.official_hosts import looks_like_notification_document, pick_best_official_url
from app.parsers.pdf_parser import is_weak_field
from app.utils.slim_detail import slim_detail_for_db
from app.utils.vacancy_extract import sanitize_vacancies


def job_row_for_pdf_prep(job: Job) -> dict[str, Any]:
    """Plain row for PDF fetch — safe to use after the DB session is closed."""
    return {
        "title": job.title,
        "apply_url": job.apply_url,
        "detail": dict(job.detail or {}),
        "primary_pdf_url": getattr(job, "primary_pdf_url", None),
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
    """Only build sections from summaries that already look like recruitment notices."""
    text = str(summary or "").strip()
    if len(text) < 300:
        return []
    lowered = text.lower()
    signals = (
        "qualification",
        "vacancy",
        "last date",
        "age limit",
        "salary",
        "application fee",
        "selection process",
        "how to apply",
    )
    if sum(1 for s in signals if s in lowered) < 3:
        return []
    sections = text_to_content_sections(text, pdf_url=pdf_url)
    if sections:
        return sections
    return [
        {
            "heading": "Overview",
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
    primary_hint = row.get("primary_pdf_url") or detail.get("primary_pdf_url")
    if primary_hint:
        pdf_urls.insert(0, str(primary_hint))

    pdf_urls = await ensure_pdf_urls(
        pdf_urls,
        apply_url if apply_url and ".pdf" not in str(apply_url).lower() else None,
    )
    primary, score, scored = select_primary_pdf(pdf_urls, min_score=0)
    if score < 0 or not primary:
        # Do not read result/admit-card/tender PDFs.
        return PdfEnrichmentPrep(
            pdf_fields={
                "review_reasons": [f"No usable primary PDF (best_score={score})"],
                "pdf_scores": scored[:8],
            },
            norm={"detail": detail},
        )

    ordered = [primary] + [u for u in pdf_urls if u != primary]
    pdf_fields = await merge_pdf_fields(ordered[:3]) if ordered else {}
    pdf_fields["primary_pdf_url"] = primary
    pdf_fields["pdf_score"] = score
    norm = parser.parse(
        {
            "title": row.get("title"),
            "link": apply_url,
            "pdfUrls": ordered,
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

    if pdf_fields.get("review_reasons") and not pdf_fields.get("summary") and not pdf_fields.get("content_sections"):
        reasons = list(getattr(job, "review_reasons", None) or [])
        reasons.extend(list(pdf_fields.get("review_reasons") or []))
        job.review_reasons = reasons[:40]
        job.verification_status = "NEEDS_REVIEW"
        detail["pdf_scores"] = pdf_fields.get("pdf_scores")
        detail["extraction_quality_errors"] = pdf_fields.get("review_reasons")
        job.detail = sanitize_json_for_postgres(slim_detail_for_db(detail, status=str(job.status or "draft")))
        return PdfEnrichmentResult(changed=True, full_detail=detail)

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

    # Fill gaps only — never invent; overwrite placeholders with real PDF values.
    if norm.get("qualification") and is_weak_field(job.qualification):
        job.qualification = strip_postgres_control_chars(norm["qualification"]) or None
        changed = True
    if pdf_fields.get("salary") and is_weak_field(job.salary):
        job.salary = strip_postgres_control_chars(pdf_fields["salary"]) or None
        changed = True
    if pdf_fields.get("age_limit") and is_weak_field(job.age_limit):
        job.age_limit = strip_postgres_control_chars(pdf_fields["age_limit"]) or None
        changed = True

    for key in ("street_address", "streetAddress", "postal_code", "postalCode", "pincode"):
        value = pdf_fields.get(key)
        if value and is_weak_field(detail.get(key)):
            detail[key] = strip_postgres_control_chars(str(value))
            changed = True
    # Normalize aliases for frontend JobPosting schema.
    street = detail.get("streetAddress") or detail.get("street_address")
    pin = detail.get("postalCode") or detail.get("postal_code") or detail.get("pincode")
    if street:
        detail["streetAddress"] = street
        detail["street_address"] = street
    if pin:
        detail["postalCode"] = pin
        detail["postal_code"] = pin
        detail["pincode"] = pin

    if nd.get("pdf_url") and not detail.get("pdf_url"):
        detail["pdf_url"] = nd["pdf_url"]
        changed = True
    if nd.get("pdf_urls") and not detail.get("pdf_urls"):
        detail["pdf_urls"] = nd["pdf_urls"]
        changed = True
    if pdf_fields.get("summary"):
        prev = str(detail.get("summary") or "")
        chunk = str(pdf_fields["summary"]).strip()
        if chunk and (chunk not in prev or len(chunk) > len(prev)):
            detail["summary"] = chunk[:12_000]
            changed = True
    if pdf_fields.get("content_sections"):
        detail["content_sections"] = pdf_fields["content_sections"]
        detail["memorized_at"] = datetime.now(timezone.utc).isoformat()
        changed = True

    for key in ("fee", "application_fee", "selection_process", "how_to_apply", "documents_required"):
        if pdf_fields.get(key) and not detail.get(key):
            detail[key] = pdf_fields[key]
            changed = True
    # Prefer richer fee / selection blobs from PDF when present.
    if isinstance(pdf_fields.get("fee"), dict) and pdf_fields["fee"]:
        detail["fee"] = pdf_fields["fee"]
        changed = True
    if isinstance(pdf_fields.get("selection_process"), list) and pdf_fields["selection_process"]:
        detail["selection_process"] = pdf_fields["selection_process"]
        changed = True
    if isinstance(pdf_fields.get("how_to_apply"), list) and pdf_fields["how_to_apply"]:
        detail["how_to_apply"] = pdf_fields["how_to_apply"]
        changed = True
    if isinstance(pdf_fields.get("documents_required"), list) and pdf_fields["documents_required"]:
        detail["documents_required"] = pdf_fields["documents_required"]
        changed = True

    # Date plausibility — conflicting dates go to review, not live authority.
    pub_date = job.published_at.date() if job.published_at else None
    date_errors = validate_extracted_dates(pub_date, job.last_date)
    if date_errors:
        detail["date_validation_errors"] = date_errors
        job.verification_status = "NEEDS_REVIEW"
        job.published_to_site = False
        if job.status == "live":
            job.status = "draft"
        reasons = list(getattr(job, "review_reasons", None) or detail.get("review_reasons") or [])
        reasons.extend(date_errors)
        job.review_reasons = reasons[:40]
        changed = True

    quality_ok, quality_reasons = enrichment_meets_quality(
        summary=str(detail.get("summary") or pdf_fields.get("summary") or ""),
        sections=detail.get("content_sections") or pdf_fields.get("content_sections") or [],
        fields={
            "vacancies": job.vacancies or pdf_fields.get("vacancies"),
            "qualification": job.qualification or pdf_fields.get("qualification"),
            "salary": job.salary or pdf_fields.get("salary"),
            "age_limit": job.age_limit or pdf_fields.get("age_limit"),
            "last_date": job.last_date or pdf_fields.get("last_date"),
            "application_fee": pdf_fields.get("application_fee") or detail.get("application_fee"),
            "selection_process": pdf_fields.get("selection_process") or detail.get("selection_process"),
        },
    )
    if changed and not quality_ok:
        # Do not mark memorized for weak extractions.
        detail.pop("memorized_at", None)
        detail["extraction_quality_errors"] = quality_reasons
        job.verification_status = "NEEDS_REVIEW"
        reasons = list(getattr(job, "review_reasons", None) or [])
        reasons.extend(quality_reasons)
        if pdf_fields.get("review_reasons"):
            reasons.extend(list(pdf_fields["review_reasons"]))
        job.review_reasons = reasons[:40]
        return PdfEnrichmentResult(changed=True, full_detail=detail)

    if quality_ok and (detail.get("content_sections") or len(str(detail.get("summary") or "")) >= 200):
        detail["memorized_at"] = detail.get("memorized_at") or datetime.now(timezone.utc).isoformat()
        detail["detail_source"] = "pdf"
        if pdf_fields.get("primary_pdf_url"):
            detail["primary_pdf_url"] = pdf_fields["primary_pdf_url"]
            job.primary_pdf_url = str(pdf_fields["primary_pdf_url"])
            _ensure_pdf_list(detail, job.primary_pdf_url)
        # Evidence blob for key fields
        evidence = dict(getattr(job, "source_evidence", None) or detail.get("source_evidence") or {})
        for field_key in ("last_date", "vacancies", "qualification", "salary", "age_limit"):
            value = getattr(job, field_key, None) if hasattr(job, field_key) else detail.get(field_key)
            if value:
                evidence[field_key] = {
                    "value": str(value),
                    "type": "pdf",
                    "source": job.primary_pdf_url or detail.get("pdf_url"),
                    "confidence": 0.85 if quality_ok else 0.4,
                }
        job.source_evidence = evidence
        detail["source_evidence"] = evidence
        changed = True

        score, missing = calculate_completeness(
            {
                "title": job.title,
                "dept": job.dept,
                "apply_url": job.apply_url,
                "source_url": job.source_url,
                "last_date": job.last_date,
                "vacancies": job.vacancies,
                "qualification": job.qualification,
                "salary": job.salary,
                "age_limit": job.age_limit,
                "detail": detail,
            }
        )
        job.completeness_score = score
        detail["completeness_score"] = score
        detail["missing_fields"] = missing

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
            built = _sections_from_summary(
                summary,
                pdf_url=str(detail.get("pdf_url") or job.primary_pdf_url or "") or None,
            )
            if built:
                detail["content_sections"] = built

        full_detail = dict(detail)
        if job.slug and (full_detail.get("content_sections") or len(str(full_detail.get("summary") or "")) >= 200):
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
        "streetAddress": d.get("streetAddress") or d.get("street_address"),
        "postalCode": d.get("postalCode") or d.get("postal_code") or d.get("pincode"),
        "detail": d,
    }
