#!/usr/bin/env python3
"""CLI for the All Websites discovery agent."""

from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

AGENT_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(AGENT_ROOT))

from agent import AllWebsitesAgent  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Discover and catalog all government job websites across India "
        "(official portals + unofficial aggregators)."
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=AGENT_ROOT / "output",
        help="Output directory (default: all websites/output)",
    )
    parser.add_argument(
        "--probe",
        action="store_true",
        help="HTTP-check each website URL (slower)",
    )
    parser.add_argument(
        "--probe-limit",
        type=int,
        default=None,
        help="Max websites to probe (default: all)",
    )
    parser.add_argument(
        "--probe-concurrency",
        type=int,
        default=8,
        help="Parallel probe requests (default: 8)",
    )
    parser.add_argument("-v", "--verbose", action="store_true", help="Debug logging")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(levelname)s %(message)s",
    )

    agent = AllWebsitesAgent(output_dir=args.output.resolve())
    result = agent.run(
        probe=args.probe,
        probe_limit=args.probe_limit,
        probe_concurrency=args.probe_concurrency,
    )

    summary = result["summary"]
    print()
    print("=== All Websites Agent — complete ===")
    print(f"Total websites:     {summary['totalWebsites']}")
    print(f"  Official:         {summary['officialCount']}")
    print(f"  Unofficial:       {summary['unofficialCount']}")
    print(f"Unique domains:     {summary['uniqueDomains']}")
    if args.probe:
        print(f"Probe OK / failed:  {summary['probeOk']} / {summary['probeFailed']}")
    print()
    print("Output files:")
    for name, path in sorted(result["paths"].items()):
        print(f"  {name}: {path}")


if __name__ == "__main__":
    main()
