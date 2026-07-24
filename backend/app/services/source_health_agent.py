"""Probe configured government sources and persist health metrics."""

from __future__ import annotations

import json
import logging
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sqlalchemy.dialects.postgresql import insert

from app.database.session import SessionLocal
from app.models.job import SourceHealth
from app.scrapers.http_client import create_async_client
from app.utils.url_safety import assert_safe_url

logger = logging.getLogger(__name__)


def _registry_path() -> Path:
    here = Path(__file__).resolve()
    for base in (here.parents[2], here.parents[3]):
        candidate = base / "scripts" / "scraper_registry.json"
        if candidate.is_file():
            return candidate
    return here.parents[3] / "scripts" / "scraper_registry.json"


def _classify_http(status: int | None, *, elapsed_ms: int | None = None) -> str:
    if status is None:
        return "BROKEN"
    if status == 403 or status == 429:
        return "BLOCKED"
    if status >= 500:
        return "BROKEN"
    if status >= 400:
        return "DEGRADED"
    if elapsed_ms is not None and elapsed_ms > 15_000:
        return "DEGRADED"
    return "HEALTHY"


class SourceHealthAgent:
    """Check homepage / recruitment URLs for every enabled registry entry."""

    def __init__(self, *, registry_path: Path | None = None):
        self.registry = json.loads((_registry_path() if registry_path is None else registry_path).read_text(encoding="utf-8"))

    async def run(self, *, limit: int = 0, timeout: float = 20.0) -> dict[str, Any]:
        entries = [e for e in self.registry.get("scrapers", []) if e.get("enabled")]
        if limit > 0:
            entries = entries[:limit]

        stats = {"checked": 0, "healthy": 0, "degraded": 0, "broken": 0, "blocked": 0, "errors": 0}
        rows: list[dict[str, Any]] = []

        async with create_async_client(timeout=timeout) as client:
            for entry in entries:
                code = str(entry.get("code") or "unknown")
                homepage = str(entry.get("portal_url") or entry.get("homepage_url") or "")
                recruitment = str(entry.get("recruitment_url") or entry.get("feed_url") or homepage)
                homepage_status = None
                recruitment_status = None
                elapsed_ms = None
                last_error = None
                try:
                    if homepage:
                        assert_safe_url(homepage)
                        t0 = time.perf_counter()
                        res = await client.get(homepage)
                        elapsed_ms = int((time.perf_counter() - t0) * 1000)
                        homepage_status = int(res.status_code)
                    if recruitment and recruitment != homepage:
                        assert_safe_url(recruitment)
                        res2 = await client.get(recruitment)
                        recruitment_status = int(res2.status_code)
                    elif homepage_status is not None:
                        recruitment_status = homepage_status
                except Exception as exc:
                    last_error = str(exc)[:500]
                    stats["errors"] += 1

                health = _classify_http(homepage_status or recruitment_status, elapsed_ms=elapsed_ms)
                if last_error and health == "HEALTHY":
                    health = "BROKEN"
                stats["checked"] += 1
                key = health.lower()
                if key in stats:
                    stats[key] += 1

                rows.append(
                    {
                        "source_code": code,
                        "homepage_url": homepage or "",
                        "recruitment_url": recruitment or None,
                        "last_checked_at": datetime.now(timezone.utc),
                        "homepage_status": homepage_status,
                        "recruitment_status": recruitment_status,
                        "response_time_ms": elapsed_ms,
                        "parser_status": str(entry.get("module") or entry.get("parser_type") or "unknown"),
                        "health_status": health,
                        "last_error": last_error,
                        "updated_at": datetime.now(timezone.utc),
                    }
                )

        if rows:
            try:
                async with SessionLocal() as session:
                    for row in rows:
                        stmt = insert(SourceHealth).values(**row).on_conflict_do_update(
                            index_elements=[SourceHealth.source_code],
                            set_={k: row[k] for k in row if k != "source_code"},
                        )
                        await session.execute(stmt)
                    await session.commit()
            except Exception as exc:
                logger.warning("source_health persist failed: %s", exc)
                stats["persist_error"] = str(exc)

        return stats
