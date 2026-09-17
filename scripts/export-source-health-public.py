#!/usr/bin/env python3
"""Export a public-safe source_health snapshot (no last_error)."""
from __future__ import annotations

import asyncio
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from sqlalchemy import select

from app.database.session import SessionLocal
from app.models.job import SourceHealth

OUT = ROOT / "frontend" / "public" / "data" / "source-health.json"


async def main() -> int:
    async with SessionLocal() as session:
        rows = (await session.execute(select(SourceHealth).order_by(SourceHealth.source_code))).scalars().all()

    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "items": [
            {
                "sourceCode": r.source_code,
                "homepageUrl": r.homepage_url or "",
                "recruitmentUrl": r.recruitment_url,
                "healthStatus": r.health_status,
                "lastCheckedAt": r.last_checked_at.isoformat() if r.last_checked_at else None,
                "acceptedCount": int(r.accepted_count or 0),
                "discoveredCount": int(r.discovered_count or 0),
            }
            for r in rows
        ],
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUT} — {len(payload['items'])} sources")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
