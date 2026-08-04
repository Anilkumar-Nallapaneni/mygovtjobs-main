from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

from sqlalchemy import case, func, select, text

from app.models.job import Job, JobReviewQueue, SourceHealth


class OperationsDashboardService:
    @staticmethod
    async def build(session) -> dict:
        now = datetime.now(timezone.utc)
        today = date.today()
        in_three_days = today + timedelta(days=3)
        in_seven_days = today + timedelta(days=7)

        job_row = (await session.execute(
            select(
                func.count(Job.id).label("total"),
                func.sum(case((Job.status == "live", 1), else_=0)).label("live"),
                func.sum(case((Job.published_to_site.is_(True), 1), else_=0)).label("published"),
                func.sum(case((Job.verification_status == "NEEDS_REVIEW", 1), else_=0)).label("needs_review"),
                func.sum(case((Job.apply_url.is_(None), 1), else_=0)).label("missing_apply"),
                func.sum(case((Job.primary_pdf_url.is_(None), 1), else_=0)).label("missing_pdf"),
                func.sum(case((Job.link_consecutive_failures > 0, 1), else_=0)).label("broken_links"),
                func.sum(case((Job.last_date == today, 1), else_=0)).label("closing_today"),
                func.sum(case((Job.last_date.between(today, in_three_days), 1), else_=0)).label("closing_3_days"),
                func.sum(case((Job.last_date.between(today, in_seven_days), 1), else_=0)).label("closing_7_days"),
                func.max(Job.updated_at).label("latest_job_update"),
            )
        )).one()

        source_rows = (await session.execute(
            select(SourceHealth).order_by(SourceHealth.updated_at.desc().nullslast())
        )).scalars().all()
        unhealthy = [s for s in source_rows if s.health_status not in ("HEALTHY", "OK")]
        stale = [s for s in source_rows if not s.last_checked_at or s.last_checked_at < now - timedelta(hours=24)]

        review_count = (await session.execute(
            select(func.count(JobReviewQueue.id)).where(JobReviewQueue.status.in_(("pending", "needs_changes")))
        )).scalar_one()

        last_pipeline = None
        try:
            result = await session.execute(text("""
                select id, run_type, trigger_type, status, started_at, finished_at,
                       duration_seconds, discovered_count, accepted_count,
                       published_count, rejected_count, error_count, error_message
                from pipeline_runs order by started_at desc limit 1
            """))
            row = result.mappings().first()
            last_pipeline = dict(row) if row else None
        except Exception:
            # Migration 030 may not yet be applied; dashboard remains usable.
            last_pipeline = None

        return {
            "generated_at": now.isoformat(),
            "jobs": {key: int(getattr(job_row, key) or 0) for key in (
                "total", "live", "published", "needs_review", "missing_apply",
                "missing_pdf", "broken_links", "closing_today", "closing_3_days", "closing_7_days"
            )} | {"latest_job_update": job_row.latest_job_update},
            "review_queue": {"pending": int(review_count or 0)},
            "sources": {
                "total": len(source_rows),
                "healthy": len(source_rows) - len(unhealthy),
                "unhealthy": len(unhealthy),
                "stale_24h": len(stale),
                "items": [{
                    "source_code": s.source_code,
                    "health_status": s.health_status,
                    "last_checked_at": s.last_checked_at,
                    "response_time_ms": s.response_time_ms,
                    "accepted_count": s.accepted_count,
                    "rejected_count": s.rejected_count,
                    "last_error": s.last_error,
                } for s in unhealthy[:50]],
            },
            "last_pipeline": last_pipeline,
        }
