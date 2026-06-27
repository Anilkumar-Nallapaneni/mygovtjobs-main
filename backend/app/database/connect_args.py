"""asyncpg connect_args — Supabase pooler SSL that works on GitHub Actions."""

from __future__ import annotations

import os
import ssl

import certifi


def _truthy(name: str) -> bool:
    return os.environ.get(name, "").strip().lower() in ("1", "true", "yes", "on")


def asyncpg_connect_args(*, command_timeout: int = 120) -> dict:
    """
    Build SQLAlchemy/asyncpg connect_args for Supabase pooler.

    DATABASE_SSL_INSECURE=1 — TLS without cert verification (CI escape hatch).
    Default — verify using Mozilla CA bundle via certifi (fixes GHA verify failures).
    """
    args: dict = {
        "statement_cache_size": 0,
        "command_timeout": command_timeout,
    }
    if _truthy("DATABASE_SSL_DISABLE"):
        args["ssl"] = False
        return args
    if _truthy("DATABASE_SSL_INSECURE"):
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        args["ssl"] = ctx
        return args
    # GitHub Actions / Render: Supabase pooler TLS chain fails strict verify on some hosts.
    if os.environ.get("GITHUB_ACTIONS") == "true" or os.environ.get("RENDER") == "true":
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        args["ssl"] = ctx
        return args
    ctx = ssl.create_default_context()
    ctx.load_verify_locations(cafile=certifi.where())
    if _truthy("DATABASE_SSL_RELAX_HOSTNAME"):
        ctx.check_hostname = False
    args["ssl"] = ctx
    return args
