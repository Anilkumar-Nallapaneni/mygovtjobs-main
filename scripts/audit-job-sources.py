#!/usr/bin/env python3
"""Break down jobs in DB by source (official vs FreeJobAlert catalog)."""
from __future__ import annotations

import asyncio
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from sqlalchemy import text  # noqa: E402

from app.database.session import SessionLocal  # noqa: E402


async def main() -> None:
    async with SessionLocal() as session:
        rows = (
            await session.execute(
                text(
                    """
                    SELECT status,
                           COALESCE(detail->>'source', 'unknown') AS source,
                           COUNT(*)::int AS n
                    FROM jobs
                    GROUP BY status, source
                    ORDER BY n DESC
                    """
                )
            )
        ).all()

        print("=== Jobs by status + detail.source ===")
        for row in rows:
            print(f"  {row.status:8} {row.source:32} {row.n}")

        totals = (
            await session.execute(
                text(
                    """
                    SELECT
                      COUNT(*)::int AS total,
                      COUNT(*) FILTER (WHERE status = 'live')::int AS live,
                      COUNT(*) FILTER (WHERE detail->>'source' = 'structured-import')::int AS fja_total,
                      COUNT(*) FILTER (WHERE status = 'live' AND detail->>'source' = 'structured-import')::int AS fja_live,
                      COUNT(*) FILTER (
                        WHERE status = 'live'
                          AND COALESCE(detail->>'source', '') <> 'structured-import'
                      )::int AS official_live,
                      COUNT(*) FILTER (
                        WHERE apply_url ILIKE '%freejobalert%'
                           OR detail::text ILIKE '%freejobalert%'
                      )::int AS fja_url_leaks
                    FROM jobs
                    """
                )
            )
        ).one()

        print()
        print(f"Total jobs in DB:        {totals.total}")
        print(f"Live jobs:               {totals.live}")
        print(f"FreeJobAlert catalog:    {totals.fja_total} (live: {totals.fja_live})")
        print(f"Official scrapers live:  {totals.official_live}")
        print(f"FJA URL leaks in DB:     {totals.fja_url_leaks}")

        print()
        print("=== Live jobs by origin + category ===")
        by_cat = (
            await session.execute(
                text(
                    """
                    SELECT
                      CASE
                        WHEN detail->>'source' = 'structured-import' THEN 'freejobalert'
                        ELSE 'official'
                      END AS origin,
                      COALESCE(category, 'unknown') AS category,
                      COUNT(*)::int AS n
                    FROM jobs
                    WHERE status = 'live'
                    GROUP BY origin, category
                    ORDER BY origin, n DESC
                    """
                )
            )
        ).all()
        for row in by_cat:
            print(f"  {row.origin:12} {row.category:12} {row.n}")

        print()
        print("=== Live FreeJobAlert jobs by state ===")
        fja_states = (
            await session.execute(
                text(
                    """
                    SELECT COALESCE(NULLIF(array_to_string(state_codes, ','), ''), 'central') AS states,
                           COUNT(*)::int AS n
                    FROM jobs
                    WHERE status = 'live' AND detail->>'source' = 'structured-import'
                    GROUP BY states
                    ORDER BY n DESC
                    LIMIT 15
                    """
                )
            )
        ).all()
        for row in fja_states:
            print(f"  {row.states:20} {row.n}")

        print()
        print("=== Live official jobs by scraper (top 15) ===")
        official_src = (
            await session.execute(
                text(
                    """
                    SELECT COALESCE(detail->>'source', 'unknown') AS scraper,
                           COUNT(*)::int AS n
                    FROM jobs
                    WHERE status = 'live' AND COALESCE(detail->>'source', '') <> 'structured-import'
                    GROUP BY scraper
                    ORDER BY n DESC
                    LIMIT 15
                    """
                )
            )
        ).all()
        for row in official_src:
            print(f"  {row.scraper:24} {row.n}")

        sources_n = (
            await session.execute(text("SELECT COUNT(*)::int FROM sources"))
        ).scalar()
        print(f"Registered sources:      {sources_n}")


if __name__ == "__main__":
    asyncio.run(main())
