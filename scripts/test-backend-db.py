"""Test backend DATABASE_URL. Run: backend/.venv/Scripts/python scripts/test-backend-db.py"""
import asyncio
import sys
from pathlib import Path

from dotenv import load_dotenv

_root = Path(__file__).resolve().parents[1]
load_dotenv(_root / ".env")
load_dotenv(_root / "backend" / ".env")

sys.path.insert(0, str(_root / "backend"))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.config import get_settings
from app.database.connect_args import asyncpg_connect_args


async def main() -> None:
    settings = get_settings()
    url = settings.database_url
    if "REPLACE_WITH" in url:
        print("[FAIL] backend/.env still has REPLACE_WITH_DB_PASSWORD - set Supabase database password")
        sys.exit(1)
    engine = create_async_engine(
        url,
        connect_args=asyncpg_connect_args(command_timeout=settings.database_command_timeout),
    )
    try:
        async with engine.connect() as conn:
            n = (await conn.execute(text("SELECT count(*) FROM jobs"))).scalar_one()
        print(f"[OK] Database connected - jobs table has {n} row(s)")
    except Exception as exc:
        msg = str(exc).split("\n")[0]
        if "does not exist" in msg.lower() or "undefinedtable" in msg.lower():
            print("[FAIL] Table jobs missing - run database/supabase_setup.sql in Supabase SQL Editor")
        elif "password authentication failed" in msg.lower():
            print("[FAIL] Wrong database password in DATABASE_URL")
        elif "network is unreachable" in msg.lower() or "errno 101" in msg.lower():
            print("[FAIL] Network unreachable — db.*.supabase.co is IPv6-only and fails on GitHub Actions")
            print("  Fix: use Transaction pooler URI:")
            print("  postgresql+asyncpg://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres")
        elif ":6543" in url and "db." in url and "pooler" not in url:
            print("[FAIL] Invalid DATABASE_URL — port 6543 requires aws-0-REGION.pooler.supabase.com (not db.*.supabase.co)")
        elif "certificate verify failed" in msg.lower() or "self-signed certificate" in msg.lower():
            print("[FAIL] SSL certificate verification failed for DATABASE_URL")
            print("  Common on Windows when antivirus inspects HTTPS (self-signed cert in chain).")
            print("  Fix: add DATABASE_SSL_INSECURE=1 to backend/.env for local dev only.")
            print("  CI/production must keep verified TLS — do not set DATABASE_SSL_INSECURE in GitHub secrets.")
        else:
            print(f"[FAIL] {msg}")
        sys.exit(1)
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
