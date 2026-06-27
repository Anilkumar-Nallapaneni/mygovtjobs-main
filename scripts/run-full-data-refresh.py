#!/usr/bin/env python3
"""Full data refresh: Python scrapers (DB + live-jobs.json) → RSS feed snapshot → scrub."""
import asyncio
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.agents.ingest_agent import IngestAgent  # noqa: E402

SOURCE_TIMEOUT_SECONDS = 30
NPM = "npm.cmd" if sys.platform == "win32" else "npm"


async def run_all_scrapers() -> None:
    agent = IngestAgent()
    enabled = [s for s in agent.registry.get("scrapers", []) if s.get("enabled")]
    print(f"=== 1/3 Official scrapers ({len(enabled)} sources) ===", flush=True)
    for i, entry in enumerate(enabled, 1):
        code = entry.get("code", "?")
        try:
            row = await asyncio.wait_for(agent.run_source(code), timeout=SOURCE_TIMEOUT_SECONDS)
            print(
                f"[{i}/{len(enabled)}] {code}: saved={row.get('saved', 0)} "
                f"fetched={row.get('fetched', 0)}",
                flush=True,
            )
        except Exception as exc:
            if isinstance(exc, asyncio.TimeoutError):
                print(f"[{i}/{len(enabled)}] {code}: TIMEOUT after {SOURCE_TIMEOUT_SECONDS}s", flush=True)
            else:
                print(f"[{i}/{len(enabled)}] {code}: FAIL {exc}", flush=True)


def run_node_official() -> None:
    print("\n=== 2/3 RSS/portal feed snapshot (feed-only, no live-jobs overwrite) ===", flush=True)
    subprocess.run(
        [NPM, "run", "fetch:official", "--", "--feed-only"],
        cwd=ROOT,
        check=False,
    )


def run_scrub() -> None:
    print("\n=== 3/3 Scrub aggregator links + export live-jobs.json ===", flush=True)
    subprocess.run([NPM, "run", "data:scrub"], cwd=ROOT, check=False)


async def main() -> None:
    await run_all_scrapers()
    run_node_official()
    run_scrub()
    print("\nDone. Restart frontend and hard-refresh the browser.", flush=True)


if __name__ == "__main__":
    asyncio.run(main())
