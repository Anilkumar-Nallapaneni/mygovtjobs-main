"""PostgreSQL advisory lock + sync_runs table for production pipelines."""

from __future__ import annotations

import os
from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

ADVISORY_LOCK_KEY = 20260710


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

    async def start(
        self,
        session: AsyncSession,
        *,
        pipeline_name: str,
        trigger_type: str | None = None,
    ) -> str | None:
        if not await self.try_lock(session):
            return None

        run_id = str(uuid4())
        commit_sha = os.environ.get("GITHUB_SHA") or os.environ.get("VERCEL_GIT_COMMIT_SHA")
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
