"""Persist normalized ingest rows to Postgres and JSON snapshot for the UI."""

import json
import logging
import os
import re
from datetime import date, datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.job import Job
from app.scrapers.date_utils import parse_published
from app.services.dedupe_service import content_hash, title_fingerprint
from app.services.document_classifier import classify_document, classify_from_normalized
from app.services.job_completeness_service import calculate_completeness
from app.services.noise_filter import clean_job_title, sanitize_json_for_postgres, strip_postgres_control_chars
from app.services.pdf_candidate import select_primary_pdf
from app.services.publish_gate import resolve_persist_status
from app.utils.catalog_job_count import count_catalog_display_jobs
from app.utils.slim_detail import slim_detail_for_db
from app.utils.live_jobs_export import slim_job_for_json_export, slim_job_for_list_json_export

_slug_re = re.compile(r"[^a-z0-9]+")


def slugify(
    title: str,
    digest: str,
    *,
    dept: str | None = None,
    published_year: int | str | None = None,
    source_url: str | None = None,
) -> str:
    """Build a stable slug from org + title + year + source identity."""
    parts = [dept or "", title or "job", str(published_year or ""), source_url or ""]
    identity = "-".join(p for p in parts if p)
    base = _slug_re.sub("-", identity.lower()).strip("-")[:80] or "job"
    return f"{base}-{digest[:8]}"


def _resolve_state_codes(normalized: dict) -> list[str]:
    """Nationwide listings use [] in DB; single-state PSC uses e.g. ['ap']."""
    explicit = normalized.get("state_codes")
    if explicit is not None:
        codes = [str(c).lower()[:8] for c in explicit if c and str(c).lower() not in ("all", "all india")]
        return codes
    state_raw = str(normalized.get("state") or "").strip().lower()
    if not state_raw or state_raw in ("all", "all india"):
        source = str((normalized.get("detail") or {}).get("source") or normalized.get("source") or "")
        if source.startswith("psc-"):
            code = source[4:8]
            if code and code not in ("all", "india"):
                return [code]
        return []
    return [state_raw[:8]]


def _parse_date(value) -> date | None:
    if not value:
        return None
    if isinstance(value, date):
        return value
    text = str(value).strip()
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%d.%m.%Y", "%d %b %Y", "%d %B %Y"):
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    return None


def _resolve_published_at(normalized: dict) -> datetime | None:
    """Parse a real publish timestamp from ingest; None when unknown."""
    pub = normalized.get("published_at")
    if pub is None:
        detail = normalized.get("detail") or {}
        pub = detail.get("published")
    return parse_published(pub)


def _upsert_published_at(normalized: dict) -> datetime:
    """Published timestamp stored on insert and conflict update."""
    return _resolve_published_at(normalized) or datetime.now(timezone.utc)


def _resolve_vacancies(normalized: dict) -> int | None:
    raw = normalized.get("vacancies")
    if raw is None or raw == "":
        return None
    try:
        n = int(raw)
    except (TypeError, ValueError):
        return None
    return n if n > 0 else None


def _resolve_source_url(normalized: dict, apply_url: str | None) -> str | None:
    detail = normalized.get("detail") if isinstance(normalized.get("detail"), dict) else {}
    candidates = [
        normalized.get("source_url"),
        detail.get("source_url"),
        apply_url,
        detail.get("notification_url"),
    ]
    for c in candidates:
        if isinstance(c, str) and c.strip():
            return strip_postgres_control_chars(c.strip())
    return None


def _source_domain(url: str | None) -> str | None:
    if not url:
        return None
    try:
        host = (urlparse(url).hostname or "").lower()
        return host or None
    except Exception:
        return None


class JobPersistService:
    async def upsert_normalized(self, session: AsyncSession, normalized: dict, *, commit: bool = True) -> Job | None:
        title = clean_job_title(normalized.get("title"))
        if not title:
            return None

        settings = get_settings()
        apply_url = strip_postgres_control_chars(normalized.get("apply_url")) or None
        last_date = _parse_date(normalized.get("last_date"))
        digest = normalized.get("content_hash") or content_hash(
            title=title, apply_url=apply_url, last_date=str(last_date or "")
        )
        dept = strip_postgres_control_chars(normalized.get("dept")) or None
        published_at = _upsert_published_at(normalized)
        source_url = _resolve_source_url(normalized, apply_url)
        slug = normalized.get("slug") or slugify(
            title,
            digest,
            dept=dept,
            published_year=published_at.year if published_at else None,
            source_url=source_url,
        )
        state_codes = _resolve_state_codes(normalized)

        document_type = (
            str(normalized.get("document_type") or "").strip().upper()
            or classify_from_normalized({**normalized, "title": title, "apply_url": apply_url, "dept": dept})
        )
        explicit_verification = str(normalized.get("verification_status") or "").strip().upper() or None

        classification = classify_document(
            title,
            str((normalized.get("detail") or {}).get("summary") or ""),
            url=str(apply_url or source_url or ""),
            dept=str(dept or ""),
        )
        if not document_type or document_type == "UNKNOWN":
            document_type = classification.document_type

        completeness_score, missing_fields = calculate_completeness(
            {
                **normalized,
                "title": title,
                "dept": dept,
                "apply_url": apply_url,
                "source_url": source_url,
                "last_date": last_date,
                "vacancies": _resolve_vacancies(normalized),
            }
        )
        review_reasons = list(normalized.get("review_reasons") or [])
        if classification.reasons:
            review_reasons.extend(classification.reasons)
        if missing_fields:
            review_reasons.append(f"Missing fields: {', '.join(missing_fields[:8])}")
        if classification.content_type != "RECRUITMENT":
            review_reasons.append(f"Classifier: {classification.content_type}")

        detail_for_pdf = normalized.get("detail") if isinstance(normalized.get("detail"), dict) else {}
        pdf_candidates = (
            list(detail_for_pdf.get("pdf_urls") or detail_for_pdf.get("pdfUrls") or [])
            + ([apply_url] if apply_url and ".pdf" in apply_url.lower() else [])
        )
        primary_pdf, pdf_score, _ = select_primary_pdf(pdf_candidates, min_score=0)
        if pdf_score < 0:
            review_reasons.append(f"No positive primary PDF (best score={pdf_score})")
            primary_pdf = None

        job_status, verification_status, published_to_site, _gate_errors = resolve_persist_status(
            last_date=last_date,
            document_type=document_type,
            verification_status=explicit_verification or "UNVERIFIED",
            normalized={**normalized, "title": title, "dept": dept, "apply_url": apply_url, "source_url": source_url},
            auto_publish_verified=bool(settings.auto_publish_verified),
            completeness_score=completeness_score,
        )
        # Allow explicit status override only for expired (deadline) already handled;
        # never force live when auto-publish is off.
        if normalized.get("status") == "expired":
            job_status = "expired"
            published_to_site = False

        detail_blob = dict(normalized.get("detail") or {})
        post_name = strip_postgres_control_chars(normalized.get("post_name")) or None
        if post_name:
            detail_blob["post_name"] = post_name
        detail_blob["document_type"] = document_type
        detail_blob["verification_status"] = verification_status
        detail_blob["completeness_score"] = completeness_score
        detail_blob["classification"] = {
            "content_type": classification.content_type,
            "confidence": classification.confidence,
            "reasons": classification.reasons,
        }
        if primary_pdf:
            detail_blob["primary_pdf_url"] = primary_pdf
            detail_blob["pdf_url"] = detail_blob.get("pdf_url") or primary_pdf

        vacancies = _resolve_vacancies(normalized)

        row = {
            "slug": slug,
            "title": title,
            "dept": dept,
            "category": strip_postgres_control_chars(normalized.get("category")) or None,
            "state_codes": state_codes,
            "vacancies": vacancies,
            "qualification": strip_postgres_control_chars(normalized.get("qualification")) or None,
            "salary": strip_postgres_control_chars(normalized.get("salary")) or None,
            "age_limit": strip_postgres_control_chars(normalized.get("age_limit")) or None,
            "last_date": last_date,
            "apply_url": apply_url,
            "status": job_status,
            "published_at": published_at,
            "normalized_at": datetime.now(timezone.utc),
            "content_hash": digest,
            "title_fingerprint": title_fingerprint(title),
            "detail": sanitize_json_for_postgres(slim_detail_for_db(detail_blob, status=job_status)),
            "document_type": document_type,
            "verification_status": verification_status,
            "completeness_score": completeness_score,
            "published_to_site": published_to_site,
            "primary_pdf_url": primary_pdf,
            "source_evidence": sanitize_json_for_postgres(
                normalized.get("source_evidence")
                if isinstance(normalized.get("source_evidence"), dict)
                else {}
            ),
            "review_reasons": sanitize_json_for_postgres(review_reasons[:40]),
            "source_url": source_url,
            "source_domain": _source_domain(source_url),
            "confidence_score": classification.confidence,
        }

        stmt = (
            insert(Job)
            .values(**row)
            .on_conflict_do_update(
                index_elements=[Job.content_hash],
                set_={
                    "title": row["title"],
                    "dept": row["dept"],
                    "category": row["category"],
                    "state_codes": row["state_codes"],
                    "vacancies": row["vacancies"],
                    "last_date": row["last_date"],
                    "apply_url": row["apply_url"],
                    "published_at": row["published_at"],
                    "normalized_at": row["normalized_at"],
                    "detail": row["detail"],
                    "status": row["status"],
                    "title_fingerprint": row["title_fingerprint"],
                    "document_type": row["document_type"],
                    "verification_status": row["verification_status"],
                    "completeness_score": row["completeness_score"],
                    "published_to_site": row["published_to_site"],
                    "primary_pdf_url": row["primary_pdf_url"],
                    "source_evidence": row["source_evidence"],
                    "review_reasons": row["review_reasons"],
                    "source_url": row["source_url"],
                    "source_domain": row["source_domain"],
                    "confidence_score": row["confidence_score"],
                },
            )
            .returning(Job)
        )
        result = await session.execute(stmt)
        if commit:
            await session.commit()
        return result.scalar_one_or_none()

    async def export_live_jobs_json(self, session: AsyncSession) -> int:
        from app.services.job_service import JobService

        service = JobService()
        items = []
        offset = 0
        page_size = 1000
        total = None
        while total is None or offset < total:
            page, total = await service.list_jobs(limit=page_size, offset=offset, session=session)
            if not page:
                break
            items.extend(page)
            offset += len(page)

        slim_items = [slim_job_for_json_export(item) for item in items]
        list_items = [slim_job_for_list_json_export(item) for item in items]
        catalog_count = count_catalog_display_jobs(slim_items)

        # Guard against overwriting the shipped catalog with an empty payload
        # (transient DB session issues in the sync path have shipped empty
        # live-jobs.json to prod before). Set ALLOW_EMPTY_JSON_EXPORT=1 to
        # bypass in legitimate wipe/reset scenarios.
        if not slim_items and os.environ.get("ALLOW_EMPTY_JSON_EXPORT") != "1":
            logger.error(
                "export_live_jobs_json: refusing to write empty snapshot "
                "(list_jobs returned 0 rows). Set ALLOW_EMPTY_JSON_EXPORT=1 to override."
            )
            return 0

        daily_block: dict = {}
        try:
            from app.services.daily_sync_service import DailySyncService

            state = DailySyncService()._read()
            if state.get("status") == "completed":
                daily_block = {
                    "completedAt": state.get("completedAt"),
                    "completedAtIst": state.get("completedAtIst"),
                    "dateIst": state.get("lastCompletedDateIst"),
                    "nextRunAtIst": state.get("nextRunAtIst"),
                    "jobCount": catalog_count,
                    "sourcesScraped": state.get("sourcesScraped"),
                    "scheduledLabel": "8:00 AM IST daily",
                }
        except Exception:
            pass

        payload = {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "dailySync": daily_block or None,
            "items": slim_items,
        }
        path = Path(get_settings().live_jobs_json_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

        list_path = path.with_name("live-jobs-list.json")
        list_payload = {
            "generatedAt": payload["generatedAt"],
            "dailySync": payload["dailySync"],
            "items": list_items,
        }
        list_path.write_text(
            json.dumps(list_payload, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )
        return catalog_count

    def patch_live_jobs_daily_sync(self, block: dict) -> None:
        """Update dailySync in live-jobs.json after mark_completed (export runs while still 'running')."""
        if not block:
            return
        path = Path(get_settings().live_jobs_json_path)
        if not path.exists():
            return
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
            payload["dailySync"] = block
            path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        except Exception:
            pass
