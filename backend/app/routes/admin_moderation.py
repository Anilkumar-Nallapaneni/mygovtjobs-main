from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text

from app.database.session import SessionLocal
from app.middleware.auth import require_admin_key

router = APIRouter(dependencies=[Depends(require_admin_key)])


@router.get("/moderation")
async def moderation_queue(limit: int = Query(50, ge=1, le=200)):
    """Queues for reports and publication-quality exceptions."""
    queries = {
        "user_reports": """SELECT r.id, r.job_id, r.reason, r.description, r.reporter_email, r.created_at,
          j.slug, j.title FROM job_reports r JOIN jobs j ON j.id = r.job_id
          WHERE r.status = 'open' ORDER BY r.created_at DESC LIMIT :limit""",
        "broken_links": """SELECT id, slug, title, apply_url, link_consecutive_failures,
          link_last_http_status FROM jobs WHERE status = 'live' AND link_consecutive_failures >= 2
          ORDER BY link_consecutive_failures DESC, updated_at DESC LIMIT :limit""",
        "missing_apply_links": """SELECT id, slug, title, dept, last_date FROM jobs
          WHERE status = 'live' AND (apply_url IS NULL OR trim(apply_url) = '')
          ORDER BY published_at DESC NULLS LAST LIMIT :limit""",
        "low_confidence": """SELECT id, slug, title, confidence_score, source_domain FROM jobs
          WHERE status = 'live' AND confidence_score IS NOT NULL AND confidence_score < 0.5
          ORDER BY confidence_score ASC LIMIT :limit""",
        "expired_still_live": """SELECT id, slug, title, last_date FROM jobs
          WHERE status = 'live' AND last_date IS NOT NULL AND last_date < CURRENT_DATE
          ORDER BY last_date ASC LIMIT :limit""",
    }
    empty = {key: [] for key in queries}
    try:
        async with SessionLocal() as session:
            return {
                key: [dict(row) for row in (await session.execute(text(sql), {"limit": limit})).mappings().all()]
                for key, sql in queries.items()
            }
    except Exception:
        return empty


@router.patch("/moderation/reports/{report_id}")
async def resolve_job_report(report_id: str, status: str = Query(...)):
    normalized = status.strip().lower()
    if normalized not in {"resolved", "dismissed", "open"}:
        raise HTTPException(status_code=400, detail="Status must be open, resolved, or dismissed")
    async with SessionLocal() as session:
        row = (await session.execute(text("""
            UPDATE job_reports SET status = :status WHERE id::text = :report_id RETURNING id, status
        """), {"report_id": report_id, "status": normalized})).mappings().first()
        if not row:
            raise HTTPException(status_code=404, detail="Report not found")
        await session.commit()
    return {"id": str(row["id"]), "status": row["status"]}
