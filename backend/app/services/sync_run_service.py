"""PostgreSQL advisory lock + sync_runs table for production pipelines."""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

ADVISORY_LOCK_KEY = 20260710
# Transaction pooler (6543) releases session advisory locks at commit — also use row mutex.
STALE_RUNNING_HOURS = 4


class SyncRunService:
    async def try_lock(self, session: AsyncSession) -> bool:
        row = (
            await session.execute(
                text("SELECT pg_try_advisory_lock(:key) AS locked"),
                {"key": ADVISORY_LOCK_KEY},
            )
        ).mappings().one()
        return bool(row["locked"])

    async def unlock(self, session: AsyncSession) -> None:
        await session.execute(text("SELECT pg_advisory_unlock(:key)"), {"key": ADVISORY_LOCK_KEY})
        await session.commit()

    async def abandon_stale(
        self,
        session: AsyncSession,
        *,
        older_than_hours: float | None = None,
    ) -> int:
        """Mark stuck running rows failed. older_than_hours=0 abandons all running rows."""
        hours = STALE_RUNNING_HOURS if older_than_hours is None else float(older_than_hours)
        if hours <= 0:
            result = await session.execute(
                text(
                    """
                    UPDATE sync_runs
                    SET status = 'failed',
                        completed_at = :completed_at,
                        error_message = COALESCE(
                          NULLIF(error_message, ''),
                          'abandoned: runner cancelled or timed out'
                        )
                    WHERE status = 'running'
                    """
                ),
                {"completed_at": datetime.now(timezone.utc)},
            )
        else:
            cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
            result = await session.execute(
                text(
                    """
                    UPDATE sync_runs
                    SET status = 'failed',
                        completed_at = :completed_at,
                        error_message = COALESCE(
                          NULLIF(error_message, ''),
                          'abandoned: stale running row'
                        )
                    WHERE status = 'running' AND started_at < :cutoff
                    """
                ),
                {"completed_at": datetime.now(timezone.utc), "cutoff": cutoff},
            )
        await session.commit()
        return int(result.rowcount or 0)

    async def has_active_run(self, session: AsyncSession) -> bool:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=STALE_RUNNING_HOURS)
        row = (
            await session.execute(
                text(
                    """
                    SELECT 1 AS ok
                    FROM sync_runs
                    WHERE status = 'running' AND started_at >= :cutoff
                    LIMIT 1
                    """
                ),
                {"cutoff": cutoff},
            )
        ).first()
        return row is not None

    async def start(
        self,
        session: AsyncSession,
        *,
        pipeline_name: str,
        trigger_type: str | None = None,
    ) -> str | None:
        force = os.environ.get("SYNC_FORCE", "").strip().lower() in ("1", "true", "yes")
        # Forced runs (CI re-dispatch) must clear leftover "running" rows from cancelled jobs.
        await self.abandon_stale(session, older_than_hours=0 if force else None)

        # Row-based mutex (works on transaction pooler; advisory lock alone does not).
        if await self.has_active_run(session):
            return None

        if not await self.try_lock(session):
            return None

        run_id = str(uuid4())
        commit_sha = os.environ.get("GITHUB_SHA") or os.environ.get("VERCEL_GIT_COMMIT_SHA")
        try:
            await session.execute(
                text(
                    """
                    INSERT INTO sync_runs (id, pipeline_name, trigger_type, status, commit_sha)
                    VALUES (:id, :pipeline_name, :trigger_type, 'running', :commit_sha)
                    """
                ),
                {
                    "id": run_id,
                    "pipeline_name": pipeline_name,
                    "trigger_type": trigger_type,
                    "commit_sha": commit_sha,
                },
            )
            await session.commit()
        except IntegrityError:
            await session.rollback()
            await self.unlock(session)
            return None
        return run_id

    async def finish(
        self,
        session: AsyncSession,
        run_id: str,
        *,
        status: str,
        inserted_count: int = 0,
        updated_count: int = 0,
        rejected_count: int = 0,
        error_message: str | None = None,
    ) -> None:
        await session.execute(
            text(
                """
                UPDATE sync_runs
                SET status = :status,
                    completed_at = :completed_at,
                    inserted_count = :inserted_count,
                    updated_count = :updated_count,
                    rejected_count = :rejected_count,
                    error_message = :error_message
                WHERE id = :id
                """
            ),
            {
                "id": run_id,
                "status": status,
                "completed_at": datetime.now(timezone.utc),
                "inserted_count": inserted_count,
                "updated_count": updated_count,
                "rejected_count": rejected_count,
                "error_message": error_message,
            },
        )
        await session.commit()
        await self.unlock(session)
