#!/usr/bin/env python3
"""Canonical production pipeline — advisory lock, daily ingest, export, sitemap."""
from __future__ import annotations

import asyncio
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.database.session import SessionLocal  # noqa: E402
from app.services.sync_run_service import SyncRunService  # noqa: E402

NPM = "npm.cmd" if sys.platform == "win32" else "npm"
PYTHON = "node"


def run_npm(script: str, *extra: str) -> int:
    cmd = [NPM, "run", script, *extra]
    print(f"\n=== npm run {script} {' '.join(extra)} ===", flush=True)
    return subprocess.run(cmd, cwd=ROOT, check=False).returncode


def run_daily_nested() -> int:
    # run-python.mjs forwards argv to Python as-is — do not insert a bare "--"
    # (argparse treats it as an unrecognized argument).
    extra: list[str] = []
    if os.environ.get("SYNC_FORCE", "").strip() in ("1", "true", "yes"):
        extra.append("--force")
    concurrency = os.environ.get("SYNC_CONCURRENCY", "").strip()
    if concurrency.isdigit():
        extra.extend(["--concurrency", concurrency])
    return subprocess.run(
        [
            PYTHON,
            "scripts/run-python.mjs",
            "scripts/run-daily-8am-sync.py",
            "--nested",
            "--skip-enrich",
            *extra,
        ],
        cwd=ROOT,
        check=False,
    ).returncode


async def main() -> int:
    trigger = os.environ.get("SYNC_TRIGGER_TYPE", "manual")
    run_id: str | None = None

    async with SessionLocal() as session:
        run_id = await SyncRunService().start(
            session,
            pipeline_name="sync:production",
            trigger_type=trigger,
        )
        if run_id is None:
            print("SKIP: Another sync is already running (advisory lock).", flush=True)
            return 0

    code = 0
    inserted = 0
    updated = 0
    error_message: str | None = None

    try:
        code = run_daily_nested()
        if code == 0:
            run_npm("fetch:official:feeds")
            run_npm("build:official-archives")
            run_npm("build:live-jobs-list")
            run_npm("build:live-jobs-bootstrap")
            run_npm("build:sitemap")
            run_npm("verify:live-jobs")
        else:
            error_message = f"daily sync exited with code {code}"

        status = "success" if code == 0 else "failed"
        async with SessionLocal() as session:
            await SyncRunService().finish(
                session,
                run_id,
                status=status,
                inserted_count=inserted,
                updated_count=updated,
                error_message=error_message,
            )
        print(f"sync:production {status}", flush=True)
        return code
    except Exception as exc:
        detail = f"{type(exc).__name__}: {exc}"
        async with SessionLocal() as session:
            await SyncRunService().finish(
                session,
                run_id,
                status="failed",
                error_message=detail,
            )
        print(f"sync:production FAILED: {detail}", flush=True)
        return 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
