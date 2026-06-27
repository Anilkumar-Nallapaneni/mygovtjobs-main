from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException

from app.config import get_settings
from app.middleware.auth import require_admin_key
from app.services.daily_sync_service import DailySyncService
from app.services.ingest_service import IngestService

router = APIRouter()
service = IngestService()


def _guard_daily_window(*, force: bool = False) -> None:
    settings = get_settings()
    if not settings.daily_sync_enforce_once or force:
        return
    sync = DailySyncService()
    ok, reason = sync.can_start(force=False)
    if not ok and sync.already_ran_today_ist():
        raise HTTPException(
            status_code=409,
            detail={
                "message": reason,
                "nextRunAtIst": sync.public_status().get("nextRunAtIst"),
                "hint": "Use npm run daily:sync -- --force for manual override",
            },
        )


@router.post("/run/{source_code}", dependencies=[Depends(require_admin_key)])
async def run_source(
    source_code: str,
    background_tasks: BackgroundTasks,
    sync: bool = False,
    force: bool = False,
):
    """Trigger ingest for one source (admin / scheduler). Pass sync=true to wait for result."""
    _guard_daily_window(force=force)
    if sync:
        result = await service.run_source(source_code)
        return {"queued": False, **result}
    background_tasks.add_task(service.run_source, source_code)
    return {"queued": True, "source": source_code}


@router.post("/run-all", dependencies=[Depends(require_admin_key)])
async def run_all(background_tasks: BackgroundTasks, sync: bool = False, force: bool = False):
    _guard_daily_window(force=force)
    if sync:
        results = await service.run_all_enabled()
        return {"queued": False, "results": results}
    background_tasks.add_task(service.run_all_enabled)
    return {"queued": True}
