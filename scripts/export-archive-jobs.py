#!/usr/bin/env python3
"""Export approved expired jobs for jobs-archive.xml.

The live snapshot is live-only (publish gate). Archive URLs need a separate
gated export so the sitemap generator can fill jobs-archive.xml without a
Supabase REST call.

  node scripts/run-python.mjs scripts/export-archive-jobs.py
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from sqlalchemy import text  # noqa: E402

from app.database.session import SessionLocal  # noqa: E402

OUT = ROOT / "frontend" / "public" / "data" / "jobs-archive.json"

EMPTY_NOTE = (
    "No approved expired jobs in the current catalog. The live snapshot is "
    "live-only; archive URLs appear after daily export once gated rows expire."
)


def _iso(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    text_val = str(value).strip()
    return text_val or None


async def export_archive() -> dict[str, Any]:
    async with SessionLocal() as session:
        rows = (
            await session.execute(
                text(
                    """
                    SELECT
                      slug,
                      title,
                      dept,
                      last_date,
                      updated_at,
                      published_at,
                      status,
                      published_to_site,
                      document_type,
                      verification_status,
                      completeness_score,
                      publication_confidence
                    FROM public.jobs
                    WHERE status = 'expired'
                      AND published_to_site = true
                      AND document_type = 'RECRUITMENT'
                      AND verification_status IN ('VERIFIED', 'PARTIALLY_VERIFIED')
                      AND completeness_score >= 70
                      AND publication_confidence >= 90
                    ORDER BY last_date DESC NULLS LAST, updated_at DESC NULLS LAST
                    """
                )
            )
        ).mappings().all()

    items = []
    for row in rows:
        slug = str(row["slug"] or "").strip()
        if not slug:
            continue
        last = row["last_date"]
        items.append(
            {
                "slug": slug,
                "title": str(row["title"] or ""),
                "dept": str(row["dept"] or ""),
                "last_date": last.isoformat() if hasattr(last, "isoformat") else _iso(last),
                "updated_at": _iso(row["updated_at"]),
                "published_at": _iso(row["published_at"]),
                "status": "expired",
                "published_to_site": True,
                "document_type": "RECRUITMENT",
                "verification_status": str(row["verification_status"] or ""),
                "completeness_score": int(row["completeness_score"] or 0),
                "publication_confidence": int(row["publication_confidence"] or 0),
            }
        )

    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "count": len(items),
        "items": items,
        "note": None if items else EMPTY_NOTE,
    }


def write_empty(reason: str) -> None:
    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "count": 0,
        "items": [],
        "note": reason,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote empty {OUT} — {reason}", flush=True)


async def main() -> int:
    try:
        payload = await export_archive()
    except Exception as exc:
        write_empty(f"{EMPTY_NOTE} Export skipped: {type(exc).__name__}: {exc}")
        return 0

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUT} — {payload['count']} approved expired jobs", flush=True)
    return 0


if __name__ == "__main__":
    import asyncio

    raise SystemExit(asyncio.run(main()))
