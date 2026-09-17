#!/usr/bin/env python3
"""Fill empty live-jobs.json state_codes from dept/title/URL hints. Does not lower the gate."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.utils.state_resolve import resolve_state_codes  # noqa: E402

LIVE = ROOT / "frontend" / "public" / "data" / "live-jobs.json"


def _codes_for(row: dict) -> list[str]:
    detail = row.get("detail") if isinstance(row.get("detail"), dict) else {}
    return resolve_state_codes(
        state_codes=row.get("state_codes"),
        title=str(row.get("title") or ""),
        dept=str(row.get("dept") or ""),
        source=str(detail.get("source") or row.get("source") or ""),
        apply_url=str(row.get("apply_url") or ""),
        source_url=str(row.get("source_url") or detail.get("source_url") or ""),
        primary_pdf_url=str(row.get("primary_pdf_url") or row.get("pdf_url") or ""),
        notification_url=str(detail.get("notification_url") or ""),
    )


def _fill(row: dict) -> bool:
    if row.get("state_codes"):
        return False
    codes = _codes_for(row)
    if not codes:
        return False
    row["state_codes"] = codes
    return True


def _rewrite(path: Path) -> int:
    if not path.exists():
        return 0
    payload = json.loads(path.read_text(encoding="utf-8"))
    items = payload.get("items")
    if not isinstance(items, list):
        return 0
    updated = sum(1 for row in items if isinstance(row, dict) and _fill(row))
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return updated


def main() -> None:
    updated = _rewrite(LIVE)
    print(f"backfilled state_codes on {updated} live-jobs.json rows")
    try:
        import asyncio

        from sqlalchemy import select

        from app.database.session import SessionLocal
        from app.models.job import Job

        async def _db() -> int:
            n = 0
            async with SessionLocal() as session:
                rows = (await session.execute(select(Job).where(Job.status == "live"))).scalars().all()
                for job in rows:
                    if job.state_codes:
                        continue
                    detail = job.detail if isinstance(job.detail, dict) else {}
                    codes = resolve_state_codes(
                        state_codes=job.state_codes,
                        title=str(job.title or ""),
                        dept=str(job.dept or ""),
                        source=str(detail.get("source") or ""),
                        apply_url=str(job.apply_url or ""),
                        source_url=str(job.source_url or detail.get("source_url") or ""),
                        primary_pdf_url=str(job.primary_pdf_url or ""),
                        notification_url=str(detail.get("notification_url") or ""),
                    )
                    if not codes:
                        continue
                    job.state_codes = codes
                    n += 1
                if n:
                    await session.commit()
            return n

        db_updated = asyncio.run(_db())
        print(f"backfilled state_codes on {db_updated} live database rows")
    except Exception as exc:
        print(f"database backfill skipped: {exc}")


if __name__ == "__main__":
    main()
