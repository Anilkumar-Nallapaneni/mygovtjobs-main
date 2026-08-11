"""Read-only admin operational summaries."""

from fastapi import APIRouter, Depends
from sqlalchemy import func, select

from app.database.session import SessionLocal
from app.middleware.auth import require_admin_key
from app.models.job import Job
from app.services.operations_dashboard_service import OperationsDashboardService

router = APIRouter(dependencies=[Depends(require_admin_key)])


@router.get("/stats")
async def admin_stats():
    async with SessionLocal() as session:
        try:
            values: dict[str, int] = {}
            for name, condition in (
                ("total", None),
                ("live", Job.status == "live"),
                ("draft", Job.status == "draft"),
                ("expired", Job.status == "expired"),
                ("needs_review", Job.verification_status == "NEEDS_REVIEW"),
                ("published_to_site", Job.published_to_site.is_(True)),
            ):
                statement = select(func.count()).select_from(Job)
                if condition is not None:
                    statement = statement.where(condition)
                values[name] = int((await session.execute(statement)).scalar_one() or 0)
            return {"jobs": values}
        except Exception:
            return {"jobs": {"total": 0, "live": 0, "draft": 0, "expired": 0}}


@router.get("/operations")
async def admin_operations_dashboard():
    async with SessionLocal() as session:
        return await OperationsDashboardService.build(session)
