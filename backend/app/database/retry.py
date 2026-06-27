"""Retry helpers for transient Supabase pooler / asyncpg connection drops."""

from __future__ import annotations

from sqlalchemy.exc import DBAPIError, OperationalError

_TRANSIENT_MARKERS = (
    "connection was closed",
    "connectiondoesnotexist",
    "connection reset",
    "server closed the connection",
    "cannot connect",
    "timeout",
)


def is_transient_db_error(exc: BaseException) -> bool:
    if isinstance(exc, (OperationalError, DBAPIError)):
        return True
    orig = getattr(exc, "orig", None)
    if orig is not None and "connection" in type(orig).__name__.lower():
        return True
    msg = str(exc).lower()
    if orig is not None:
        msg = f"{msg} {orig}".lower()
    return any(marker in msg for marker in _TRANSIENT_MARKERS)
