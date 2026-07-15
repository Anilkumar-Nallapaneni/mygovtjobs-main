"""PdfReaderAgent — read official notification PDFs for live jobs and memorize content."""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.exc import InterfaceError, OperationalError

from app.database.session import SessionLocal
from app.models.job import Job
from app.parsers.notification_parser import NotificationParser
from app.services.job_pdf_enrich_service import (
    apply_pdf_enrichment,
    job_row_for_pdf_prep,
    job_to_detail_payload,
    prepare_pdf_enrichment,
)
from app.services.job_persist_service import JobPersistService
from app.utils.job_pdf_urls import collect_pdf_urls

logger = logging.getLogger(__name__)

_DB_RETRY_ERRORS = (InterfaceError, OperationalError)
_MEMORY_INDEX_FLUSH_EVERY = 25


def _resolve_repo_root() -> Path:
    here = Path(__file__).resolve()
    for base in (here.parents[2], here.parents[3]):
        if (base / "frontend" / "public" / "data").is_dir():
            return base
    return here.parents[3]


class PdfReaderAgent:
    """Reads PDFs for job listings, extracts structured sections, and persists memory."""

    def __init__(self, *, repo_root: Path | None = None):
        self.parser = NotificationParser()
        self.persist = JobPersistService()
        root = repo_root or _resolve_repo_root()
        self.detail_dir = root / "frontend" / "public" / "data" / "job-details"
        self.memory_index_path = root / "frontend" / "public" / "data" / "pdf-memory-index.json"

    async def run(
        self,
        *,
        limit: int = 50,
        live_only: bool = True,
        only_missing: bool = True,
        concurrency: int = 4,
        write_static: bool = True,
        export_live_json: bool = True,
        upload_storage: bool = True,
    ) -> dict[str, Any]:
        """
        Read PDFs for jobs with official notification links.

        Memorizes content in:
        - jobs.detail.content_sections (+ vacancies, dates) in Supabase
        - frontend/public/data/job-details/<slug>.json
        - frontend/public/data/pdf-memory-index.json
        """
        statuses = ("live",) if live_only else ("live", "expired")
        sem = asyncio.Semaphore(max(1, concurrency))
        stats_lock = asyncio.Lock()
        stats: dict[str, Any] = {
            "scanned": 0,
            "memorized": 0,
            "skipped_no_pdf": 0,
            "skipped_existing": 0,
            "failed": 0,
            "memory_items": [],
        }

        async with SessionLocal() as session:
            rows = (
                await session.execute(
                    select(Job).where(Job.status.in_(statuses)).order_by(Job.published_at.desc())
                )
            ).scalars().all()

            candidates: list[Job] = []
            for job in rows:
                if only_missing and (job.detail or {}).get("content_sections"):
                    stats["skipped_existing"] += 1
                    continue
                if not collect_pdf_urls(job):
                    stats["skipped_no_pdf"] += 1
                    continue
                candidates.append(job)

        cap = limit if limit > 0 else len(candidates)
        batch = candidates[:cap]
        total = len(batch)
        job_ids = [str(job.id) for job in batch]
        print(
            f"PdfReaderAgent: {total} job(s) to read "
            f"({stats['skipped_existing']} already memorized, "
            f"{stats['skipped_no_pdf']} without PDF)",
            flush=True,
        )

        async def process_one(i: int, job_id: str) -> None:
            async with sem:
                title = "untitled"
                scanned_marked = False
                for attempt in range(3):
                    try:
                        async with SessionLocal() as session:
                            job = await session.get(Job, job_id)
                            if not job:
                                return
                            title = (job.title or "untitled")[:56]
                            prep_row = job_row_for_pdf_prep(job)

                        if not scanned_marked:
                            async with stats_lock:
                                stats["scanned"] += 1
                            scanned_marked = True

                        prep = await prepare_pdf_enrichment(prep_row, self.parser)

                        async with SessionLocal() as session:
                            job = await session.get(Job, job_id)
                            if not job:
                                return
                            result = await apply_pdf_enrichment(
                                session,
                                job,
                                self.parser,
                                prep,
                                upload_storage=upload_storage,
                            )
                            changed = result.changed
                            full_detail = result.full_detail or {}
                            sections = full_detail.get("content_sections") or []
                            summary = str(full_detail.get("summary") or (job.detail or {}).get("summary") or "").strip()
                            if changed and (sections or len(summary) >= 40):
                                async with stats_lock:
                                    stats["memorized"] += 1
                                    if write_static and job.slug:
                                        self._write_static_detail(
                                            job,
                                            full_detail if full_detail else None,
                                        )
                                    stats["memory_items"].append(
                                        self._memory_entry(job, full_detail if full_detail else None)
                                    )
                                    memorized = stats["memorized"]
                                print(
                                    f"[{i}/{total}] memorized {title} "
                                    f"({len(sections)} sections, summary={len(summary)} chars)",
                                    flush=True,
                                )
                                if memorized % _MEMORY_INDEX_FLUSH_EVERY == 0:
                                    self._write_memory_index(stats)
                            else:
                                print(f"[{i}/{total}] no PDF text for {title}", flush=True)
                            await session.commit()
                        return
                    except _DB_RETRY_ERRORS as exc:
                        if attempt < 2:
                            await asyncio.sleep(1.5 * (attempt + 1))
                            continue
                        async with stats_lock:
                            stats["failed"] += 1
                        print(f"[{i}/{total}] failed {title}: {exc}", flush=True)
                        return
                    except Exception as exc:
                        async with stats_lock:
                            stats["failed"] += 1
                        print(f"[{i}/{total}] failed {title}: {exc}", flush=True)
                        return

        await asyncio.gather(*(process_one(i, jid) for i, jid in enumerate(job_ids, 1)))

        if export_live_json and stats["memorized"]:
            async with SessionLocal() as session:
                try:
                    await self.persist.export_live_jobs_json(session)
                except Exception as exc:
                    logger.warning("live-jobs.json export failed: %s", exc)

        self._write_memory_index(stats)
        stats.pop("memory_items", None)
        return stats

    def _write_static_detail(self, job: Job, detail: dict[str, Any] | None = None) -> None:
        self.detail_dir.mkdir(parents=True, exist_ok=True)
        path = self.detail_dir / f"{job.slug}.json"
        payload = job_to_detail_payload(job, detail)
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    def _memory_entry(self, job: Job, detail: dict[str, Any] | None = None) -> dict[str, Any]:
        d = detail if detail is not None else dict(job.detail or {})
        summary = str(d.get("summary") or "")[:500]
        digest = hashlib.sha256(summary.encode("utf-8", errors="ignore")).hexdigest()[:16]
        return {
            "slug": job.slug,
            "title": job.title,
            "status": job.status,
            "vacancies": int(job.vacancies or 0),
            "pdf_urls": list(d.get("pdf_urls") or d.get("pdfUrls") or [])[:6],
            "section_count": len(d.get("content_sections") or []),
            "memorized_at": d.get("memorized_at")
            or datetime.now(timezone.utc).isoformat(),
            "content_digest": digest,
        }

    def _write_memory_index(self, stats: dict[str, Any]) -> None:
        existing: list[dict[str, Any]] = []
        if self.memory_index_path.is_file():
            try:
                payload = json.loads(self.memory_index_path.read_text(encoding="utf-8"))
                existing = [row for row in payload.get("items", []) if isinstance(row, dict)]
            except Exception:
                existing = []

        merged = {str(row.get("slug") or ""): row for row in existing if row.get("slug")}
        for row in stats.get("memory_items") or []:
            slug = str(row.get("slug") or "")
            if slug:
                merged[slug] = row

        out = {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "memorized": len(merged),
            "lastRun": {
                "scanned": stats.get("scanned", 0),
                "memorized": stats.get("memorized", 0),
                "failed": stats.get("failed", 0),
            },
            "items": sorted(merged.values(), key=lambda r: str(r.get("memorized_at") or ""), reverse=True),
        }
        self.memory_index_path.parent.mkdir(parents=True, exist_ok=True)
        self.memory_index_path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
