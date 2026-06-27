"""Quick job status breakdown. Run: node scripts/run-python.mjs scripts/check-job-status.py"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from sqlalchemy import text

from app.database.session import SessionLocal


async def main() -> None:
    async with SessionLocal() as session:
        rows = (
            await session.execute(
                text("SELECT COALESCE(status, 'null') AS status, count(*) FROM jobs GROUP BY status ORDER BY count DESC")
            )
        ).all()
        for status, count in rows:
            print(f"  {status}: {count}")
        visible = (
            await session.execute(text("SELECT count(*) FROM jobs WHERE status IN ('live', 'expired')"))
        ).scalar_one()
        print(f"  live+expired: {visible}")


if __name__ == "__main__":
    asyncio.run(main())
