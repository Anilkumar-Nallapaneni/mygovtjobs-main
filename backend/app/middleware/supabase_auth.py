"""Verify Supabase access tokens for user-facing billing routes."""

from __future__ import annotations

import httpx
from fastapi import Depends, HTTPException, Request

from app.config import get_settings


async def get_current_user_id(request: Request) -> str:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = auth[7:].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing bearer token")

    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(status_code=503, detail="Auth not configured")

    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            res = await client.get(
                f"{settings.supabase_url.rstrip('/')}/auth/v1/user",
                headers={
                    "Authorization": f"Bearer {token}",
                    "apikey": settings.supabase_service_role_key,
                },
            )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=503, detail="Auth service unavailable") from exc

    if res.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    user_id = res.json().get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid session")
    return str(user_id)


async def get_optional_current_user_id(request: Request) -> str | None:
    """Resolve an authenticated owner when supplied; allow a truly anonymous request."""
    if not request.headers.get("Authorization", "").strip():
        return None
    return await get_current_user_id(request)


CurrentUserId = Depends(get_current_user_id)
