from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select

from app.database.session import SessionLocal
from app.middleware.auth import require_admin_key
from app.models.job import Job, Source
from app.config import get_settings
from app.services.daily_sync_service import DailySyncService
from app.services.ingest_service import IngestService
from app.services.alert_delivery_service import AlertDeliveryService
from app.services.supabase_audit_service import SupabaseAuditService
from app.utils.repo_paths import resolve_repo_path

router = APIRouter(dependencies=[Depends(require_admin_key)])


class JobStatusUpdate(BaseModel):
    status: str


@router.get("/stats")
async def admin_stats():
    async with SessionLocal() as session:
        try:
            total = (await session.execute(select(func.count()).select_from(Job))).scalar_one()
            live = (await session.execute(select(func.count()).select_from(Job).where(Job.status == "live"))).scalar_one()
            draft = (await session.execute(select(func.count()).select_from(Job).where(Job.status == "draft"))).scalar_one()
            expired = (await session.execute(select(func.count()).select_from(Job).where(Job.status == "expired"))).scalar_one()
            return {"jobs": {"total": total, "live": live, "draft": draft, "expired": expired}}
        except Exception:
            return {"jobs": {"total": 0, "live": 0, "draft": 0, "expired": 0}}


@router.get("/jobs")
async def admin_list_jobs(status: str | None = None, limit: int = 50, offset: int = 0):
    async with SessionLocal() as session:
        stmt = select(Job).order_by(Job.published_at.desc().nullslast()).limit(limit).offset(offset)
        if status:
            stmt = stmt.where(Job.status == status)
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
                }
                for r in rows
            ]
        }


@router.patch("/jobs/{job_id}")
async def admin_update_job(job_id: str, body: JobStatusUpdate):
    if body.status not in ("draft", "live", "expired"):
        raise HTTPException(status_code=400, detail="Invalid status")
    async with SessionLocal() as session:
        row = (await session.execute(select(Job).where(Job.id == job_id))).scalar_one_or_none()
        if not row:
            raise HTTPException(status_code=404, detail="Job not found")
        row.status = body.status
        row.updated_at = datetime.now(timezone.utc)
        await session.commit()
        return {"id": job_id, "status": body.status}


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
