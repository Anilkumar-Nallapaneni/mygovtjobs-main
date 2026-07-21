#!/usr/bin/env python3
"""Canonical production pipeline — advisory lock, daily ingest, export, sitemap."""
from __future__ import annotations

import asyncio
import os
import socket
import subprocess
import sys
import threading
import time
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


def _apply_socket_timeout_floor() -> None:
    """Floor every synchronous socket read so no blocking scraper call can freeze the
    process. See run-daily-8am-sync.py for the full rationale. asyncio/asyncpg/aiohttp
    manage their own non-blocking sockets and are unaffected."""
    raw = os.environ.get("INGEST_SOCKET_TIMEOUT_SECONDS", "").strip()
    seconds = int(raw) if raw.isdigit() else 60
    if seconds > 0:
        socket.setdefaulttimeout(seconds)
        print(f"[sync:production] socket default timeout floor = {seconds}s", flush=True)


def _start_wallclock_watchdog() -> None:
    """Outer hard cap for the whole pipeline (scrape + import + export + build). If any
    phase freezes, force-terminate before CI's 6h ceiling and clean up the DB run row via
    the standalone mark-failed script (a fresh process, immune to a frozen loop here).
    Armed from ``SYNC_HARD_WALLCLOCK_SECONDS`` or, if unset, the scrape budget + 60min."""
    raw = os.environ.get("SYNC_HARD_WALLCLOCK_SECONDS", "").strip()
    hard = int(raw) if raw.isdigit() else 0
    if hard <= 0:
        budget_raw = os.environ.get("SYNC_INGEST_BUDGET_SECONDS", "").strip()
        if budget_raw.isdigit():
            hard = int(budget_raw) + 3600
    if hard <= 0:
        return

    def _watch() -> None:
        time.sleep(hard)
        reason = f"hard wall-clock {hard}s exceeded — forcing exit to avoid 6h CI hang"
        print(f"\n=== WATCHDOG: {reason} ===", flush=True)
        try:
            subprocess.run(
                [PYTHON, "scripts/run-python.mjs", "scripts/mark-daily-sync-failed.py"],
                cwd=ROOT,
                timeout=120,
                env={**os.environ, "SYNC_FAIL_REASON": reason},
                check=False,
            )
        except Exception as exc:  # noqa: BLE001
            print(f"watchdog cleanup failed/timeout: {exc}", flush=True)
        os._exit(1)

    threading.Thread(target=_watch, daemon=True, name="sync-wallclock-watchdog").start()
    print(f"[sync:production] wall-clock watchdog armed at {hard}s", flush=True)


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


def _install_signal_handlers(run_id: str | None) -> None:
    """Best-effort cleanup when GitHub Actions kills the job (SIGTERM)."""
    import signal

    def _handler(signum: int, _frame: object) -> None:
        from app.services.daily_sync_service import DailySyncService

        reason = f"received signal {signum} (runner cancelled or timed out)"
        try:
            DailySyncService().mark_failed(reason)
        except Exception as exc:  # noqa: BLE001
            print(f"mark_failed during signal: {exc}", flush=True)
        print(f"sync:production interrupted: {reason}", flush=True)
        raise SystemExit(143)

    for sig in (signal.SIGTERM, signal.SIGINT):
        try:
            signal.signal(sig, _handler)
        except Exception:  # noqa: BLE001
            pass


async def main() -> int:
    _apply_socket_timeout_floor()
    _start_wallclock_watchdog()

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

    _install_signal_handlers(run_id)

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
