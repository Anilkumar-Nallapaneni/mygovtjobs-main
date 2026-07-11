"""Tests for sync run advisory lock + sync_runs table."""

from __future__ import annotations

import asyncio

import pytest
from sqlalchemy import text

from app.database.session import SessionLocal
from app.services.sync_run_service import ADVISORY_LOCK_KEY, SyncRunService


@pytest.mark.skip(reason="Requires live Postgres with sync_runs migration")
def test_sync_run_lifecycle():
    async def _run() -> None:
        svc = SyncRunService()
        async with SessionLocal() as session:
            run_id = await svc.start(session, pipeline_name="test", trigger_type="pytest")
            assert run_id is not None
            row = (
                await session.execute(
                    text("SELECT status FROM sync_runs WHERE id = :id"),
                    {"id": run_id},
                )
            ).scalar_one()
            assert row == "running"

            await svc.finish(session, run_id, status="success", inserted_count=1)
            row = (
                await session.execute(
                    text("SELECT status FROM sync_runs WHERE id = :id"),
                    {"id": run_id},
                )
            ).scalar_one()
            assert row == "success"

            locked = (
                await session.execute(
                    text("SELECT pg_try_advisory_lock(:key)"),
                    {"key": ADVISORY_LOCK_KEY},
                )
            ).scalar_one()
            assert locked is True
            await session.execute(text("SELECT pg_advisory_unlock(:key)"), {"key": ADVISORY_LOCK_KEY})
            await session.commit()

    asyncio.run(_run())
