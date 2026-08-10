#!/usr/bin/env python3
"""
Daily 8:00 AM IST — official India govt jobs sync (IngestAgent).

Runs once per IST calendar day unless --force.
  1) Sync scraper registry → sources table
  2) All enabled official scrapers → jobs + raw_ingest (parallel)
  3) Official RSS/portals → jobs
  4) Scrub aggregators + export live-jobs.json (+ optional PDF enrich)

Usage (repo root):
  npm run daily:sync
  npm run daily:sync -- --force
  npm run daily:sync:fast
"""
from __future__ import annotations

import argparse
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

from app.agents.ingest_agent import IngestAgent  # noqa: E402
from app.config import get_settings  # noqa: E402
from app.database.session import SessionLocal  # noqa: E402
from app.services.daily_sync_service import DailySyncService  # noqa: E402
from app.services.job_persist_service import JobPersistService  # noqa: E402
from app.services.source_sync_service import SourceSyncService  # noqa: E402
from app.services.supabase_audit_service import SupabaseAuditService  # noqa: E402
from app.services.sync_run_service import SyncRunService  # noqa: E402

SOURCE_TIMEOUT_SECONDS = 120
DEFAULT_CONCURRENCY = 6
NPM = "npm.cmd" if sys.platform == "win32" else "npm"


def _apply_socket_timeout_floor() -> None:
    """Stop one blocking (synchronous) scraper socket read from freezing the whole
    asyncio event loop.

    Some gov.in sources accept the TCP connection from cloud/CI IPs but never send a
    response. A synchronous scraper doing an unbounded ``recv()`` then blocks the loop
    thread outright, so even the per-source ``asyncio.wait_for`` and the ingest budget
    timer can never fire — the job idles until CI's 6h hard cancel. A process-wide
    default timeout gives every synchronous socket a floor. asyncio / asyncpg / aiohttp
    manage their own non-blocking sockets and are unaffected.
    """
    raw = os.environ.get("INGEST_SOCKET_TIMEOUT_SECONDS", "").strip()
    seconds = int(raw) if raw.isdigit() else 60
    if seconds > 0:
        socket.setdefaulttimeout(seconds)
        print(f"[ingest] socket default timeout floor = {seconds}s", flush=True)


def _start_wallclock_watchdog() -> None:
    """Belt-and-suspenders hard cap on total runtime.

    If the loop still freezes (e.g. a blocking C call that ignores the socket timeout),
    force-terminate so CI fails fast instead of hanging to the 6h ceiling. When this is
    the nested child, the parent (run-sync-production.py) sees the non-zero exit and
    marks the DB run row failed; ``mark_failed`` here also updates the JSON state file.
    Armed from ``SYNC_HARD_WALLCLOCK_SECONDS`` or, if unset, the scrape budget + 30min.
    """
    raw = os.environ.get("SYNC_HARD_WALLCLOCK_SECONDS", "").strip()
    hard = int(raw) if raw.isdigit() else 0
    if hard <= 0:
        budget_raw = os.environ.get("SYNC_INGEST_BUDGET_SECONDS", "").strip()
        if budget_raw.isdigit():
            hard = int(budget_raw) + 1800
    if hard <= 0:
        return

    def _watch() -> None:
        time.sleep(hard)
        reason = (
            f"hard wall-clock {hard}s exceeded — event loop likely frozen on blocking "
            f"network I/O; forcing exit"
        )
        print(f"\n=== WATCHDOG: {reason} ===", flush=True)
        try:
            from app.services.daily_sync_service import DailySyncService

            DailySyncService().mark_failed(reason)
        except Exception as exc:  # noqa: BLE001
            print(f"watchdog mark_failed failed: {exc}", flush=True)
        os._exit(1)

    threading.Thread(target=_watch, daemon=True, name="ingest-wallclock-watchdog").start()
    print(f"[ingest] wall-clock watchdog armed at {hard}s", flush=True)


async def sync_sources() -> int:
    async with SessionLocal() as session:
        return await SourceSyncService().sync_registry(session)


async def run_ingest(
    *,
    source_timeout: int,
    concurrency: int,
    retries: int,
) -> tuple[int, int]:
    agent = IngestAgent()
    enabled = [s for s in agent.registry.get("scrapers", []) if s.get("enabled")]
    print(f"=== IngestAgent — {len(enabled)} official sources (concurrency={concurrency}) ===", flush=True)
    semaphore = asyncio.Semaphore(max(1, concurrency))
    saved_total = 0
    completed = 0

    async def run_one(i: int, entry: dict) -> int:
        nonlocal saved_total, completed
        code = entry.get("code", "?")
        attempts = max(0, retries) + 1
        for attempt in range(1, attempts + 1):
            try:
                async with semaphore:
                    row = await asyncio.wait_for(agent.run_source(code), timeout=source_timeout)
                saved = int(row.get("saved") or 0)
                saved_total += saved
                completed += 1
                print(
                    f"[{i}/{len(enabled)}] {code}: saved={saved} fetched={row.get('fetched', 0)}",
                    flush=True,
                )
                return saved
            except Exception as exc:
                if attempt >= attempts:
                    label = "TIMEOUT" if isinstance(exc, asyncio.TimeoutError) else "FAIL"
                    completed += 1
                    print(f"[{i}/{len(enabled)}] {code}: {label} {exc}", flush=True)
                    return 0
                print(f"[{i}/{len(enabled)}] {code}: retry {attempt}/{retries}", flush=True)
        return 0

    # Global wall-clock budget so a slow full scrape never blows past CI's hard cap.
    # GitHub cancels the job at 6h; a mid-scrape cancel skips the commit step and loses
    # the whole day. After the budget we cancel unfinished sources and export what we saved.
    budget = 0
    raw_budget = os.environ.get("SYNC_INGEST_BUDGET_SECONDS", "").strip()
    if raw_budget.isdigit():
        budget = int(raw_budget)

    tasks = [asyncio.create_task(run_one(i, entry)) for i, entry in enumerate(enabled, 1)]
    if budget > 0:
        _, pending = await asyncio.wait(tasks, timeout=budget)
        if pending:
            print(
                f"=== ingest budget {budget}s reached — cancelling {len(pending)} unfinished "
                f"source(s); exporting {completed}/{len(enabled)} scraped ===",
                flush=True,
            )
            for task in pending:
                task.cancel()
            try:
                await asyncio.wait_for(
                    asyncio.gather(*pending, return_exceptions=True), timeout=90
                )
            except asyncio.TimeoutError:
                print("some sources ignored cancellation; proceeding to export", flush=True)
    else:
        await asyncio.gather(*tasks)

    return completed, saved_total


def _npm_step_timeout() -> int | None:
    """Per-subprocess wall-clock cap. Node build/fetch steps (tsx fetch:official etc.)
    are separate processes not covered by this process's socket timeout floor; a hung
    fetch to a dead host would otherwise block the whole pipeline until the watchdog
    fires. Bound each step (NPM_STEP_TIMEOUT_SECONDS, default 30min; 0 disables)."""
    raw = os.environ.get("NPM_STEP_TIMEOUT_SECONDS", "").strip()
    if raw.isdigit():
        return int(raw) or None
    return 1800


def run_npm(script: str, *extra: str) -> None:
    cmd = [NPM, "run", script, *extra]
    print(f"\n=== npm run {script} {' '.join(extra)} ===", flush=True)
    timeout = _npm_step_timeout()
    try:
        subprocess.run(cmd, cwd=ROOT, check=False, timeout=timeout)
    except subprocess.TimeoutExpired:
        print(
            f"=== npm run {script}: exceeded {timeout}s — killed; continuing pipeline ===",
            flush=True,
        )


def run_official_import() -> None:
    run_npm("fetch:official")
    timeout = _npm_step_timeout()
    try:
        subprocess.run(
            ["node", "scripts/run-python.mjs", "scripts/import-official-json-to-db.py"],
            cwd=ROOT,
            check=False,
            timeout=timeout,
        )
    except subprocess.TimeoutExpired:
        print(
            f"=== import-official-json-to-db: exceeded {timeout}s — killed; continuing ===",
            flush=True,
        )


async def export_and_finish(sources_scraped: int) -> int:
    async with SessionLocal() as session:
        count = await JobPersistService().export_live_jobs_json(session)
        audit = await SupabaseAuditService().table_counts(session)
        for k, v in audit.items():
            print(f"  {k}: {v}", flush=True)
    persist = JobPersistService()
    block = DailySyncService().daily_sync_json_block(job_count=count, sources_scraped=sources_scraped)
    persist.patch_live_jobs_daily_sync(block)
    return count


async def main() -> int:
    parser = argparse.ArgumentParser(description="Daily 8 AM IST official jobs sync")
    parser.add_argument("--force", action="store_true", help="Run even if already completed today (IST)")
    parser.add_argument("--concurrency", type=int, default=DEFAULT_CONCURRENCY, help="Parallel source scrapers")
    parser.add_argument("--source-timeout", type=int, default=SOURCE_TIMEOUT_SECONDS, help="Per-source timeout (seconds)")
    parser.add_argument("--retries", type=int, default=0, help="Retries per source after failure/timeout")
    parser.add_argument("--skip-official-import", action="store_true", help="Skip fetch:official JSON import")
    parser.add_argument("--skip-enrich", action="store_true", help="Skip PDF backfill + metadata enrich (much faster)")
    parser.add_argument(
        "--nested",
        action="store_true",
        help="Called from sync:production — skip advisory lock (outer pipeline holds it)",
    )
    args = parser.parse_args()

    _apply_socket_timeout_floor()
    _start_wallclock_watchdog()

    sync = DailySyncService()
    ok, reason = sync.can_start(force=args.force)
    if not ok:
        print(f"SKIP: {reason}", flush=True)
        return 0

    run_id = None
    owns_lock = not args.nested
    if owns_lock:
        async with SessionLocal() as session:
            run_id = await SyncRunService().start(session, pipeline_name="daily:sync")
            if run_id is None:
                print("SKIP: Another sync is already running (advisory lock).", flush=True)
                return 0

    # Export live-jobs.json once at end — not after every source (major speedup)
    os.environ["INGEST_SKIP_PER_SOURCE_EXPORT"] = "1"
    get_settings.cache_clear()

    sync.mark_started()
    saved_total = 0
    scraped = 0
    try:
        n_sources = await sync_sources()
        print(f"Synced {n_sources} sources to database", flush=True)

        scraped, saved_total = await run_ingest(
            source_timeout=args.source_timeout,
            concurrency=args.concurrency,
            retries=args.retries,
        )
        print(f"Ingest saved {saved_total} rows from {scraped} sources", flush=True)

        if args.skip_official_import:
            print("\n=== Skipping fetch:official + import ===", flush=True)
        else:
            # feed-only: never overwrite live-jobs.json with raw RSS rows
            run_npm("fetch:official", "--", "--feed-only")
            timeout = _npm_step_timeout()
            try:
                subprocess.run(
                    ["node", "scripts/run-python.mjs", "scripts/import-official-json-to-db.py"],
                    cwd=ROOT,
                    check=False,
                    timeout=timeout,
                )
            except subprocess.TimeoutExpired:
                print(
                    f"=== import-official-json-to-db: exceeded {timeout}s — killed; continuing ===",
                    flush=True,
                )

        if args.skip_enrich:
            print("\n=== Skipping pdf:backfill + enrich:jobs (run weekly if needed) ===", flush=True)
        else:
            run_npm("pdf:backfill")
            run_npm("enrich:jobs")

        run_npm("data:scrub")

        job_count = await export_and_finish(scraped)

        if get_settings().alert_delivery_after_sync:
            from app.workers.alert_delivery_worker import run_alert_delivery

            stats = await run_alert_delivery()
            print(
                f"Alert delivery: sent={stats.get('sent', 0)} skipped={stats.get('skipped', 0)}",
                flush=True,
            )

        print(
            f"\nDone. {job_count} jobs in DB + live-jobs.json. Next automatic run: "
            f"{sync.next_run_ist().strftime('%Y-%m-%d %H:%M %Z')}",
            flush=True,
        )
        if owns_lock and run_id is not None:
            async with SessionLocal() as session:
                await SyncRunService().finish(
                    session,
                    run_id,
                    status="success",
                    inserted_count=saved_total,
                    updated_count=job_count,
                )
        return 0
    except Exception as exc:
        import traceback

        msg = str(exc).strip()
        detail = f"{type(exc).__name__}: {msg}" if msg else f"{type(exc).__name__}"
        sync.mark_failed(detail)
        if owns_lock and run_id is not None:
            async with SessionLocal() as session:
                await SyncRunService().finish(
                    session,
                    run_id,
                    status="failed",
                    inserted_count=saved_total,
                    updated_count=0,
                    error_message=detail,
                )
        print(f"FAILED: {detail}", flush=True)
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
