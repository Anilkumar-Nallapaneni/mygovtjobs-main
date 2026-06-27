"""Strip internal discovery fields and aggregator links before API/JSON export."""

from __future__ import annotations

from typing import Any

from app.utils.official_hosts import is_blocked_aggregator_host

_INTERNAL_DETAIL_KEYS = frozenset(
    {"discovery_ref", "discovered_via", "discovery_source"}
)


def _scrub_section_links(sections: list[Any]) -> tuple[list[Any], bool]:
    changed = False
    cleaned: list[Any] = []
    for section in sections:
        if not isinstance(section, dict):
            cleaned.append(section)
            continue
        sec = dict(section)
        links = sec.get("links")
        if isinstance(links, list):
            kept = []
            for link in links:
                if not isinstance(link, dict):
                    continue
                url = link.get("url")
                if isinstance(url, str) and is_blocked_aggregator_host(url):
                    changed = True
                    continue
                kept.append(link)
            sec["links"] = kept
        cleaned.append(sec)
    return cleaned, changed


def sanitize_job_detail(detail: dict[str, Any] | None) -> dict[str, Any]:
    if not detail:
        return {}
    out = dict(detail)
    for key in _INTERNAL_DETAIL_KEYS:
        out.pop(key, None)

    sections = out.get("content_sections")
    if isinstance(sections, list):
        cleaned, changed = _scrub_section_links(sections)
        if changed:
            out["content_sections"] = cleaned

    for key in ("pdf_urls", "pdfUrls"):
        vals = out.get(key)
        if isinstance(vals, list):
            filtered = [u for u in vals if isinstance(u, str) and not is_blocked_aggregator_host(u)]
            if len(filtered) != len(vals):
                out[key] = filtered

    for key in ("notification_url", "source_url"):
        val = out.get(key)
        if isinstance(val, str) and is_blocked_aggregator_host(val):
            out.pop(key, None)

    return out
