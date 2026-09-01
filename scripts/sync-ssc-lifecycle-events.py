#!/usr/bin/env python3
"""Merge SSC result/admit/answer-key notices into official-feed-items.json.

Does not write jobs (those stay gated). Dry-run by default; pass --apply to update the CDN feed.

  node scripts/run-python.mjs scripts/sync-ssc-lifecycle-events.py
  node scripts/run-python.mjs scripts/sync-ssc-lifecycle-events.py --apply
"""
from __future__ import annotations

import argparse
import asyncio
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.scrapers.ssc_api import SscEventsScraper  # noqa: E402
from app.scrapers.portal_listings import BsfPortalScraper, RrbCenScraper, classify_lifecycle_row  # noqa: E402

FEED_PATH = ROOT / "frontend" / "public" / "data" / "official-feed-items.json"


def _feed_item(row: dict, source_id: str) -> dict:
    return {
        "id": f"{source_id}-{abs(hash(row.get('link') or row.get('title'))) % 10**10}",
        "title": row.get("title"),
        "link": row.get("link") or row.get("applyUrl"),
        "publishedAt": row.get("published") or row.get("publishedAt"),
        "summary": row.get("summary") or None,
        "pdfUrls": row.get("pdfUrls") or [],
        "sourceId": source_id,
        "sourceName": row.get("sourceName") or source_id,
        "dept": row.get("dept") or row.get("sourceName"),
        "state": "All India",
        "category": row.get("category"),
        "fetchMethod": "official-api",
    }


async def collect() -> list[dict]:
    rows: list[dict] = []
    ssc = await SscEventsScraper(max_items=80).fetch()
    for row in ssc:
        if classify_lifecycle_row(str(row.get("title") or ""), str(row.get("link") or "")):
            rows.append(_feed_item(row, "ssc"))
    try:
        bsf = await BsfPortalScraper().fetch_events()
        for row in bsf:
            rows.append(_feed_item(row, "bsf"))
    except Exception as exc:
        print(f"warn: BSF events skipped: {exc}", flush=True)
    try:
        rrb = await RrbCenScraper(
            "https://www.rrbbbs.gov.in/notifications.php",
            source_code="rrb-bbs",
        ).fetch_events()
        for row in rrb:
            rows.append(_feed_item(row, "rrb-bbs"))
    except Exception as exc:
        print(f"warn: RRB events skipped: {exc}", flush=True)
    return rows


def merge(existing: list, incoming: list) -> list:
    seen = {(str(item.get("link") or "").lower(), str(item.get("title") or "").lower()) for item in existing}
    out = list(existing)
    added = 0
    for item in incoming:
        key = (str(item.get("link") or "").lower(), str(item.get("title") or "").lower())
        if not key[0] or key in seen:
            continue
        seen.add(key)
        out.append(item)
        added += 1
    print(f"merge added={added} incoming={len(incoming)} total={len(out)}", flush=True)
    return out


async def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    incoming = await collect()
    print(
        json.dumps(
            {
                "incoming": len(incoming),
                "sample": [r.get("title") for r in incoming[:5]],
                "apply": args.apply,
            },
            ensure_ascii=False,
            indent=2,
        ),
        flush=True,
    )
    if not args.apply:
        print("Dry-run only. Re-run with --apply to update official-feed-items.json.", flush=True)
        return 0

    payload: dict = {"generatedAt": datetime.now(timezone.utc).isoformat(), "items": []}
    if FEED_PATH.exists():
        try:
            payload = json.loads(FEED_PATH.read_text(encoding="utf-8"))
        except Exception:
            pass
    items = payload.get("items") if isinstance(payload, dict) else []
    if not isinstance(items, list):
        items = []
    payload["items"] = merge(items, incoming)
    payload["generatedAt"] = datetime.now(timezone.utc).isoformat()
    payload["count"] = len(payload["items"])
    FEED_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {FEED_PATH}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
