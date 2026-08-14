"""Pure helpers for JobPersistService (slug, dates, snapshot guards)."""

import os
import re
from datetime import date, datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

from app.scrapers.date_utils import parse_published
from app.services.noise_filter import strip_postgres_control_chars

_slug_re = re.compile(r"[^a-z0-9]+")
_PUBLIC_VERIFICATION_STATUSES = ("VERIFIED", "PARTIALLY_VERIFIED")
_SNAPSHOT_DROP_GUARD_MIN_EXISTING = 100
_SNAPSHOT_DROP_GUARD_RATIO = 0.5


def _atomic_write_text(path: Path, content: str) -> None:
    """Write via temp + os.replace so readers never see a truncated snapshot."""
    tmp = path.with_name(f".{path.name}.{os.getpid()}.tmp")
    try:
        tmp.write_text(content, encoding="utf-8")
        os.replace(tmp, path)
    finally:
        if tmp.exists():
            try:
                tmp.unlink()
            except OSError:
                pass


def slugify(
    title: str,
    digest: str,
    *,
    dept: str | None = None,
    published_year: int | str | None = None,
    source_url: str | None = None,
) -> str:
    """Build a stable slug from org + title + year + source identity."""
    parts = [dept or "", title or "job", str(published_year or ""), source_url or ""]
    identity = "-".join(p for p in parts if p)
    base = _slug_re.sub("-", identity.lower()).strip("-")[:80] or "job"
    return f"{base}-{digest[:8]}"


def _resolve_state_codes(normalized: dict) -> list[str]:
    """Nationwide listings use [] in DB; single-state PSC uses e.g. ['ap']."""
    explicit = normalized.get("state_codes")
    if explicit is not None:
        codes = [str(c).lower()[:8] for c in explicit if c and str(c).lower() not in ("all", "all india")]
        return codes
    state_raw = str(normalized.get("state") or "").strip().lower()
    if not state_raw or state_raw in ("all", "all india"):
        source = str((normalized.get("detail") or {}).get("source") or normalized.get("source") or "")
        if source.startswith("psc-"):
            code = source[4:8]
            if code and code not in ("all", "india"):
                return [code]
        return []
    return [state_raw[:8]]


def _parse_date(value) -> date | None:
    if not value:
        return None
    if isinstance(value, date):
        return value
    text = str(value).strip()
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%d.%m.%Y", "%d %b %Y", "%d %B %Y"):
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    return None


def _resolve_published_at(normalized: dict) -> datetime | None:
    """Parse a real publish timestamp from ingest; None when unknown."""
    pub = normalized.get("published_at")
    if pub is None:
        detail = normalized.get("detail") or {}
        pub = detail.get("published")
    return parse_published(pub)


def _upsert_published_at(normalized: dict) -> datetime:
    """Published timestamp stored on insert and conflict update."""
    return _resolve_published_at(normalized) or datetime.now(timezone.utc)


def _resolve_vacancies(normalized: dict) -> int | None:
    raw = normalized.get("vacancies")
    if raw is None or raw == "":
        return None
    try:
        n = int(raw)
    except (TypeError, ValueError):
        return None
    return n if n > 0 else None


def _resolve_source_url(normalized: dict, apply_url: str | None) -> str | None:
    detail = normalized.get("detail") if isinstance(normalized.get("detail"), dict) else {}
    candidates = [
        normalized.get("source_url"),
        detail.get("source_url"),
        apply_url,
        detail.get("notification_url"),
    ]
    for c in candidates:
        if isinstance(c, str) and c.strip():
            return strip_postgres_control_chars(c.strip())
    return None


def _source_domain(url: str | None) -> str | None:
    if not url:
        return None
    try:
        host = (urlparse(url).hostname or "").lower()
        return host or None
    except Exception:
        return None


def _should_preserve_public_gate_on_conflict(*, status: str | None, published_to_site: bool | None) -> bool:
    """Keep admin/publication decisions when a re-scrape would only send a row back to review."""
    return status != "expired" and not bool(published_to_site)


def _is_dramatic_snapshot_drop(existing_count: int | None, next_count: int) -> bool:
    if existing_count is None or existing_count < _SNAPSHOT_DROP_GUARD_MIN_EXISTING:
        return False
    return next_count < int(existing_count * _SNAPSHOT_DROP_GUARD_RATIO)


def _snapshot_looks_like_ungated_feed_dump(payload: dict | None) -> bool:
    """RSS/HTML feed dumps lack publish-gate fields; never block replacing them."""
    if not isinstance(payload, dict):
        return False
    items = payload.get("items")
    if not isinstance(items, list) or not items:
        return False
    sample = items[: min(40, len(items))]
    threshold = max(1, int(len(sample) * 0.5))
    unapproved = sum(1 for row in sample if not isinstance(row, dict) or row.get("published_to_site") is not True)
    no_deadline = sum(
        1
        for row in sample
        if not isinstance(row, dict) or not str(row.get("last_date") or "").strip()
    )
    unverified = sum(
        1
        for row in sample
        if not isinstance(row, dict)
        or str(row.get("verification_status") or "").upper() not in _PUBLIC_VERIFICATION_STATUSES
    )
    wrong_doc = sum(
        1
        for row in sample
        if not isinstance(row, dict) or str(row.get("document_type") or "").upper() != "RECRUITMENT"
    )
    return (
        unapproved >= threshold
        or no_deadline >= threshold
        or unverified >= threshold
        or wrong_doc >= threshold
    )


