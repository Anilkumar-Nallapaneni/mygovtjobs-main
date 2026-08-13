"""One-shot pipeline baseline counts. Temporary helper."""

from __future__ import annotations

import asyncio
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from sqlalchemy import func, select

from app.database.session import SessionLocal
from app.models.job import Job
from app.services.publish_gate import india_today


def _as_date(value):
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    return value


async def main() -> None:
    today = india_today()
    async with SessionLocal() as session:
        live_count = (
            await session.execute(select(func.count()).select_from(Job).where(Job.status == "live"))
        ).scalar_one()
        live_vacancy_sum = (
            await session.execute(
                select(func.coalesce(func.sum(Job.vacancies), 0)).where(Job.status == "live")
            )
        ).scalar_one()

        draft_count = (
            await session.execute(select(func.count()).select_from(Job).where(Job.status == "draft"))
        ).scalar_one()
        draft_missing_last = (
            await session.execute(
                select(func.count())
                .select_from(Job)
                .where(Job.status == "draft", Job.last_date.is_(None))
            )
        ).scalar_one()

        drafts = (
            await session.execute(select(Job.id, Job.last_date).where(Job.status == "draft"))
        ).all()

        draft_with_future_last = 0
        for _id, last_date in drafts:
            last = _as_date(last_date)
            if last is not None and last >= today:
                draft_with_future_last += 1

        promote_candidates = draft_with_future_last  # counts only; promote script validates

    print(f"india_today={today.isoformat()}")
    print(f"live_count={live_count}")
    print(f"live_vacancy_sum={live_vacancy_sum}")
    print(f"draft_count={draft_count}")
    print(f"draft_missing_last_date={draft_missing_last}")
    print(f"draft_with_last_date_gte_today={draft_with_future_last}")
    print(f"promote_candidates_count={promote_candidates}")


if __name__ == "__main__":
    asyncio.run(main())
