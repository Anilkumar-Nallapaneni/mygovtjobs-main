"""Sync scraper registry + official site list into Supabase `sources` table."""

from __future__ import annotations

import json

from sqlalchemy import select, text
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.job import Source
from app.utils.repo_paths import resolve_repo_path

REGISTRY_PATH = resolve_repo_path("scripts", "scraper_registry.json")
BATCH_COMMIT_SIZE = 25


def _module_type(module: str | None) -> str:
    if module in ("rss_feed",):
        return "rss"
    if module in ("state_portal_html",):
        return "html"
    return "html"


class SourceSyncService:
    async def sync_registry(self, session: AsyncSession) -> int:
        # Supabase pooler can cancel long transactions; keep batches short.
        await session.execute(text("SET LOCAL statement_timeout = '120s'"))
        registry = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
        scrapers = registry.get("scrapers") or []
        upserted = 0
        for entry in scrapers:
            code = entry.get("code")
            if not code:
                continue
            row = {
                "code": code,
                "name": entry.get("sourceName") or entry.get("name") or code,
                "type": _module_type(entry.get("module")),
                "feed_url": entry.get("feedUrl"),
                "portal_url": entry.get("portal_url") or entry.get("portalUrl"),
                "state_code": _state_code(entry.get("state")),
                "is_active": bool(entry.get("enabled", False)),
            }
            stmt = (
                insert(Source)
                .values(**row)
                .on_conflict_do_update(
                    index_elements=[Source.code],
                    set_={
                        "name": row["name"],
                        "type": row["type"],
                        "feed_url": row["feed_url"],
                        "portal_url": row["portal_url"],
                        "state_code": row["state_code"],
                        "is_active": row["is_active"],
                    },
                )
            )
            await session.execute(stmt)
            upserted += 1
            if upserted % BATCH_COMMIT_SIZE == 0:
                await session.commit()
        await session.commit()
        return upserted

    async def ensure_source(self, session: AsyncSession, entry: dict) -> str:
        code = entry.get("code")
        if not code:
            raise ValueError("source entry missing code")
        row = {
            "code": code,
            "name": entry.get("sourceName") or entry.get("name") or code,
            "type": _module_type(entry.get("module")),
            "feed_url": entry.get("feedUrl"),
            "portal_url": entry.get("portal_url") or entry.get("portalUrl"),
            "state_code": _state_code(entry.get("state")),
            "is_active": bool(entry.get("enabled", False)),
        }
        stmt = (
            insert(Source)
            .values(**row)
            .on_conflict_do_update(
                index_elements=[Source.code],
                set_={
                    "name": row["name"],
                    "type": row["type"],
                    "feed_url": row["feed_url"],
                    "portal_url": row["portal_url"],
                    "state_code": row["state_code"],
                    "is_active": row["is_active"],
                },
            )
            .returning(Source.id)
        )
        result = await session.execute(stmt)
        await session.flush()
        sid = result.scalar_one()
        return str(sid)


def _state_code(state: str | None) -> str | None:
    if not state:
        return None
    s = str(state).strip().lower()
    if s in ("all", "all india"):
        return None
    return s[:8]
