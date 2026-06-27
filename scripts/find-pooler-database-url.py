#!/usr/bin/env python3
"""Find a Supabase pooler DATABASE_URL that works (IPv4, for GitHub Actions)."""
from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path
from urllib.parse import quote, unquote, urlparse

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.database.connect_args import asyncpg_connect_args

ROOT = Path(__file__).resolve().parents[1]


def load_database_url() -> str:
    raw = os.environ.get("DATABASE_URL", "").strip()
    if raw:
        return raw
    env_path = ROOT / "backend" / ".env"
    if not env_path.exists():
        print("[FAIL] Set DATABASE_URL or create backend/.env")
        sys.exit(1)
    for line in env_path.read_text(encoding="utf-8").splitlines():
        if line.startswith("DATABASE_URL="):
            return line.split("=", 1)[1].strip()
    print("[FAIL] DATABASE_URL not found in backend/.env")
    sys.exit(1)


def parse_creds(url: str) -> tuple[str, str, str]:
    """Return (project_ref, password_decoded, current_host)."""
    normalized = url.replace("postgresql+asyncpg://", "postgresql://", 1)
    u = urlparse(normalized)
    host = u.hostname or ""
    user = unquote(u.username or "")
    password = unquote(u.password or "")
    ref = ""
    if user.startswith("postgres."):
        ref = user.split(".", 1)[1]
    elif host.startswith("db.") and host.endswith(".supabase.co"):
        ref = host.removeprefix("db.").removesuffix(".supabase.co")
    if not ref or not password:
        print("[FAIL] Could not parse project ref / password from DATABASE_URL")
        sys.exit(1)
    return ref, password, host


async def try_url(url: str) -> bool:
    engine = create_async_engine(
        url,
        connect_args=asyncpg_connect_args(command_timeout=30),
    )
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except Exception as exc:
        try_url.last_error = str(exc).split("\n")[0]  # type: ignore[attr-defined]
        return False
    finally:
        await engine.dispose()


async def main() -> int:
    current = load_database_url()
    ref, password, host = parse_creds(current)
    enc_pwd = quote(password, safe="")

    hosts = []
    if host.endswith(".pooler.supabase.com"):
        hosts.append(host)
    hosts.extend([
        "aws-0-ap-south-1.pooler.supabase.com",
        "aws-1-ap-south-1.pooler.supabase.com",
        "aws-0-ap-southeast-1.pooler.supabase.com",
        "aws-1-ap-southeast-1.pooler.supabase.com",
        "aws-0-us-east-1.pooler.supabase.com",
        "aws-0-eu-west-1.pooler.supabase.com",
    ])
    hosts = list(dict.fromkeys(hosts))
    modes = [(6543, "transaction"), (5432, "session")]

    print(f"Project ref: {ref}")
    print(f"Current host: {host}")
    print("Trying Supavisor pooler hosts (IPv4)…\n")

    for pooler_host in hosts:
        for port, mode in modes:
            user = f"postgres.{ref}"
            url = f"postgresql+asyncpg://{user}:{enc_pwd}@{pooler_host}:{port}/postgres"
            label = f"{pooler_host}:{port} ({mode})"
            ok = await try_url(url)
            err = getattr(try_url, "last_error", "")
            status = "OK" if ok else f"fail ({err[:80]})" if err else "fail"
            print(f"  [{status}] {label}")
            if ok:
                print("\n=== Use this DATABASE_URL in GitHub Secrets ===\n")
                print(url)
                print("\nAlso update backend/.env DATABASE_URL= with the same value.")
                return 0

    print("\n[FAIL] No pooler host worked.")
    print("In Supabase Dashboard > Project Settings > Database > Connection string:")
    print("  1. Mode: Transaction pooler (or Session pooler)")
    print("  2. Copy the URI and change postgresql:// to postgresql+asyncpg://")
    print("  3. Note the REGION in the host (e.g. aws-0-ap-south-1.pooler.supabase.com)")
    print("")
    print("For GitHub Actions, add these secrets instead of DATABASE_URL:")
    print("  SUPABASE_PROJECT_REF = lqihbxujvvvzagrfoorf")
    print("  SUPABASE_DB_PASSWORD = your DB password (plain text)")
    print("  SUPABASE_DB_REGION   = region from pooler host (e.g. ap-south-1)")
    print("")
    print("OR use self-hosted runner workflow: supabase-auto-ingest-self-hosted.yml")
    print("(runs on your Windows PC where db host already works)")
    return 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
