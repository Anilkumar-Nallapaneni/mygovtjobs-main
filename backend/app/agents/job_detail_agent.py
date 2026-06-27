"""JobDetailAgent — build job detail UI payload from PDF or notification (source of truth)."""

from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import select

from app.database.retry import is_transient_db_error
from app.database.session import SessionLocal
from app.models.job import Job
from app.parsers.pdf_sections import text_to_content_sections
from app.services.job_child_service import sync_job_children
from app.services.job_persist_service import JobPersistService
from app.services.job_pdf_enrich_service import job_to_detail_payload
from app.services.noise_filter import sanitize_json_for_postgres
from app.utils.job_details_storage import upload_job_detail_json
from app.utils.slim_detail import slim_detail_for_db

logger = logging.getLogger(__name__)


def _resolve_repo_root() -> Path:
    here = Path(__file__).resolve()
    for base in (here.parents[2], here.parents[3]):
        if (base / "frontend" / "public" / "data").is_dir():
            return base
    return here.parents[3]


def _infer_detail_source(detail: dict[str, Any]) -> str:
    if detail.get("memorized_at") or detail.get("detail_source") == "pdf":
        return "pdf"
    source = str(detail.get("source") or "").lower()
    if source in ("structured-import", "official-feed", "official-json"):
        return "notification"
    if detail.get("content_sections"):
        return "notification"
    return "listing"


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
        statuses = ("live",) if live_only else ("live", "expired")
        sem = asyncio.Semaphore(max(1, concurrency))
        stats: dict[str, Any] = {
            "scanned": 0,
            "updated": 0,
            "skipped": 0,
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
                has_sections = bool(detail.get("content_sections"))
                if only_missing_sections and has_sections:
                    stats["skipped"] += 1
                    continue
                if not has_summary and not has_sections:
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
                            pdf_url = detail.get("pdf_url")
                            sections = list(detail.get("content_sections") or [])

                            if not sections and len(summary) >= 40:
                                built = _sections_from_summary(
                                    summary, pdf_url=str(pdf_url) if pdf_url else None
                                )
                                if built:
                                    detail["content_sections"] = built
                                    sections = built

                            if not sections and not summary:
                                print(f"[{i}/{total}] skip {title} (no content)", flush=True)
                                return

                            source = _infer_detail_source(detail)
                            detail["detail_source"] = source
                            detail["detail_updated_at"] = datetime.now(timezone.utc).isoformat()
                            if source == "pdf" and not detail.get("memorized_at"):
                                detail["memorized_at"] = detail["detail_updated_at"]

                            # Full detail for children sync + storage (sections stay in JSON files)
                            job.detail = sanitize_json_for_postgres(detail)
                            await sync_job_children(inner, job)

                            if upload_storage and job.slug and sections:
                                upload_job_detail_json(
                                    str(job.slug), job_to_detail_payload(job, detail)
                                )

                            if write_static and job.slug:
                                self._write_static(job, detail)

                            job.detail = sanitize_json_for_postgres(
                                slim_detail_for_db(detail, status=str(job.status or "live"))
                                | {
                                    "detail_source": source,
                                    "memorized_at": detail.get("memorized_at"),
                                    "detail_updated_at": detail["detail_updated_at"],
                                }
                            )
                            await inner.commit()

                            stats["updated"] += 1
                            stats["by_source"][source] = stats["by_source"].get(source, 0) + 1
                            print(
                                f"[{i}/{total}] detail={source} {title} "
                                f"({len(sections)} sections)",
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
                            await asyncio.sleep(0.75 * attempt)
                            continue
                        stats["failed"] += 1
                        print(f"[{i}/{total}] failed {title}: {exc}", flush=True)
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
        payload = job_to_detail_payload(job, detail)
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
