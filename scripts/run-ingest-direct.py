#!/usr/bin/env python3
"""Run full India ingest directly (no HTTP timeout). From repo root:
  backend\\.venv\\Scripts\\python scripts\\run-ingest-direct.py
Optional: scripts\\run-ingest-direct.py --limit 15
"""
import argparse
import asyncio
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.agents.ingest_agent import IngestAgent  # noqa: E402


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=0, help="Max sources (0 = all enabled)")
    parser.add_argument("--source", action="append", default=[], help="Source code to run (repeatable)")
    parser.add_argument("--source-timeout", type=int, default=240, help="Seconds before skipping a slow source")
    args = parser.parse_args()

    agent = IngestAgent()
    registry = agent.registry.get("scrapers") or []
    if args.source:
        wanted = set(args.source)
        enabled = [s for s in registry if s.get("enabled") and s.get("code") in wanted]
    else:
        enabled = [s for s in registry if s.get("enabled")]
    if args.limit > 0:
        enabled = enabled[: args.limit]

    print(f"Ingesting {len(enabled)} sources (live jobs only, expired skipped)…\n", flush=True)
    results = []
    for i, entry in enumerate(enabled, 1):
        code = entry.get("code", "?")
        try:
            print(f"[{i}/{len(enabled)}] start {code}", flush=True)
            row = await asyncio.wait_for(agent.run_source(code), timeout=args.source_timeout)
            results.append(row)
            tag = "ok" if row.get("saved", 0) else "—"
            print(
                f"[{i}/{len(enabled)}] {tag} {code}: "
                f"fetched={row.get('fetched', 0)} saved={row.get('saved', 0)} "
                f"rejected={row.get('rejected', 0)} errors={row.get('errors', 0)}"
            )
        except Exception as exc:
            if isinstance(exc, asyncio.TimeoutError):
                print(f"[{i}/{len(enabled)}] TIMEOUT {code}: skipped after {args.source_timeout}s")
            else:
                print(f"[{i}/{len(enabled)}] FAIL {code}: {exc}")
            results.append({"source": code, "saved": 0, "errors": 1})

    saved = sum(r.get("saved", 0) for r in results)
    fetched = sum(r.get("fetched", 0) for r in results)
    print(f"\nDone. fetched={fetched} saved={saved} across {len(results)} sources.", flush=True)
    print("Refresh http://localhost:2222/ to see new live jobs.", flush=True)


if __name__ == "__main__":
    asyncio.run(main())
