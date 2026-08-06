#!/usr/bin/env python3
"""Run QaReviewAgent — AI employee that verifies vacancy/dates/PDF/state/title."""
from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.agents.qa_review_agent import QaReviewAgent  # noqa: E402


async def main() -> int:
    parser = argparse.ArgumentParser(description="AI QA Review employee")
    parser.add_argument("--limit", type=int, default=0, help="Cap report list size (0 = all)")
    parser.add_argument("--apply", action="store_true", help="Write field patches to DB")
    parser.add_argument(
        "--bucket",
        default="all",
        help="State bucket: all|north|west|south|east|northeast|central|all-india",
    )
    parser.add_argument(
        "--states",
        default="",
        help="Comma-separated state ids (e.g. up,uk,dl)",
    )
    parser.add_argument("--live-only", action="store_true", help="Only review live jobs")
    parser.add_argument("--draft-only", action="store_true", help="Only review draft/pending/expired")
    parser.add_argument("--llm", action="store_true", help="Force enable LLM assist if key present")
    parser.add_argument("--no-llm", action="store_true", help="Disable LLM assist")
    args = parser.parse_args()

    use_llm: bool | None = None
    if args.no_llm:
        use_llm = False
    elif args.llm:
        use_llm = True

    states = [s.strip() for s in args.states.split(",") if s.strip()]
    include_live = not args.draft_only
    include_draft = not args.live_only

    agent = QaReviewAgent(use_llm=use_llm)
    stats = await agent.run(
        limit=args.limit,
        apply=args.apply,
        bucket=args.bucket,
        states=states or None,
        include_live=include_live,
        include_draft=include_draft,
    )

    print("\n── QaReviewAgent summary ──")
    print(f"  Bucket:      {args.bucket}")
    print(f"  Scanned:     {stats.get('scanned', 0)}")
    print(f"  Approved:    {len(stats.get('approved') or [])}")
    print(f"  Needs fix:   {len(stats.get('needs_fix') or [])}")
    print(f"  Rejected:    {len(stats.get('rejected') or [])}")
    print(f"  Rows updated:{stats.get('rowsUpdated', 0)}")
    print(f"  Apply:       {args.apply}")
    print(f"  LLM:         {stats.get('llm')}")
    print(f"  Report:      {stats.get('reportPath')}")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
