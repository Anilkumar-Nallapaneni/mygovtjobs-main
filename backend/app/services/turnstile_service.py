"""Cloudflare Turnstile verification.

In development, verification is skipped when TURNSTILE_SECRET_KEY is unset.
In production, missing secret or missing token fails closed (returns False).
"""

from __future__ import annotations

import httpx

from app.config import get_settings


def _is_production() -> bool:
    return get_settings().app_env.strip().lower() == "production"


async def verify_turnstile(token: str | None, *, remote_ip: str | None = None) -> bool:
    secret = get_settings().turnstile_secret_key
    if not secret:
        # Dev convenience only — never allow open forms in production.
        return not _is_production()
    if not token or not token.strip():
        return False

    payload: dict[str, str] = {"secret": secret, "response": token.strip()}
    if remote_ip:
        payload["remoteip"] = remote_ip

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(
                "https://challenges.cloudflare.com/turnstile/v0/siteverify",
                data=payload,
            )
            data = res.json()
            return bool(data.get("success"))
    except Exception:
        return False
