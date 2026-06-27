from fastapi import APIRouter

from sqlalchemy import text

from app.config import get_settings
from app.utils.database_url import database_url_issues, sanitize_db_error

router = APIRouter()


async def _probe_database() -> tuple[bool, str | None]:
    try:
        from app.database.session import SessionLocal

        async with SessionLocal() as session:
            await session.execute(text("SELECT 1"))
        return True, None
    except Exception as exc:
        return False, sanitize_db_error(exc)


@router.get("/health")
async def health():
    """Liveness + DB connectivity — use /health/detailed for counts."""
    settings = get_settings()
    db_ok, db_error = await _probe_database()
    payload: dict = {
        "status": "ok" if db_ok else "degraded",
        "database": {"connected": db_ok},
    }
    if not db_ok:
        checks = database_url_issues(settings.database_url, supabase_url=settings.supabase_url)
        if checks:
            payload["database"]["url_checks"] = checks
        if db_error:
            payload["database"]["error"] = db_error
    return payload


@router.get("/health/detailed")
async def health_detailed():
    settings = get_settings()
    db_ok, db_error = await _probe_database()
    job_counts: dict[str, int] = {}

    if db_ok:
        try:
            from app.database.session import SessionLocal

            async with SessionLocal() as session:
                rows = (
                    await session.execute(
                        text(
                            "SELECT COALESCE(status, 'unknown') AS status, count(*) "
                            "FROM jobs GROUP BY status ORDER BY count DESC"
                        )
                    )
                ).all()
                for status, count in rows:
                    job_counts[str(status)] = int(count)
        except Exception:
            pass

    visible = job_counts.get("live", 0) + job_counts.get("expired", 0)
    database: dict = {"connected": db_ok}
    if not db_ok:
        checks = database_url_issues(settings.database_url, supabase_url=settings.supabase_url)
        if checks:
            database["url_checks"] = checks
        if db_error:
            database["error"] = db_error

    return {
        "status": "ok" if db_ok else "degraded",
        "database": database,
        "supabase_configured": bool(settings.supabase_url and settings.supabase_service_role_key),
        "jobs": {
            "by_status": job_counts,
            "visible_public": visible,
        },
    }
