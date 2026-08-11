from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select, text

from app.database.session import SessionLocal
from app.middleware.auth import require_admin_key
from app.models.job import Job, JobReviewQueue, Source, SourceHealth
from app.config import get_settings
from app.services.daily_sync_service import DailySyncService
from app.services.ingest_service import IngestService
from app.services.alert_delivery_service import AlertDeliveryService
from app.services.job_completeness_service import PUBLISH_MIN_SCORE, calculate_completeness
from app.services.publish_gate import can_publish_job, validate_job_for_publication
from app.services.supabase_audit_service import SupabaseAuditService
from app.utils.repo_paths import resolve_repo_path

router = APIRouter(dependencies=[Depends(require_admin_key)])


class JobStatusUpdate(BaseModel):
    status: str
    verification_status: str | None = None
    published_to_site: bool | None = None
    document_type: str | None = None


class ReviewStatusUpdate(BaseModel):
    status: str
    review_notes: str | None = None


@router.get("/review-queues")
async def admin_review_queues(limit: int = Query(40, ge=1, le=200)):
    """Human-review queues for uncertain / weak ingest records."""
    queues: dict[str, list[dict]] = {
        "new_discoveries": [],
        "not_recruitment": [],
        "pdf_failed": [],
        "date_conflict": [],
        "low_completeness": [],
        "ready_to_publish": [],
        "published": [],
        "quarantine": [],
    }

    def _item(row: Job) -> dict:
        return {
            "id": row.id,
            "slug": row.slug,
            "title": row.title,
            "status": row.status,
            "document_type": row.document_type,
            "verification_status": row.verification_status,
            "completeness_score": getattr(row, "completeness_score", 0),
            "published_to_site": getattr(row, "published_to_site", False),
            "primary_pdf_url": getattr(row, "primary_pdf_url", None),
            "review_reasons": getattr(row, "review_reasons", None) or [],
            "published_at": row.published_at,
        }

    async with SessionLocal() as session:
        try:
            rows = (
                await session.execute(select(Job).order_by(Job.updated_at.desc().nullslast()).limit(800))
            ).scalars().all()
            quarantined = (
                await session.execute(
                    select(JobReviewQueue)
                    .where(JobReviewQueue.status.in_(("pending", "needs_changes")))
                    .order_by(JobReviewQueue.created_at.desc())
                    .limit(limit)
                )
            ).scalars().all()
        except Exception:
            return {"queues": queues}

    queues["quarantine"] = [
        {
            "id": row.id,
            "title": (row.normalized_payload or row.raw_payload or {}).get("title"),
            "source_url": row.source_url,
            "confidence": float(row.confidence or 0),
            "validation_errors": row.validation_errors or [],
            "validation_warnings": row.validation_warnings or [],
            "status": row.status,
            "created_at": row.created_at,
        }
        for row in quarantined
    ]

    for row in rows:
        reasons = " ".join(str(r) for r in (getattr(row, "review_reasons", None) or [])).lower()
        detail = row.detail or {}
        item = _item(row)
        if getattr(row, "published_to_site", False) and row.status == "live":
            if len(queues["published"]) < limit:
                queues["published"].append(item)
            continue
        if row.verification_status == "NEEDS_REVIEW" and row.document_type == "RECRUITMENT":
            score = int(getattr(row, "completeness_score", 0) or 0)
            if score >= PUBLISH_MIN_SCORE and len(queues["ready_to_publish"]) < limit:
                queues["ready_to_publish"].append(item)
            elif score < PUBLISH_MIN_SCORE and len(queues["low_completeness"]) < limit:
                queues["low_completeness"].append(item)
            elif len(queues["new_discoveries"]) < limit:
                queues["new_discoveries"].append(item)
        if row.document_type and row.document_type not in ("RECRUITMENT", "UNKNOWN", None):
            if len(queues["not_recruitment"]) < limit:
                queues["not_recruitment"].append(item)
        if "pdf" in reasons or detail.get("extraction_quality_errors") or detail.get("pdf_scores"):
            if len(queues["pdf_failed"]) < limit:
                queues["pdf_failed"].append(item)
        if "date" in reasons or detail.get("date_validation_errors"):
            if len(queues["date_conflict"]) < limit:
                queues["date_conflict"].append(item)

    return {"queues": {k: v for k, v in queues.items()}, "limit": limit}


@router.patch("/review-queue/{review_id}")
async def admin_update_review_queue(review_id: str, body: ReviewStatusUpdate):
    if body.status not in ("pending", "approved", "rejected", "needs_changes"):
        raise HTTPException(status_code=400, detail="Invalid review status")
    async with SessionLocal() as session:
        row = (
            await session.execute(select(JobReviewQueue).where(JobReviewQueue.id == review_id))
        ).scalar_one_or_none()
        if not row:
            raise HTTPException(status_code=404, detail="Review record not found")
        row.status = body.status
        row.review_notes = body.review_notes
        row.updated_at = datetime.now(timezone.utc)
        if body.status in ("approved", "rejected"):
            row.reviewed_at = datetime.now(timezone.utc)
        await session.commit()
        return {"id": row.id, "status": row.status, "reviewed_at": row.reviewed_at}


@router.get("/jobs")
async def admin_list_jobs(
    status: str | None = None,
    verification_status: str | None = None,
    limit: int = 50,
    offset: int = 0,
):
    async with SessionLocal() as session:
        stmt = select(Job).order_by(Job.published_at.desc().nullslast()).limit(limit).offset(offset)
        if status:
            stmt = stmt.where(Job.status == status)
        if verification_status:
            stmt = stmt.where(Job.verification_status == verification_status)
        rows = (await session.execute(stmt)).scalars().all()
        return {
            "items": [
                {
                    "id": r.id,
                    "slug": r.slug,
                    "title": r.title,
                    "status": r.status,
                    "category": r.category,
                    "state_codes": r.state_codes,
                    "published_at": r.published_at,
                    "document_type": r.document_type,
                    "verification_status": r.verification_status,
                    "completeness_score": getattr(r, "completeness_score", 0),
                    "published_to_site": getattr(r, "published_to_site", False),
                    "review_reasons": getattr(r, "review_reasons", None) or [],
                }
                for r in rows
            ]
        }


@router.patch("/jobs/{job_id}")
async def admin_update_job(job_id: str, body: JobStatusUpdate):
    if body.status not in ("draft", "pending", "live", "expired"):
        raise HTTPException(status_code=400, detail="Invalid status")
    async with SessionLocal() as session:
        row = (await session.execute(select(Job).where(Job.id == job_id))).scalar_one_or_none()
        if not row:
            raise HTTPException(status_code=404, detail="Job not found")
        row.status = body.status
        if body.document_type:
            row.document_type = body.document_type.upper()
        if body.verification_status:
            row.verification_status = body.verification_status.upper()
        if body.published_to_site is not None:
            row.published_to_site = bool(body.published_to_site)

        if body.status == "live":
            row.verification_status = body.verification_status.upper() if body.verification_status else "VERIFIED"
            if not row.document_type:
                row.document_type = "RECRUITMENT"
            row.verified_at = datetime.now(timezone.utc)
            if body.published_to_site is None:
                score, _ = calculate_completeness(
                    {
                        "title": row.title,
                        "dept": row.dept,
                        "apply_url": row.apply_url,
                        "source_url": row.source_url,
                        "last_date": row.last_date,
                        "vacancies": row.vacancies,
                        "qualification": row.qualification,
                        "salary": row.salary,
                        "age_limit": row.age_limit,
                        "detail": row.detail or {},
                    }
                )
                row.completeness_score = score
                row.published_to_site = score >= PUBLISH_MIN_SCORE
            gate_ok, gate_errors = can_publish_job(
                {
                    "title": row.title,
                    "dept": row.dept,
                    "apply_url": row.apply_url,
                    "source_url": row.source_url,
                    "state_codes": row.state_codes or [],
                    "last_date": row.last_date,
                    "published_at": row.published_at,
                    "vacancies": row.vacancies,
                    "qualification": row.qualification,
                    "salary": row.salary,
                    "age_limit": row.age_limit,
                    "detail": row.detail or {},
                    "document_type": row.document_type,
                    "verification_status": row.verification_status,
                    "completeness_score": row.completeness_score,
                }
            )
            if not gate_ok:
                raise HTTPException(
                    status_code=422,
                    detail={"message": "Job failed the publication gate", "errors": gate_errors},
                )
            row.publication_confidence = validate_job_for_publication(
                {
                    "title": row.title,
                    "dept": row.dept,
                    "apply_url": row.apply_url,
                    "source_url": row.source_url,
                    "state_codes": row.state_codes or [],
                    "last_date": row.last_date,
                    "published_at": row.published_at,
                    "vacancies": row.vacancies,
                    "qualification": row.qualification,
                    "salary": row.salary,
                    "age_limit": row.age_limit,
                    "detail": row.detail or {},
                    "document_type": row.document_type,
                    "verification_status": row.verification_status,
                    "completeness_score": row.completeness_score,
                }
            ).confidence
        elif body.status in ("draft", "pending"):
            row.verification_status = body.verification_status.upper() if body.verification_status else "NEEDS_REVIEW"
            if body.published_to_site is None:
                row.published_to_site = False
        row.updated_at = datetime.now(timezone.utc)
        await session.commit()
        return {
            "id": job_id,
            "status": body.status,
            "verification_status": row.verification_status,
            "published_to_site": row.published_to_site,
            "completeness_score": row.completeness_score,
        }


@router.get("/source-health")
async def admin_source_health(limit: int = Query(100, ge=1, le=500)):
    async with SessionLocal() as session:
        try:
            rows = (
                await session.execute(
                    select(SourceHealth).order_by(SourceHealth.last_checked_at.desc().nullslast()).limit(limit)
                )
            ).scalars().all()
            return {
                "items": [
                    {
                        "source_code": r.source_code,
                        "health_status": r.health_status,
                        "homepage_status": r.homepage_status,
                        "recruitment_status": r.recruitment_status,
                        "response_time_ms": r.response_time_ms,
                        "last_checked_at": r.last_checked_at,
                        "last_error": r.last_error,
                        "parser_status": r.parser_status,
                    }
                    for r in rows
                ]
            }
        except Exception:
            return {"items": [], "error": "source_health table unavailable — run migration 024"}


@router.get("/dashboard")
async def admin_dashboard():
    """Combined health view for the React admin dashboard."""
    import json

    registry = json.loads(
        resolve_repo_path("scripts", "scraper_registry.json").read_text(encoding="utf-8")
    )
    scrapers = registry.get("scrapers") or []
    sync = DailySyncService().public_status()
    audit = SupabaseAuditService()
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(hours=24)

    async with SessionLocal() as session:
        jobs_stats = {"total": 0, "live": 0, "draft": 0, "expired": 0}
        db_sources: dict[str, dict] = {}
        tables: dict[str, int | str] = {}
        raw_total = 0
        sources_active = 0
        with_errors = 0
        ran_recent = 0
        try:
            jobs_stats = {
                "total": int((await session.execute(select(func.count()).select_from(Job))).scalar_one()),
                "live": int(
                    (await session.execute(select(func.count()).select_from(Job).where(Job.status == "live"))).scalar_one()
                ),
                "draft": int(
                    (await session.execute(select(func.count()).select_from(Job).where(Job.status == "draft"))).scalar_one()
                ),
                "expired": int(
                    (await session.execute(select(func.count()).select_from(Job).where(Job.status == "expired"))).scalar_one()
                ),
            }
            rows = (await session.execute(select(Source))).scalars().all()
            db_sources = {r.code: {"last_run_at": r.last_run_at, "last_error": r.last_error} for r in rows}
            sources_active = sum(1 for r in rows if r.is_active)
            with_errors = sum(1 for r in rows if r.last_error)
            ran_recent = sum(
                1
                for r in rows
                if r.last_run_at
                and (
                    r.last_run_at.replace(tzinfo=timezone.utc)
                    if r.last_run_at.tzinfo is None
                    else r.last_run_at
                )
                >= cutoff
            )
            tables = await audit.table_counts(session)
            raw_total = int(tables.get("raw_ingest_total", tables.get("raw_ingest", 0)) or 0)
        except Exception:
            pass

    scraper_rows = [
        {
            "code": s.get("code"),
            "enabled": s.get("enabled", False),
            "module": s.get("module"),
            "last_run_at": db_sources.get(s.get("code"), {}).get("last_run_at"),
            "last_error": db_sources.get(s.get("code"), {}).get("last_error"),
        }
        for s in scrapers
    ]

    stale_cutoff = now - timedelta(days=7)
    enabled_scrapers = [r for r in scraper_rows if r.get("enabled")]
    stale_count = 0
    for r in enabled_scrapers:
        last_run = r.get("last_run_at")
        if not last_run:
            stale_count += 1
            continue
        try:
            run_at = last_run if isinstance(last_run, datetime) else datetime.fromisoformat(
                str(last_run).replace("Z", "+00:00")
            )
            if run_at.tzinfo is None:
                run_at = run_at.replace(tzinfo=timezone.utc)
            if run_at < stale_cutoff:
                stale_count += 1
        except Exception:
            stale_count += 1

    enabled_n = len(enabled_scrapers)
    error_n = sum(1 for r in enabled_scrapers if r.get("last_error"))
    success_rate = round(((enabled_n - error_n) / enabled_n) * 100, 1) if enabled_n else 0.0

    return {
        "jobs": jobs_stats,
        "sources": {
            "total": len(scraper_rows),
            "active": sources_active,
            "with_errors": with_errors,
            "last_run_within_24h": ran_recent,
            "stale": stale_count,
            "success_rate_pct": success_rate,
        },
        "ingest": {"raw_ingest_total": raw_total, "last_sync": sync},
        "scrapers": scraper_rows,
        "tables": tables,
    }


@router.get("/sources/health")
async def source_health():
    import json

    registry = json.loads(resolve_repo_path("scripts", "scraper_registry.json").read_text(encoding="utf-8"))
    scrapers = registry.get("scrapers") or []
    async with SessionLocal() as session:
        db_sources = {}
        try:
            rows = (await session.execute(select(Source))).scalars().all()
            db_sources = {r.code: {"last_run_at": r.last_run_at, "last_error": r.last_error} for r in rows}
        except Exception:
            pass

    rows = [
        {
            "code": s.get("code"),
            "enabled": s.get("enabled", False),
            "module": s.get("module"),
            "last_run_at": db_sources.get(s.get("code"), {}).get("last_run_at"),
            "last_error": db_sources.get(s.get("code"), {}).get("last_error"),
        }
        for s in scrapers
    ]
    now = datetime.now(timezone.utc)
    stale_cutoff = now - timedelta(days=7)
    enabled_rows = [r for r in rows if r.get("enabled")]
    with_errors = [r for r in enabled_rows if r.get("last_error")]
    stale = []
    for r in enabled_rows:
        last_run = r.get("last_run_at")
        if not last_run:
            stale.append(r)
            continue
        try:
            run_at = last_run if isinstance(last_run, datetime) else datetime.fromisoformat(str(last_run).replace("Z", "+00:00"))
            if run_at.tzinfo is None:
                run_at = run_at.replace(tzinfo=timezone.utc)
            if run_at < stale_cutoff:
                stale.append(r)
        except Exception:
            stale.append(r)

    return {
        "scrapers": rows,
        "summary": {
            "total": len(rows),
            "enabled": len(enabled_rows),
            "with_errors": len(with_errors),
            "stale": len(stale),
        },
    }


@router.post("/sources/sync")
async def admin_sync_sources():
    n = await IngestService().sync_sources_registry()
    return {"synced": n}


@router.get("/supabase/audit")
async def admin_supabase_audit():
    async with SessionLocal() as session:
        audit = SupabaseAuditService()
        return {
            "tables": await audit.table_counts(session),
            "live_jobs_by_state": await audit.jobs_by_state(session),
        }


@router.get("/sync-status")
async def admin_sync_status():
    return DailySyncService().public_status()


@router.post("/alerts/deliver")
async def admin_deliver_alerts(lookback_hours: int | None = Query(None, ge=1, le=168)):
    async with SessionLocal() as session:
        stats = await AlertDeliveryService().run(session, lookback_hours=lookback_hours)
    return stats


@router.get("/sync-runs")
async def admin_sync_runs(limit: int = Query(20, ge=1, le=100)):
    async with SessionLocal() as session:
        rows = (
            await session.execute(
                text(
                    """
                    SELECT id, pipeline_name, trigger_type, status, started_at, completed_at,
                           inserted_count, updated_count, rejected_count, error_message
                    FROM sync_runs
                    ORDER BY started_at DESC
                    LIMIT :limit
                    """
                ),
                {"limit": limit},
            )
        ).mappings().all()
    return {"items": [dict(r) for r in rows]}


@router.post("/ingest/run-all")
async def admin_run_ingest(force: bool = Query(False)):
    settings = get_settings()
    sync = DailySyncService()
    if settings.daily_sync_enforce_once and not force:
        ok, reason = sync.can_start(force=False)
        if not ok and sync.already_ran_today_ist():
            raise HTTPException(status_code=409, detail=reason)
    synced = await IngestService().sync_sources_registry()
    results = await IngestService().run_all_enabled()
    return {"sources_synced": synced, "results": results}
