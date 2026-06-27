#!/usr/bin/env python3
import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.database.session import SessionLocal  # noqa: E402
from app.services.source_sync_service import SourceSyncService  # noqa: E402


async def main() -> None:
    async with SessionLocal() as session:
        n = await SourceSyncService().sync_registry(session)
    print(f"Synced {n} sources to Supabase")


if __name__ == "__main__":
    asyncio.run(main())
