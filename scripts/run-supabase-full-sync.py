#!/usr/bin/env python3
"""
Full Supabase sync:
  1) Sync all scrapers -> `sources`
  2) All enabled official scrapers -> `raw_ingest` + `jobs`
  3) Official RSS/portals JSON -> `jobs`
  4) Scrub + export + audit
"""
import argparse
import asyncio
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.agents.ingest_agent import IngestAgent  # noqa: E402
from app.database.session import SessionLocal  # noqa: E402
from app.services.source_sync_service import SourceSyncService  # noqa: E402
from app.services.supabase_audit_service import SupabaseAuditService  # noqa: E402

SOURCE_TIMEOUT_SECONDS = 240
NPM = "npm.cmd" if sys.platform == "win32" else "npm"


async def sync_sources() -> int:
    async with SessionLocal() as session:
        return await SourceSyncService().sync_registry(session)


async def run_ingest(
    *,
    source_timeout: int,
    concurrency: int,
    retries: int,
    limit: int,
    only_sources: list[str],
) -> None:
    agent = IngestAgent()
    registry = [s for s in agent.registry.get("scrapers", []) if s.get("enabled")]
    if only_sources:
        wanted = set(only_sources)
        enabled = [s for s in registry if s.get("code") in wanted]
    else:
        enabled = registry
    if limit > 0:
        enabled = enabled[:limit]
    print(f"=== Official scrapers ({len(enabled)}) ===", flush=True)
    semaphore = asyncio.Semaphore(max(1, concurrency))

    async def run_one(i: int, entry: dict) -> None:
        code = entry.get("code", "?")
        attempts = max(0, retries) + 1
        for attempt in range(1, attempts + 1):
            try:
                async with semaphore:
                    row = await asyncio.wait_for(agent.run_source(code), timeout=source_timeout)
                print(
                    f"[{i}/{len(enabled)}] {code}: saved={row.get('saved', 0)} fetched={row.get('fetched', 0)}",
                    flush=True,
                )
                return
            except Exception as exc:
                if attempt >= attempts:
                    if isinstance(exc, asyncio.TimeoutError):
                        print(f"[{i}/{len(enabled)}] {code}: TIMEOUT after {source_timeout}s", flush=True)
                    else:
                        print(f"[{i}/{len(enabled)}] {code}: FAIL {exc}", flush=True)
                    return
                print(f"[{i}/{len(enabled)}] {code}: retry {attempt}/{retries}", flush=True)

    await asyncio.gather(*(run_one(i, entry) for i, entry in enumerate(enabled, 1)))


def run_official_import() -> None:
    print("\n=== fetch:official + import to DB ===", flush=True)
    subprocess.run([NPM, "run", "fetch:official"], cwd=ROOT, check=False)
    subprocess.run(
        ["node", "scripts/run-python.mjs", "scripts/import-official-json-to-db.py"],
        cwd=ROOT,
        check=False,
    )


def run_scrub() -> None:
    print("\n=== Scrub + export live-jobs.json ===", flush=True)
    subprocess.run([NPM, "run", "data:scrub"], cwd=ROOT, check=False)

def run_enrich() -> None:
    print("\n=== Backfill PDFs + enrich metadata ===", flush=True)
    subprocess.run([NPM, "run", "pdf:backfill"], cwd=ROOT, check=False)
    subprocess.run([NPM, "run", "enrich:jobs"], cwd=ROOT, check=False)


async def audit() -> None:
    print("\n=== Supabase table audit ===", flush=True)
    async with SessionLocal() as session:
        counts = await SupabaseAuditService().table_counts(session)
        for k, v in counts.items():
            print(f"  {k}: {v}", flush=True)


async def main() -> None:
    parser = argparse.ArgumentParser(description="Run full Supabase sync pipeline")
    parser.add_argument("--source-timeout", type=int, default=SOURCE_TIMEOUT_SECONDS, help="Per-source timeout in seconds")
    parser.add_argument("--concurrency", type=int, default=4, help="How many sources to ingest concurrently")
    parser.add_argument("--retries", type=int, default=1, help="Retries per source after failure/timeout")
    parser.add_argument("--limit", type=int, default=0, help="Max enabled sources to run (0 = all)")
    parser.add_argument("--source", action="append", default=[], help="Run only these source codes (repeatable)")
    parser.add_argument(
        "--skip-official-import",
        action="store_true",
        help="Skip fetch:official and JSON import step (faster daily run)",
    )
    parser.add_argument("--skip-enrich", action="store_true", help="Skip pdf:backfill and enrich:jobs step")
    parser.add_argument("--skip-scrub", action="store_true", help="Skip scrub/export step")
    args = parser.parse_args()

    n = await sync_sources()
    print(f"Synced {n} sources to Supabase", flush=True)
    await run_ingest(
        source_timeout=args.source_timeout,
        concurrency=args.concurrency,
        retries=args.retries,
        limit=args.limit,
        only_sources=args.source,
    )
    if args.skip_official_import:
        print("\n=== Skipping fetch:official + import to DB ===", flush=True)
    else:
        run_official_import()
    if args.skip_enrich:
        print("\n=== Skipping backfill + enrich ===", flush=True)
    else:
        run_enrich()
    if args.skip_scrub:
        print("\n=== Skipping scrub + export live-jobs.json ===", flush=True)
    else:
        run_scrub()
    await audit()
    print("\nDone. Use VITE_JOBS_SOURCE=api or supabase on the frontend.", flush=True)


if __name__ == "__main__":
    asyncio.run(main())
