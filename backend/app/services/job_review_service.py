"""Private quarantine persistence for records that cannot be published."""

from __future__ import annotations

import hashlib
import json
from typing import Any

from sqlalchemy import func
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.job import JobReviewQueue
from app.services.publish_gate import ValidationResult


def _json_safe(value: Any) -> Any:
    return json.loads(json.dumps(value, ensure_ascii=False, default=str))


def review_fingerprint(payload: dict[str, Any]) -> str:
    identity = json.dumps(_json_safe(payload), ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(identity.encode("utf-8")).hexdigest()


class JobReviewService:
    async def enqueue(
        self,
        session: AsyncSession,
        *,
        raw_payload: dict[str, Any],
        normalized_payload: dict[str, Any] | None,
        validation: ValidationResult,
        source_url: str | None = None,
        fingerprint: str | None = None,
    ) -> None:
        row = {
            "fingerprint": fingerprint or review_fingerprint(raw_payload),
            "source_url": source_url,
            "raw_payload": _json_safe(raw_payload),
            "normalized_payload": _json_safe(normalized_payload) if normalized_payload is not None else None,
            "validation_errors": list(validation.errors),
            "validation_warnings": list(validation.warnings),
            "confidence": validation.confidence,
            "status": "pending",
        }
        stmt = (
            insert(JobReviewQueue)
            .values(**row)
            .on_conflict_do_update(
                index_elements=[JobReviewQueue.fingerprint],
                set_={
                    "source_url": row["source_url"],
                    "raw_payload": row["raw_payload"],
                    "normalized_payload": row["normalized_payload"],
                    "validation_errors": row["validation_errors"],
                    "validation_warnings": row["validation_warnings"],
                    "confidence": row["confidence"],
                    "status": "pending",
                    "updated_at": func.now(),
                },
            )
        )
        await session.execute(stmt)
