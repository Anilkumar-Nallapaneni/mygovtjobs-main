"""Apply database/supabase_setup.sql and migrations via backend DATABASE_URL.

Default (npm run db:migrate):
  - Skips supabase_setup.sql when the jobs table already exists
  - Tracks applied files in schema_migrations — safe to re-run on live Supabase

Fresh install: npm run db:migrate:fresh
"""
from __future__ import annotations

import argparse
import asyncio
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from dotenv import load_dotenv

load_dotenv(ROOT / ".env")
load_dotenv(ROOT / "backend" / ".env")

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.config import get_settings
from app.database.connect_args import asyncpg_connect_args

MIGRATIONS_DIR = ROOT / "database" / "migrations"
SETUP_FILE = ROOT / "database" / "supabase_setup.sql"


def strip_sql_comments(content: str) -> str:
    lines: list[str] = []
    for line in content.splitlines():
        if line.strip().startswith("--"):
            continue
        lines.append(line)
    return "\n".join(lines)


def split_sql(content: str) -> list[str]:
    """Split SQL file into executable statements (respects $tag$ ... $tag$ blocks)."""
    body = strip_sql_comments(content).strip()
    if not body:
        return []

    parts: list[str] = []
    current: list[str] = []
    in_dollar = False
    dollar_delim: str | None = None
    i = 0
    n = len(body)

    while i < n:
        ch = body[i]
        if ch == "$" and not in_dollar:
            j = i + 1
            while j < n and (body[j].isalnum() or body[j] == "_"):
                j += 1
            if j < n and body[j] == "$":
                dollar_delim = body[i : j + 1]
                in_dollar = True
                current.append(dollar_delim)
                i = j + 1
                continue
        if in_dollar and dollar_delim and body.startswith(dollar_delim, i):
            current.append(dollar_delim)
            i += len(dollar_delim)
            in_dollar = False
            dollar_delim = None
            continue
        if ch == ";" and not in_dollar:
            stmt = "".join(current).strip()
            if stmt:
                parts.append(stmt)
            current = []
            i += 1
            continue
        current.append(ch)
        i += 1

    tail = "".join(current).strip()
    if tail:
        parts.append(tail)
    return parts


def _migration_number(path: Path) -> int | None:
    m = re.match(r"^(\d+)_", path.name)
    return int(m.group(1)) if m else None


def migration_key(path: Path) -> str:
    if path == SETUP_FILE:
        return "supabase_setup.sql"
    return f"migrations/{path.name}"


async def ensure_tracking_table(conn) -> None:
    await conn.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS schema_migrations (
              filename TEXT PRIMARY KEY,
              applied_at TIMESTAMPTZ DEFAULT NOW()
            )
            """
        )
    )


async def table_exists(conn, name: str) -> bool:
    row = (
        await conn.execute(
            text(
                """
                SELECT EXISTS (
                  SELECT 1 FROM information_schema.tables
                  WHERE table_schema = 'public' AND table_name = :name
                )
                """
            ),
            {"name": name},
        )
    ).scalar_one()
    return bool(row)


async def storage_bucket_exists(conn, bucket_id: str) -> bool:
    try:
        row = (
            await conn.execute(
                text("SELECT EXISTS (SELECT 1 FROM storage.buckets WHERE id = :id)"),
                {"id": bucket_id},
            )
        ).scalar_one()
        return bool(row)
    except Exception:
        return False


async def column_exists(conn, table: str, column: str) -> bool:
    row = (
        await conn.execute(
            text(
                """
                SELECT EXISTS (
                  SELECT 1 FROM information_schema.columns
                  WHERE table_schema = 'public' AND table_name = :table AND column_name = :column
                )
                """
            ),
            {"table": table, "column": column},
        )
    ).scalar_one()
    return bool(row)


async def applied_filenames(conn) -> set[str]:
    await ensure_tracking_table(conn)
    rows = (await conn.execute(text("SELECT filename FROM schema_migrations"))).fetchall()
    return {str(r[0]) for r in rows}


async def mark_applied(conn, filename: str) -> None:
    await conn.execute(
        text(
            "INSERT INTO schema_migrations (filename) VALUES (:filename) "
            "ON CONFLICT (filename) DO NOTHING"
        ),
        {"filename": filename},
    )


async def bootstrap_existing_db(conn) -> None:
    """One-time: mark legacy schema as applied so live DBs don't re-run setup."""
    await ensure_tracking_table(conn)
    existing = await applied_filenames(conn)
    if existing:
        return
    if not await table_exists(conn, "jobs"):
        return

    print("Detected existing database — marking baseline schema as already applied.")
    baseline = ["supabase_setup.sql"]
    for sql_file in sorted(MIGRATIONS_DIR.glob("*.sql")):
        num = _migration_number(sql_file)
        if num is None:
            continue
        if num <= 8:
            baseline.append(migration_key(sql_file))
        elif num == 9 and await table_exists(conn, "profiles"):
            baseline.append(migration_key(sql_file))
        elif num == 10 and await storage_bucket_exists(conn, "job-details"):
            baseline.append(migration_key(sql_file))
        elif num == 11 and await column_exists(conn, "jobs", "is_sponsored"):
            baseline.append(migration_key(sql_file))
        elif num == 12 and await column_exists(conn, "jobs", "title_fingerprint"):
            baseline.append(migration_key(sql_file))
        elif num == 13 and await table_exists(conn, "payment_orders"):
            baseline.append(migration_key(sql_file))

    for name in baseline:
        await mark_applied(conn, name)
    await conn.commit()
    print(f"  Baseline recorded ({len(baseline)} files). Only new migrations will run.")


def select_sql_files(
    *,
    fresh: bool,
    migrations_only: bool,
    from_migration: int | None,
    skip_setup: bool,
) -> list[Path]:
    files: list[Path] = []
    if not migrations_only and not skip_setup and from_migration is None:
        if SETUP_FILE.is_file():
            files.append(SETUP_FILE)
    for sql_file in sorted(MIGRATIONS_DIR.glob("*.sql")):
        num = _migration_number(sql_file)
        if from_migration is not None and (num is None or num < from_migration):
            continue
        files.append(sql_file)
    if fresh:
        return files
    return files


async def main() -> None:
    parser = argparse.ArgumentParser(description="Apply Supabase SQL schema/migrations")
    parser.add_argument(
        "--fresh",
        action="store_true",
        help="Run full supabase_setup + all migrations (new empty project only)",
    )
    parser.add_argument(
        "--migrations-only",
        action="store_true",
        help="Skip supabase_setup.sql",
    )
    parser.add_argument(
        "--from",
        dest="from_migration",
        type=int,
        metavar="NNN",
        help="Only run numbered migrations >= NNN",
    )
    args = parser.parse_args()

    url = get_settings().database_url
    if "REPLACE_WITH" in url or "YOUR_PROJECT" in url:
        print("[FAIL] Set a real DATABASE_URL in backend/.env")
        sys.exit(1)

    engine = create_async_engine(
        url,
        connect_args=asyncpg_connect_args(command_timeout=300),
    )
    applied_stmts = 0
    files_run = 0
    files_skipped = 0

    skip_setup = False
    try:
        async with engine.connect() as conn:
            if not args.fresh and not args.migrations_only and args.from_migration is None:
                skip_setup = await table_exists(conn, "jobs")
                if skip_setup:
                    print("Skipping supabase_setup.sql (jobs table already exists).")
                await bootstrap_existing_db(conn)
                await conn.commit()
            done = await applied_filenames(conn)

        sql_files = select_sql_files(
            fresh=args.fresh,
            migrations_only=args.migrations_only or args.from_migration is not None,
            from_migration=args.from_migration,
            skip_setup=skip_setup,
        )
        if not sql_files:
            print("[FAIL] No SQL files matched")
            sys.exit(1)

        for sql_file in sql_files:
            key = migration_key(sql_file)
            if not args.fresh and key in done:
                print(f"Skip {sql_file.relative_to(ROOT)} (already applied)")
                files_skipped += 1
                continue

            print(f"Applying {sql_file.relative_to(ROOT)} ...")
            statements = split_sql(sql_file.read_text(encoding="utf-8"))
            async with engine.begin() as conn:
                await ensure_tracking_table(conn)
                for stmt in statements:
                    await conn.execute(text(stmt))
                    applied_stmts += 1
                if not args.fresh:
                    await mark_applied(conn, key)
            files_run += 1

        async with engine.connect() as conn:
            n = (await conn.execute(text("SELECT count(*) FROM sources"))).scalar_one()
            jobs = (await conn.execute(text("SELECT count(*) FROM jobs"))).scalar_one()

        if files_run == 0:
            print(f"[OK] Database up to date ({files_skipped} files skipped). sources={n} jobs={jobs}")
        else:
            print(
                f"[OK] Applied {files_run} file(s), {applied_stmts} statements "
                f"({files_skipped} skipped). sources={n} jobs={jobs}"
            )
    except Exception as exc:
        msg = str(exc).split("\n")[0]
        print(f"[FAIL] {msg}")
        if "timeout" in msg.lower() or "deadlock" in msg.lower():
            print(
                "  Tip: Do not use db:migrate:fresh on a live database. "
                "Use npm run db:migrate (safe) or db:migrate:pending for new migrations only."
            )
        sys.exit(1)
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
