"""Persist normalized ingest rows to Postgres and JSON snapshot for the UI."""

import json
import logging
import os
import re
from datetime import date, datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

from sqlalchemy import case, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.job import Job
from app.scrapers.date_utils import parse_published
from app.services.dedupe_service import content_hash, title_fingerprint
from app.services.document_classifier import classify_document, classify_from_normalized
from app.services.job_completeness_service import calculate_completeness
from app.services.noise_filter import (
    clean_job_title,
    clean_plain_text,
    sanitize_json_for_postgres,
    sanitize_source_text_fields,
    strip_postgres_control_chars,
)
from app.services.pdf_candidate import select_primary_pdf
from app.services.publish_gate import ValidationResult, resolve_persist_status, validate_job_for_publication
from app.utils.catalog_job_count import count_catalog_display_jobs
from app.utils.slim_detail import slim_detail_for_db
from app.utils.live_jobs_export import slim_job_for_json_export, slim_job_for_list_json_export

_slug_re = re.compile(r"[^a-z0-9]+")
_PUBLIC_VERIFICATION_STATUSES = ("VERIFIED", "PARTIALLY_VERIFIED")
_SNAPSHOT_DROP_GUARD_MIN_EXISTING = 100
_SNAPSHOT_DROP_GUARD_RATIO = 0.5


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


def _should_preserve_public_gate_on_conflict(*, status: str | None, published_to_site: bool | None) -> bool:
    """Keep admin/publication decisions when a re-scrape would only send a row back to review."""
    return status != "expired" and not bool(published_to_site)


def _is_dramatic_snapshot_drop(existing_count: int | None, next_count: int) -> bool:
    if existing_count is None or existing_count < _SNAPSHOT_DROP_GUARD_MIN_EXISTING:
        return False
    return next_count < int(existing_count * _SNAPSHOT_DROP_GUARD_RATIO)


def _snapshot_looks_like_ungated_feed_dump(payload: dict | None) -> bool:
    """RSS/HTML feed dumps lack publish-gate fields; never block replacing them."""
    if not isinstance(payload, dict):
        return False
    items = payload.get("items")
    if not isinstance(items, list) or not items:
        return False
    sample = items[: min(40, len(items))]
    unapproved = sum(1 for row in sample if not isinstance(row, dict) or row.get("published_to_site") is not True)
    no_deadline = sum(
        1
        for row in sample
        if not isinstance(row, dict) or not str(row.get("last_date") or "").strip()
    )
    return unapproved >= max(1, int(len(sample) * 0.5)) or no_deadline >= max(1, int(len(sample) * 0.5))


class JobPersistService:
    async def _existing_job_for_identity(
        self,
        session: AsyncSession,
        *,
        digest: str,
        source_url: str | None,
    ) -> Job | None:
        existing = await session.execute(select(Job).where(Job.content_hash == digest).limit(1))
        job = existing.scalar_one_or_none()
        if job or not source_url:
            return job

        existing = await session.execute(select(Job).where(Job.source_url == source_url).limit(1))
        return existing.scalar_one_or_none()

    @staticmethod
    def _keep_existing_public_gate(job: Job) -> bool:
        return (
            getattr(job, "status", None) == "live"
            and bool(getattr(job, "published_to_site", False))
            and getattr(job, "verification_status", None) in _PUBLIC_VERIFICATION_STATUSES
        )

    async def upsert_normalized(self, session: AsyncSession, normalized: dict, *, commit: bool = True) -> Job | None:
        raw_payload = sanitize_json_for_postgres(dict(normalized))
        normalized = sanitize_source_text_fields(normalized)
        title = clean_job_title(normalized.get("title"))
        if not title:
            from app.services.job_review_service import JobReviewService

            await JobReviewService().enqueue(
                session,
                raw_payload=raw_payload,
                normalized_payload=normalized,
                validation=ValidationResult(
                    valid=False,
                    errors=["Missing title after sanitization"],
                    confidence=0,
                ),
                source_url=_resolve_source_url(normalized, normalized.get("apply_url")),
            )
            if commit:
                await session.commit()
            return None

        settings = get_settings()
        apply_url = strip_postgres_control_chars(normalized.get("apply_url")) or None
        last_date = _parse_date(normalized.get("last_date"))
        digest = normalized.get("content_hash") or content_hash(
            title=title, apply_url=apply_url, last_date=str(last_date or "")
        )
        dept = clean_plain_text(normalized.get("dept") or normalized.get("organization")) or None
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

        gate_normalized = {
            **normalized,
            "title": title,
            "dept": dept,
            "apply_url": apply_url,
            "source_url": source_url,
            "state_codes": state_codes,
            "vacancies": _resolve_vacancies(normalized),
        }
        job_status, verification_status, published_to_site, gate_errors = resolve_persist_status(
            last_date=last_date,
            document_type=document_type,
            verification_status=explicit_verification or "UNVERIFIED",
            normalized=gate_normalized,
            auto_publish_verified=bool(settings.auto_publish_verified),
            completeness_score=completeness_score,
        )
        validation = validate_job_for_publication(
            {
                **gate_normalized,
                "last_date": last_date,
                "document_type": document_type,
                "verification_status": "VERIFIED" if settings.auto_publish_verified else verification_status,
                "completeness_score": completeness_score,
            }
        )
        # Allow explicit status override only for expired (deadline) already handled;
        # never force live when auto-publish is off.
        if normalized.get("status") == "expired":
            job_status = "expired"
            published_to_site = False

        detail_blob = dict(normalized.get("detail") or {})
        post_name = clean_plain_text(normalized.get("post_name")) or None
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
            "category": clean_plain_text(normalized.get("category")) or None,
            "state_codes": state_codes,
            "vacancies": vacancies,
            "qualification": clean_plain_text(normalized.get("qualification")) or None,
            "salary": clean_plain_text(normalized.get("salary")) or None,
            "age_limit": clean_plain_text(normalized.get("age_limit")) or None,
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
            "publication_confidence": validation.confidence,
        }

        preserve_public_gate = None
        if _should_preserve_public_gate_on_conflict(
            status=row["status"],
            published_to_site=row["published_to_site"],
        ):
            preserve_public_gate = (
                (Job.status == "live")
                & (Job.published_to_site.is_(True))
                & (Job.verification_status.in_(_PUBLIC_VERIFICATION_STATUSES))
            )

        def preserve_gate_value(value, existing_column):
            if preserve_public_gate is None:
                return value
            return case((preserve_public_gate, existing_column), else_=value)

        last_date_update = (
            preserve_gate_value(row["last_date"], Job.last_date)
            if row["last_date"] is None
            else row["last_date"]
        )

        update_values = {
            "title": row["title"],
            "dept": row["dept"],
            "category": row["category"],
            "state_codes": row["state_codes"],
            "vacancies": row["vacancies"],
            "last_date": last_date_update,
            "apply_url": row["apply_url"],
            "published_at": row["published_at"],
            "normalized_at": row["normalized_at"],
            "detail": row["detail"],
            "status": preserve_gate_value(row["status"], Job.status),
            "title_fingerprint": row["title_fingerprint"],
            "document_type": preserve_gate_value(row["document_type"], Job.document_type),
            "verification_status": preserve_gate_value(row["verification_status"], Job.verification_status),
            "completeness_score": preserve_gate_value(row["completeness_score"], Job.completeness_score),
            "published_to_site": preserve_gate_value(row["published_to_site"], Job.published_to_site),
            "primary_pdf_url": row["primary_pdf_url"],
            "source_evidence": row["source_evidence"],
            "review_reasons": row["review_reasons"],
            "source_url": row["source_url"],
            "source_domain": row["source_domain"],
            "confidence_score": row["confidence_score"],
            "publication_confidence": preserve_gate_value(
                row["publication_confidence"],
                Job.publication_confidence,
            ),
        }

        gate_fields = {
            "status",
            "document_type",
            "verification_status",
            "completeness_score",
            "published_to_site",
            "publication_confidence",
        }

        persisted_job = await self._existing_job_for_identity(
            session, digest=digest, source_url=source_url
        )
        if persisted_job:
            keep_gate = preserve_public_gate is not None and self._keep_existing_public_gate(
                persisted_job
            )
            python_updates = {
                **{
                    key: row[key]
                    for key in update_values
                    if key not in gate_fields or not keep_gate
                },
                "slug": row["slug"],
                "content_hash": row["content_hash"],
            }
            if row["last_date"] is None and keep_gate:
                python_updates.pop("last_date", None)
            elif row["last_date"] is not None:
                python_updates["last_date"] = row["last_date"]
            for key, value in python_updates.items():
                setattr(persisted_job, key, value)
            await session.flush()
        else:
            stmt = (
                insert(Job)
                .values(**row)
                .on_conflict_do_update(
                    index_elements=[Job.content_hash],
                    set_=update_values,
                )
                .returning(Job)
            )
            result = await session.execute(stmt)
            persisted_job = result.scalar_one_or_none()
        if persisted_job is not None and not bool(getattr(persisted_job, "published_to_site", False)):
            from app.services.job_review_service import JobReviewService

            quarantine_errors = list(dict.fromkeys([*gate_errors, *validation.errors]))
            await JobReviewService().enqueue(
                session,
                raw_payload=raw_payload,
                normalized_payload={**normalized, **row},
                validation=ValidationResult(
                    valid=False,
                    errors=quarantine_errors or ["Manual approval required"],
                    warnings=validation.warnings,
                    confidence=validation.confidence,
                ),
                source_url=source_url,
                fingerprint=digest,
            )
        if commit:
            await session.commit()
        return persisted_job

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
        existing_count: int | None = None
        existing_payload: dict | None = None
        if path.exists():
            try:
                existing_payload = json.loads(path.read_text(encoding="utf-8"))
                existing_items = existing_payload.get("items")
                if isinstance(existing_items, list):
                    existing_count = len(existing_items)
            except Exception:
                existing_count = None
                existing_payload = None
        allow_drastic = os.environ.get("ALLOW_DRASTIC_JSON_EXPORT") == "1"
        replacing_feed_dump = _snapshot_looks_like_ungated_feed_dump(existing_payload)
        if (
            _is_dramatic_snapshot_drop(existing_count, len(slim_items))
            and not allow_drastic
            and not replacing_feed_dump
        ):
            logger.error(
                "export_live_jobs_json: refusing to replace %s-row snapshot with %s rows. "
                "Set ALLOW_DRASTIC_JSON_EXPORT=1 to override.",
                existing_count,
                len(slim_items),
            )
            return existing_count or 0
        if replacing_feed_dump and existing_count and existing_count != len(slim_items):
            logger.warning(
                "export_live_jobs_json: replacing ungated feed dump (%s rows) with gated export (%s rows)",
                existing_count,
                len(slim_items),
            )
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
