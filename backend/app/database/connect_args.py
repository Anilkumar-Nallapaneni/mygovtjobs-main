"""asyncpg connect_args — Supabase pooler SSL that works on GitHub Actions."""

from __future__ import annotations

import os
import ssl
from pathlib import Path

import certifi

# Public Supabase Root 2021 CA. Mozilla's bundle does not include this root,
# so pooler TLS fails closed on Vercel and Windows unless it is trusted here.
_SUPABASE_ROOT_CA = Path(__file__).resolve().parent / "supabase-root-2021.crt"


def asyncpg_connect_args(*, command_timeout: int = 120) -> dict:
    """
    Build SQLAlchemy/asyncpg connect_args for Supabase pooler.

    Verify using system roots, Mozilla's CA bundle, and the public Supabase root.
    DATABASE_SSL_CA_FILE can supply an additional trusted provider CA certificate.
    """
    args: dict = {
        "statement_cache_size": 0,
        "command_timeout": command_timeout,
    }
    ctx = ssl.create_default_context()
    ctx.load_verify_locations(cafile=certifi.where())
    ctx.load_verify_locations(cafile=str(_SUPABASE_ROOT_CA))
    ca_file = os.environ.get("DATABASE_SSL_CA_FILE", "").strip()
    if ca_file:
        try:
            ctx.load_verify_locations(cafile=ca_file)
        except (OSError, ssl.SSLError) as exc:
            raise RuntimeError(
                "DATABASE_SSL_CA_FILE must point to a readable, valid trusted CA PEM file. "
                "Download the provider CA from your database dashboard; TLS verification stays enabled."
            ) from exc
    args["ssl"] = ctx
    return args
