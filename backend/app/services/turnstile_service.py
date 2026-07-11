"""Cloudflare Turnstile verification — optional when TURNSTILE_SECRET_KEY is unset."""

from __future__ import annotations

import httpx

from app.config import get_settings


async def verify_turnstile(token: str | None, *, remote_ip: str | None = None) -> bool:
    secret = get_settings().turnstile_secret_key
    if not secret:
        return True
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
