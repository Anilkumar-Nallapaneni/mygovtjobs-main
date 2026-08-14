#!/usr/bin/env python3
"""Export recruitments + recruitment_events to the static CDN snapshot.

Hubs (/latest-results, /admit-cards, /answer-keys) read this file when
VITE_SUPABASE_* is unset — same pattern as live-jobs.json.

  node scripts/run-python.mjs scripts/export-recruitment-events.py
"""
from __future__ import annotations

import json
import sys
from collections import defaultdict
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from sqlalchemy import text  # noqa: E402

from app.database.session import SessionLocal  # noqa: E402

OUT = ROOT / "frontend" / "public" / "data" / "recruitment-events.json"

HUB_TYPES = ("result", "admit_card", "answer_key", "exam_date")


def _iso_date(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    text_val = str(value).strip()
    return text_val[:10] if text_val else None


def _str(value: Any) -> str | None:
    if value is None:
        return None
    text_val = str(value).strip()
    return text_val or None


async def export_snapshot() -> dict[str, Any]:
    async with SessionLocal() as session:
        rows = (
            await session.execute(
                text(
                    """
                    SELECT
                      e.id,
                      e.recruitment_id,
                      e.event_type,
                      e.event_date,
                      e.title,
                      e.official_url,
                      e.document_url,
                      e.status,
                      r.canonical_slug,
                      r.organization,
                      r.title AS rec_title,
                      r.state_codes,
                      r.status AS rec_status,
                      r.primary_job_id,
                      r.official_url AS rec_official_url
                    FROM public.recruitment_events e
                    JOIN public.recruitments r ON r.id = e.recruitment_id
                    WHERE r.status IN ('active', 'completed')
                      AND e.event_type IN ('result', 'admit_card', 'answer_key', 'exam_date')
                    ORDER BY e.event_date DESC NULLS LAST, e.created_at DESC
                    """
                )
            )
        ).mappings().all()

    grouped: dict[str, dict[str, Any]] = {}
    for row in rows:
        rec_id = str(row["recruitment_id"])
        event_type = str(row["event_type"] or "")
        key = f"{event_type}:{rec_id}"
        bucket = grouped.get(key)
        if not bucket:
            states = row["state_codes"] or []
            if not isinstance(states, list):
                states = list(states)
            bucket = {
                "id": rec_id,
                "canonical_slug": str(row["canonical_slug"] or ""),
                "organization": str(row["organization"] or ""),
                "title": str(row["rec_title"] or ""),
                "state_codes": [str(s) for s in states if s],
                "status": str(row["rec_status"] or "active"),
                "primary_job_id": _str(row["primary_job_id"]),
                "official_url": _str(row["rec_official_url"]),
                "events": [],
            }
            grouped[key] = bucket
        bucket["events"].append(
            {
                "id": str(row["id"]),
                "recruitment_id": rec_id,
                "event_type": event_type,
                "event_date": _iso_date(row["event_date"]),
                "title": _str(row["title"]),
                "official_url": _str(row["official_url"]),
                "document_url": _str(row["document_url"]),
                "status": str(row["status"] or "announced"),
            }
        )

    by_type: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for key, rec in grouped.items():
        event_type = key.split(":", 1)[0]
        by_type[event_type].append(rec)

    counts = {t: len(by_type.get(t, [])) for t in HUB_TYPES}
    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "counts": counts,
        "byType": {t: by_type.get(t, []) for t in HUB_TYPES},
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    tmp = OUT.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tmp.replace(OUT)
    return counts


async def main() -> int:
    counts = await export_snapshot()
    print(
        f"Exported recruitment-events.json — "
        + ", ".join(f"{k}={v}" for k, v in counts.items()),
        flush=True,
    )
    return 0


if __name__ == "__main__":
    import asyncio

    raise SystemExit(asyncio.run(main()))
