"""Cloudflare Turnstile verification.

Missing secret fails open only in local development/test.
Staging and production fail closed when the secret is unset.
"""

from __future__ import annotations

import httpx

from app.config import get_settings

_LOCAL_ENVS = frozenset({"development", "dev", "local", "test"})


def _is_local_app_env() -> bool:
    return get_settings().app_env.strip().lower() in _LOCAL_ENVS


async def verify_turnstile(token: str | None, *, remote_ip: str | None = None) -> bool:
    secret = get_settings().turnstile_secret_key
    if not secret:
        # Dev convenience only — never allow open forms outside local envs.
        return _is_local_app_env()
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
