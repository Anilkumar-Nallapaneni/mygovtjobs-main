from fastapi import APIRouter, HTTPException, Request

from app.middleware.rate_limit import client_ip, get_subscribe_rate_limiter
from app.schemas.job_report import JobReportCreate
from app.services.turnstile_service import verify_turnstile
from app.database.session import SessionLocal
from sqlalchemy import text

router = APIRouter()

ALLOWED_REASONS = {
    "expired",
    "wrong_deadline",
    "broken_link",
    "wrong_vacancy",
    "duplicate",
    "not_recruitment",
    "suspicious_source",
}


@router.post("")
async def create_job_report(request: Request, body: JobReportCreate):
    ip = client_ip(request)
    if not get_subscribe_rate_limiter().allow(f"job-report:{ip}"):
        raise HTTPException(status_code=429, detail="Too many reports. Please try again later.")

    token = request.headers.get("CF-Turnstile-Response") or request.headers.get("X-Turnstile-Token")
    if not await verify_turnstile(token, remote_ip=ip):
        raise HTTPException(status_code=400, detail="Bot verification failed. Please try again.")

    reason = body.reason.strip().lower()
    if reason not in ALLOWED_REASONS:
        raise HTTPException(status_code=400, detail="Invalid report reason")

    async with SessionLocal() as session:
        job = (
            await session.execute(
                text("SELECT id FROM jobs WHERE id::text = :jid OR slug = :jid LIMIT 1"),
                {"jid": body.job_id},
            )
        ).first()
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        job_id = str(job[0])
        row = (
            await session.execute(
                text(
                    """
                    INSERT INTO job_reports (job_id, reason, description, reporter_email)
                    VALUES (:job_id, :reason, :description, :email)
                    RETURNING id
                    """
                ),
                {
                    "job_id": job_id,
                    "reason": reason,
                    "description": body.description.strip() or None,
                    "email": str(body.reporter_email) if body.reporter_email else None,
                },
            )
        ).scalar_one()
        await session.commit()

    return {"id": str(row), "status": "open"}
