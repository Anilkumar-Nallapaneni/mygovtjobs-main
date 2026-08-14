#!/usr/bin/env python3
"""Canonical production pipeline — advisory lock, daily ingest, export, sitemap."""
from __future__ import annotations

import asyncio
import json
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
from app.services.job_persist_service import _snapshot_looks_like_ungated_feed_dump  # noqa: E402
from app.services.sync_run_service import SyncRunService  # noqa: E402

NPM = "npm.cmd" if sys.platform == "win32" else "npm"
PYTHON = "node"
LIVE_JSON = ROOT / "frontend" / "public" / "data" / "live-jobs.json"


def _npm_step_timeout() -> int | None:
    """Per-subprocess wall-clock cap so a hung node build/fetch step (separate process,
    not covered by the socket floor) cannot block the pipeline. NPM_STEP_TIMEOUT_SECONDS,
    default 30min; 0 disables."""
    raw = os.environ.get("NPM_STEP_TIMEOUT_SECONDS", "").strip()
    if raw.isdigit():
        return int(raw) or None
    return 1800


def run_npm(script: str, *extra: str) -> int:
    cmd = [NPM, "run", script, *extra]
    print(f"\n=== npm run {script} {' '.join(extra)} ===", flush=True)
    timeout = _npm_step_timeout()
    try:
        completed = subprocess.run(cmd, cwd=ROOT, check=False, timeout=timeout)
        code = completed.returncode
        if code is None:
            return 1
        return int(code)
    except subprocess.TimeoutExpired:
        print(
            f"=== npm run {script}: exceeded {timeout}s — killed ===",
            flush=True,
        )
        return 124


def require_npm(script: str, *extra: str) -> None:
    """Run an npm script and raise if it does not exit 0."""
    code = run_npm(script, *extra)
    if code != 0:
        raise RuntimeError(f"npm run {script} exited with code {code}")


def _assert_gated_snapshot_after_export() -> None:
    """Fail hard when export refused silently or left an ungated feed dump in place."""
    if not LIVE_JSON.exists():
        raise RuntimeError(f"missing snapshot after export: {LIVE_JSON}")
    try:
        payload = json.loads(LIVE_JSON.read_text(encoding="utf-8"))
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError(f"unreadable live-jobs.json after export: {exc}") from exc
    items = payload.get("items")
    if not isinstance(items, list) or not items:
        raise RuntimeError("live-jobs.json has no items after export")
    if _snapshot_looks_like_ungated_feed_dump(payload):
        raise RuntimeError(
            f"live-jobs.json still looks like an ungated feed dump after export "
            f"({len(items)} rows) — export likely refused or was overwritten"
        )


def _print_watchdog_summary() -> None:
    """Surface WatchdogAgent results in CI logs and copy a durable audit artifact."""
    report_path = ROOT / "scripts" / "watchdog-report.json"
    if not report_path.exists():
        print("warn: watchdog-report.json missing after ai:watchdog:apply-db", flush=True)
        return
    try:
        report = json.loads(report_path.read_text(encoding="utf-8"))
    except Exception as exc:  # noqa: BLE001
        print(f"warn: unreadable watchdog-report.json: {exc}", flush=True)
        return
    demoted = report.get("demoted") or []
    print(
        "=== Watchdog summary === "
        f"scanned={report.get('scanned', 0)} "
        f"ok={report.get('ok', 0)} "
        f"demoted={len(demoted)} "
        f"updated={report.get('rowsUpdated', 0)}",
        flush=True,
    )
    for row in demoted[:12]:
        slug = row.get("slug") if isinstance(row, dict) else row
        reasons = row.get("reasons") if isinstance(row, dict) else None
        print(f"  demoted: {slug} reasons={reasons}", flush=True)
    audit_dir = ROOT / "docs" / "audits"
    audit_dir.mkdir(parents=True, exist_ok=True)
    dest = audit_dir / "watchdog-latest.json"
    dest.write_text(json.dumps(report, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
    print(f"Wrote {dest}", flush=True)


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

    inserted = 0
    updated = 0
    # Allow gated catalog recovery before *any* export (daily nested, promote, export:live-jobs).
    os.environ["ALLOW_DRASTIC_JSON_EXPORT"] = "1"

    try:
        code = run_daily_nested()
        if code is None:
            code = 1
        if code != 0:
            raise RuntimeError(f"daily sync exited with code {code}")

        # Feeds/archives must never own live-jobs.json. Re-export gated catalog after.
        # Soft-fail feeds/archives so a flaky RSS step cannot mask a good gated export,
        # but promote → export → clean → verify must all succeed.
        feed_code = run_npm("fetch:official:feeds")
        if feed_code != 0:
            print(f"warn: fetch:official:feeds exited {feed_code}; continuing", flush=True)
        archive_code = run_npm("build:official-archives")
        if archive_code != 0:
            print(f"warn: build:official-archives exited {archive_code}; continuing", flush=True)

        require_npm("data:promote-publish-gate:apply")
        # Demote bad live rows after promote, before the final gated export.
        require_npm("ai:watchdog:apply-db")
        _print_watchdog_summary()
        require_npm("export:live-jobs")
        _assert_gated_snapshot_after_export()
        require_npm("data:scrub-vacancies")
        require_npm("clean:live-jobs")
        require_npm("build:sitemap")
        require_npm("verify:live-jobs")

        async with SessionLocal() as session:
            await SyncRunService().finish(
                session,
                run_id,
                status="success",
                inserted_count=inserted,
                updated_count=updated,
                error_message=None,
            )
        print("sync:production success", flush=True)
        return 0
    except Exception as exc:
        detail = f"{type(exc).__name__}: {exc}"
        async with SessionLocal() as session:
            await SyncRunService().finish(
                session,
                run_id,
                status="failed",
                error_message=detail,
            )
        print("sync:production failed", flush=True)
        print(f"sync:production FAILED: {detail}", flush=True)
        return 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
