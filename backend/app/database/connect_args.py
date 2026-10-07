"""asyncpg connect_args — Supabase pooler SSL that works on GitHub Actions."""

from __future__ import annotations

import os
import ssl

import certifi


def asyncpg_connect_args(*, command_timeout: int = 120) -> dict:
    """
    Build SQLAlchemy/asyncpg connect_args for Supabase pooler.

    Verify using system roots and Mozilla's CA bundle on every deployment host.
    DATABASE_SSL_CA_FILE can supply an additional trusted provider CA certificate.
    """
    args: dict = {
        "statement_cache_size": 0,
        "command_timeout": command_timeout,
    }
    ctx = ssl.create_default_context()
    ctx.load_verify_locations(cafile=certifi.where())
    ca_file = os.environ.get("DATABASE_SSL_CA_FILE", "").strip()
    if ca_file:
        ctx.load_verify_locations(cafile=ca_file)
    args["ssl"] = ctx
    return args
