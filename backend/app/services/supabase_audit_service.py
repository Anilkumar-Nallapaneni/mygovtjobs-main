"""Row counts and health for all Supabase tables used by My Govt Jobs."""

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.job import Job, RawIngest, Source

TABLE_NAMES = (
    "sources",
    "raw_ingest",
    "jobs",
    "job_posts",
    "job_dates",
    "alert_subscriptions",
    "alert_deliveries",
)


class SupabaseAuditService:
    async def table_counts(self, session: AsyncSession) -> dict:
        counts: dict[str, int | str] = {}
        for name in TABLE_NAMES:
            try:
                n = (
                    await session.execute(text(f"SELECT COUNT(*)::int FROM {name}"))
                ).scalar_one()
                counts[name] = int(n)
            except Exception as exc:
                counts[name] = f"missing: {exc}"

        live = (
            await session.execute(select(func.count()).select_from(Job).where(Job.status == "live"))
        ).scalar_one()
        counts["jobs_live"] = int(live)

        sources_active = (
            await session.execute(select(func.count()).select_from(Source).where(Source.is_active.is_(True)))
        ).scalar_one()
        counts["sources_active"] = int(sources_active)

        raw_recent = (
            await session.execute(select(func.count()).select_from(RawIngest))
        ).scalar_one()
        counts["raw_ingest_total"] = int(raw_recent)

        return counts

    async def jobs_by_state(self, session: AsyncSession, limit: int = 40) -> list[dict]:
        rows = (
            await session.execute(
                text(
                    """
                    SELECT unnest(state_codes) AS code, COUNT(*)::int AS n
                    FROM jobs
                    WHERE status = 'live'
                    GROUP BY 1
                    ORDER BY n DESC
                    LIMIT :lim
                    """
                ),
                {"lim": limit},
            )
        ).all()
        nationwide = (
            await session.execute(
                text(
                    "SELECT COUNT(*)::int FROM jobs WHERE status = 'live' AND (state_codes IS NULL OR state_codes = '{}')"
                )
            )
        ).scalar_one()
        out = [{"state_code": r[0], "jobs": r[1]} for r in rows]
        out.insert(0, {"state_code": "(nationwide)", "jobs": int(nationwide)})
        return out
