"""Persist raw scrape payloads to Supabase `raw_ingest` for audit and reprocessing."""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone

from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.job import RawIngest


def external_id_for_raw(raw: dict) -> str:
    key = raw.get("link") or raw.get("applyUrl") or raw.get("title") or json.dumps(raw, sort_keys=True, default=str)
    return hashlib.sha256(str(key).encode("utf-8")).hexdigest()[:32]


class RawIngestService:
    async def upsert_raw(
        self,
        session: AsyncSession,
        *,
        source_id: str,
        raw: dict,
    ) -> None:
        stmt = (
            insert(RawIngest)
            .values(
                source_id=source_id,
                external_id=external_id_for_raw(raw),
                raw_json=raw,
                fetched_at=datetime.now(timezone.utc),
            )
            .on_conflict_do_update(
                index_elements=[RawIngest.source_id, RawIngest.external_id],
                set_={"raw_json": raw, "fetched_at": datetime.now(timezone.utc)},
            )
        )
        await session.execute(stmt)
