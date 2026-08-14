"""Admin API key verification."""

from __future__ import annotations

import hashlib
import hmac

from fastapi import Header, HTTPException

from app.config import get_settings

_LOCAL_ENVS = frozenset({"development", "dev", "local", "test"})


def _is_local_app_env(app_env: str) -> bool:
    return app_env.strip().lower() in _LOCAL_ENVS


def _key_digest(value: str) -> bytes:
    return hashlib.sha256(value.encode("utf-8")).digest()


async def require_admin_key(x_admin_key: str | None = Header(default=None, alias="X-Admin-Key")) -> None:
    settings = get_settings()
    expected = (settings.admin_api_key or "").strip()

    if not expected:
        # Fail closed unless explicitly local + ALLOW_INSECURE_ADMIN=1.
        # Staging / prod-like hosts must never open admin/ingest without a key.
        if settings.allow_insecure_admin and _is_local_app_env(settings.app_env):
            return
        raise HTTPException(
            status_code=503,
            detail="Admin API disabled: set ADMIN_API_KEY (or ALLOW_INSECURE_ADMIN=1 for local development only).",
        )

    provided = (x_admin_key or "").strip()
    if not provided or not hmac.compare_digest(_key_digest(provided), _key_digest(expected)):
        raise HTTPException(status_code=401, detail="Invalid or missing admin API key")
