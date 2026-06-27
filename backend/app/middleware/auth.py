"""Admin API key verification."""

import hmac

from fastapi import Header, HTTPException

from app.config import get_settings


async def require_admin_key(x_admin_key: str | None = Header(default=None, alias="X-Admin-Key")) -> None:
    settings = get_settings()
    expected = settings.admin_api_key

    if not expected:
        if settings.allow_insecure_admin and settings.app_env != "production":
            return
        raise HTTPException(
            status_code=503,
            detail="Admin API disabled: set ADMIN_API_KEY (or ALLOW_INSECURE_ADMIN=1 for local dev only).",
        )

    if not x_admin_key or not hmac.compare_digest(x_admin_key, expected):
        raise HTTPException(status_code=401, detail="Invalid or missing admin API key")
