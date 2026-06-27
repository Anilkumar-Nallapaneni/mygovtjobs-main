#!/usr/bin/env python3
"""Count jobs with PDF links — FreeJobAlert vs official."""
from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from sqlalchemy import text  # noqa: E402

from app.database.session import SessionLocal  # noqa: E402


def _has_pdf(detail: dict | None, apply_url: str | None) -> bool:
    if not detail:
        detail = {}
    for key in ("pdf_url", "pdfUrl"):
        v = detail.get(key)
        if v and str(v).strip():
            return True
    for key in ("pdf_urls", "pdfUrls"):
        lst = detail.get(key)
        if isinstance(lst, list) and any(str(u).strip() for u in lst):
            return True
    if apply_url and ".pdf" in str(apply_url).lower():
        return True
    sections = detail.get("content_sections") or []
    for sec in sections:
        for link in sec.get("links") or []:
            url = str(link.get("url") or "")
            if ".pdf" in url.lower():
                return True
    return False


async def main() -> None:
    async with SessionLocal() as session:
        rows = (
            await session.execute(
                text(
                    """
                    SELECT status,
                           COALESCE(detail->>'source', 'unknown') AS source,
                           apply_url,
                           detail
                    FROM jobs
                    """
                )
            )
        ).all()

    def origin(src: str) -> str:
        return "freejobalert" if src == "structured-import" else "official"

    stats: dict[str, dict[str, int]] = {}
    for row in rows:
        status = row.status or "unknown"
        orig = origin(row.source or "unknown")
        detail = row.detail if isinstance(row.detail, dict) else {}
        has = _has_pdf(detail, row.apply_url)
        bucket = stats.setdefault(orig, {"total": 0, "live": 0, "with_pdf": 0, "live_with_pdf": 0})
        bucket["total"] += 1
        if status == "live":
            bucket["live"] += 1
        if has:
            bucket["with_pdf"] += 1
            if status == "live":
                bucket["live_with_pdf"] += 1

    print("=== PDF availability in database ===")
    for orig, b in stats.items():
        live_pct = (100 * b["live_with_pdf"] / b["live"]) if b["live"] else 0
        print(
            f"{orig:12} live={b['live']:4}  with_pdf_live={b['live_with_pdf']:4}  ({live_pct:.0f}% of live)"
        )

    json_path = ROOT / "frontend" / "public" / "data" / "live-jobs.json"
    if json_path.is_file():
        payload = json.loads(json_path.read_text(encoding="utf-8"))
        items = payload.get("items") or []
        slim_pdf = 0
        slim_sections = 0
        for item in items:
            if item.get("status") == "expired":
                continue
            d = item.get("detail") or {}
            if _has_pdf(d, item.get("apply_url")):
                slim_pdf += 1
            if isinstance(d.get("content_sections"), list) and d["content_sections"]:
                slim_sections += 1
        live_n = sum(1 for i in items if i.get("status") != "expired")
        print()
        print(f"live-jobs.json: {live_n} live rows")
        print(f"  with pdf_url/pdf_urls in slim export: {slim_pdf}")
        print(f"  with content_sections in slim export: {slim_sections}")


if __name__ == "__main__":
    asyncio.run(main())
