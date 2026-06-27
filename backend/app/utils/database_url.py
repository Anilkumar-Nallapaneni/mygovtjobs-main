"""DATABASE_URL validation and safe error messages for health checks."""

from __future__ import annotations

import re
from urllib.parse import urlparse


def supabase_project_ref(supabase_url: str | None) -> str | None:
    if not supabase_url:
        return None
    host = supabase_url.replace("https://", "").replace("http://", "").split("/")[0]
    ref = host.split(".")[0].strip()
    return ref or None


def database_url_issues(url: str, *, supabase_url: str | None = None) -> list[str]:
    """Return human-readable config problems (no secrets)."""
    issues: list[str] = []
    if not url or url.startswith("postgresql+asyncpg://postgres:postgres@localhost"):
        issues.append("DATABASE_URL is missing or still the localhost default")
    if not url.startswith("postgresql+asyncpg://"):
        issues.append("Must start with postgresql+asyncpg:// (not postgresql://)")
    if "pooler.supabase.com" not in url:
        issues.append("Use Supabase transaction pooler host (*.pooler.supabase.com)")
    if ":6543" not in url:
        issues.append("Use transaction pooler port 6543")
    if re.search(r":5432", url):
        issues.append("Port 5432 is direct DB — use pooler port 6543")

    ref = supabase_project_ref(supabase_url)
    if ref:
        expected_user = f"postgres.{ref}"
        try:
            user = urlparse(url.replace("postgresql+asyncpg", "postgresql", 1)).username or ""
        except Exception:
            user = ""
        if user and user != expected_user:
            issues.append(f"Username should be {expected_user} (check for typos)")

    return issues


def sanitize_db_error(exc: Exception) -> str:
    msg = str(exc).split("\n")[0].strip()
    msg = re.sub(r"://([^:@/]+):([^@/]+)@", r"://\1:***@", msg)
    return msg[:240]
