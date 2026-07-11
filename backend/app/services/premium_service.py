"""Premium tier checks — always verify server-side, never trust the frontend."""

from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def is_premium_user(session: AsyncSession, user_id: str) -> bool:
    row = (
        await session.execute(
            text(
                """
                SELECT subscription_tier
                FROM profiles
                WHERE id = :uid
                LIMIT 1
                """
            ),
            {"uid": user_id},
        )
    ).first()
    if not row:
        return False
    tier = str(row[0] or "").strip().lower()
    return tier in ("premium", "pro", "paid")
