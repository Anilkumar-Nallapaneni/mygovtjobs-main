"""CLI: check health of configured government source portals."""

from __future__ import annotations

import argparse
import asyncio
import json
import sys

from app.services.source_health_agent import SourceHealthAgent


async def main() -> int:
    parser = argparse.ArgumentParser(description="SourceHealthAgent — probe registry portals")
    parser.add_argument("--limit", type=int, default=0, help="Max sources to check (0 = all enabled)")
    parser.add_argument("--timeout", type=float, default=20.0)
    args = parser.parse_args()
    stats = await SourceHealthAgent().run(limit=args.limit, timeout=args.timeout)
    print(json.dumps(stats, indent=2, default=str))
    return 0 if stats.get("broken", 0) == 0 else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
