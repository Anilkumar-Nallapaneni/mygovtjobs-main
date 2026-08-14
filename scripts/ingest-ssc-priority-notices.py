#!/usr/bin/env python3
"""Persist priority SSC exam notices (Notice of CGL/Steno/CHT 2026 + apply-window reopen).

Bypasses the full daily ingest PDF hang by enriching at most 2 PDFs per notice with a 60s cap.

  node scripts/run-python.mjs scripts/ingest-ssc-priority-notices.py
"""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.agents.ingest_agent import IngestAgent
from app.database.session import SessionLocal
from app.scrapers.ssc_api import SscApiScraper
from app.services.dedupe_service import content_hash

PRIORITY_HINTS = (
    "notice of combined graduate level examination, 2026",
    "notice of stenographer grade",
    "notice of combined hindi translators examination, 2026",
    "re-opening of window",
    "window for submission of online application",
)


def _wanted(title: str) -> bool:
    t = (title or "").lower()
    return any(h in t for h in PRIORITY_HINTS)


async def main() -> int:
    scraper = SscApiScraper(max_items=80, lookback_days=400)
    rows = await scraper.fetch()
    picked = [r for r in rows if _wanted(str(r.get("title") or ""))]
    print(f"SSC fetch={len(rows)} priority={len(picked)}", flush=True)
    for row in picked:
        print(" -", (row.get("title") or "")[:90], flush=True)

    agent = IngestAgent()
    entry = next(s for s in agent.registry.get("scrapers", []) if s.get("code") == "ssc")
    saved = 0
    async with SessionLocal() as session:
        for raw in picked:
            normalized = await agent._normalize_raw(raw, entry, "ssc")
            if not normalized:
                print("SKIP", (raw.get("title") or "")[:80], flush=True)
                continue
            digest = content_hash(
                title=normalized.get("title", ""),
                apply_url=normalized.get("apply_url"),
                last_date=str(normalized.get("last_date") or ""),
            )
            normalized["content_hash"] = digest
            job = await agent.persist.upsert_normalized(session, normalized, commit=True)
            print(
                "SAVE" if job else "FAIL",
                (normalized.get("title") or "")[:80],
                "last=",
                normalized.get("last_date"),
                "score=",
                normalized.get("completeness_score"),
                flush=True,
            )
            if job:
                saved += 1
    print(f"saved={saved}/{len(picked)}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
