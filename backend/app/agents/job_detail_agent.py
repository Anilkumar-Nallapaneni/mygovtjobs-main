"""JobDetailAgent — build job detail UI payload from PDF or notification (source of truth)."""

from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import select

from app.agents.job_detail_sections import (
    _attach_extracted_fields,
    _attach_verification_section,
    _infer_detail_source,
    _is_placeholder_sections,
    _load_existing_static_detail,
    _normalize_sections,
    _pending_verification_sections,
    _resolve_repo_root,
    _section_body_chars,
    _sections_from_summary,
    _summary_has_job_signals,
)
from app.database.retry import is_transient_db_error
from app.database.session import SessionLocal
from app.models.job import Job
from app.parsers.pdf_dates import extract_dates_from_text, prefer_apply_date
from app.services.job_child_service import sync_job_children
from app.services.job_completeness_service import PUBLISH_MIN_SCORE, calculate_completeness, publication_tier
from app.services.job_persist_service import JobPersistService, _parse_date
from app.services.job_pdf_enrich_service import job_to_detail_payload
from app.services.noise_filter import sanitize_json_for_postgres
from app.utils.job_details_storage import upload_job_detail_json
from app.utils.slim_detail import slim_detail_for_db
from app.utils.vacancy_extract import resolve_vacancies

logger = logging.getLogger(__name__)

class JobDetailAgent:
    """
    Agent 3 — after live ingest + PDF read, publish job detail for the portal UI.

    Priority: PDF memorized > official notification > live listing scrape.
    """

    def __init__(self, *, repo_root: Path | None = None):
        self.persist = JobPersistService()
        root = repo_root or _resolve_repo_root()
        self.detail_dir = root / "frontend" / "public" / "data" / "job-details"

    async def run(
        self,
        *,
        limit: int = 0,
        live_only: bool = True,
        only_missing_sections: bool = False,
        concurrency: int = 4,
        upload_storage: bool = True,
        export_live_json: bool = True,
        write_static: bool = True,
    ) -> dict[str, Any]:
        statuses = ("live",) if live_only else ("live", "expired", "draft", "pending")
        sem = asyncio.Semaphore(max(1, concurrency))
        stats: dict[str, Any] = {
            "scanned": 0,
            "updated": 0,
            "skipped": 0,
            "held": 0,
            "failed": 0,
            "by_source": {"pdf": 0, "notification": 0, "listing": 0},
        }

        async with SessionLocal() as session:
            rows = (
                await session.execute(
                    select(Job).where(Job.status.in_(statuses)).order_by(Job.published_at.desc())
                )
            ).scalars().all()

            candidates: list[Job] = []
            for job in rows:
                detail = job.detail or {}
                has_summary = len(str(detail.get("summary") or "").strip()) >= 40
                db_sections = [s for s in (detail.get("content_sections") or []) if isinstance(s, dict)]
                existing = _load_existing_static_detail(self.detail_dir, job.slug)
                static_sections = [
                    s for s in ((existing or {}).get("content_sections") or []) if isinstance(s, dict)
                ]
                if existing and len(str(existing.get("summary") or "").strip()) > len(
                    str(detail.get("summary") or "").strip()
                ):
                    has_summary = True

                has_real_sections = (
                    (not _is_placeholder_sections(db_sections) and bool(db_sections))
                    or (not _is_placeholder_sections(static_sections) and bool(static_sections))
                )
                has_placeholder_only = (
                    (_is_placeholder_sections(db_sections) and bool(db_sections))
                    or (_is_placeholder_sections(static_sections) and bool(static_sections))
                )

                if only_missing_sections and has_real_sections and not has_placeholder_only:
                    stats["skipped"] += 1
                    continue
                if not has_summary and not db_sections and not static_sections:
                    stats["skipped"] += 1
                    continue
                candidates.append(job)

            cap = limit if limit > 0 else len(candidates)
            batch = candidates[:cap]
            total = len(batch)
            print(
                f"JobDetailAgent: {total} job(s) to publish "
                f"({stats['skipped']} skipped — no PDF/notification text)",
                flush=True,
            )
            job_ids = [str(j.id) for j in batch]

        async def process_one(i: int, job_id: str) -> None:
            async with sem:
                title = job_id[:8]
                max_attempts = 3
                counted_scan = False
                for attempt in range(1, max_attempts + 1):
                    try:
                        async with SessionLocal() as inner:
                            job = await inner.get(Job, job_id)
                            if not job:
                                return
                            if not counted_scan:
                                stats["scanned"] += 1
                                counted_scan = True
                            title = (job.title or "untitled")[:56]
                            detail = dict(job.detail or {})
                            summary = str(detail.get("summary") or "").strip()
                            pdf_url = detail.get("pdf_url") or getattr(job, "primary_pdf_url", None)
                            sections = list(detail.get("content_sections") or [])

                            # Prefer previously published rich sections (Storage/static) over slim DB.
                            existing = _load_existing_static_detail(self.detail_dir, job.slug)
                            if existing:
                                existing_sections = [
                                    s for s in (existing.get("content_sections") or []) if isinstance(s, dict)
                                ]
                                if _section_body_chars(existing_sections) > _section_body_chars(sections):
                                    sections = existing_sections
                                    detail["content_sections"] = sections
                                existing_summary = str(existing.get("summary") or "").strip()
                                if len(existing_summary) > len(summary):
                                    summary = existing_summary
                                    detail["summary"] = summary
                                for key in (
                                    "fee",
                                    "application_fee",
                                    "selection_process",
                                    "how_to_apply",
                                    "documents_required",
                                    "memorized_at",
                                    "detail_source",
                                ):
                                    if existing.get(key) and not detail.get(key):
                                        detail[key] = existing[key]

                            if _is_placeholder_sections(sections):
                                sections = []

                            if not sections and len(summary) >= 200:
                                built = _sections_from_summary(
                                    summary, pdf_url=str(pdf_url) if pdf_url else None
                                )
                                if built:
                                    detail["content_sections"] = built
                                    sections = built

                            if not sections:
                                detail["content_sections"] = _pending_verification_sections(summary)
                                sections = detail["content_sections"]
                                detail["details_pending_verification"] = True

                            detail["content_sections"] = _normalize_sections(sections)
                            sections = detail["content_sections"]
                            _attach_extracted_fields(detail)

                            # Prefer nearer apply/walk-in dates from summary over project-end last_dates.
                            extracted_dates = extract_dates_from_text(summary) if summary else {}
                            preferred_last = prefer_apply_date(
                                job.last_date.isoformat() if job.last_date else None,
                                extracted_dates.get("last_date"),
                            )
                            if preferred_last:
                                parsed_last = _parse_date(preferred_last)
                                if parsed_last and parsed_last != job.last_date:
                                    job.last_date = parsed_last

                            # Fill zero vacancies from title/summary when PDF text has a clear count.
                            if not int(job.vacancies or 0):
                                resolved = resolve_vacancies(
                                    0,
                                    job.title or "",
                                    summary,
                                )
                                if resolved:
                                    job.vacancies = resolved

                            source = _infer_detail_source(detail)
                            detail["detail_source"] = source
                            detail["detail_updated_at"] = datetime.now(timezone.utc).isoformat()
                            if source == "pdf" and not detail.get("memorized_at"):
                                detail["memorized_at"] = detail["detail_updated_at"]

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
                            tier = publication_tier(score)
                            _attach_verification_section(detail, job, score, missing)

                            if tier == "hold":
                                if not bool(getattr(job, "published_to_site", False)):
                                    job.published_to_site = False
                                    if job.status == "live":
                                        job.status = "draft"
                                    job.verification_status = "NEEDS_REVIEW"
                                    stats["held"] += 1
                                else:
                                    # Already on the site — flag partial instead of unpublishing.
                                    detail["details_pending_verification"] = True
                                    if job.verification_status == "VERIFIED":
                                        job.verification_status = "PARTIALLY_VERIFIED"
                            elif tier == "partial":
                                detail["details_pending_verification"] = True
                                if job.verification_status == "VERIFIED":
                                    job.verification_status = "PARTIALLY_VERIFIED"

                            job.detail = sanitize_json_for_postgres(detail)
                            await sync_job_children(inner, job)

                            if upload_storage and job.slug and sections:
                                upload_job_detail_json(
                                    str(job.slug), job_to_detail_payload(job, detail)
                                )

                            if write_static and job.slug and tier != "hold":
                                self._write_static(job, detail)

                            job.detail = sanitize_json_for_postgres(
                                slim_detail_for_db(detail, status=str(job.status or "live"))
                                | {
                                    "detail_source": source,
                                    "memorized_at": detail.get("memorized_at"),
                                    "detail_updated_at": detail["detail_updated_at"],
                                    "completeness_score": score,
                                    "details_pending_verification": detail.get("details_pending_verification"),
                                }
                            )
                            await inner.commit()

                            stats["updated"] += 1
                            stats["by_source"][source] = stats["by_source"].get(source, 0) + 1
                            print(
                                f"[{i}/{total}] detail={source} {title} "
                                f"({len(sections)} sections, score={score}, tier={tier})",
                                flush=True,
                            )
                            return
                    except Exception as exc:
                        if is_transient_db_error(exc) and attempt < max_attempts:
                            logger.warning(
                                "[%s/%s] transient DB error for %s (attempt %s/%s): %s",
                                i,
                                total,
                                title,
                                attempt,
                                max_attempts,
                                exc,
                            )
                            await asyncio.sleep(0.5 * attempt)
                            continue
                        stats["failed"] += 1
                        logger.exception("[%s/%s] detail failed for %s: %s", i, total, title, exc)
                        return

        await asyncio.gather(*(process_one(i, jid) for i, jid in enumerate(job_ids, 1)))

        if export_live_json and stats["updated"]:
            async with SessionLocal() as session:
                try:
                    await self.persist.export_live_jobs_json(session)
                except Exception as exc:
                    logger.warning("live-jobs.json export failed: %s", exc)

        return stats

    def _write_static(self, job: Job, detail: dict[str, Any]) -> None:
        self.detail_dir.mkdir(parents=True, exist_ok=True)
        path = self.detail_dir / f"{job.slug}.json"
        path.write_text(
            json.dumps(job_to_detail_payload(job, detail), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
