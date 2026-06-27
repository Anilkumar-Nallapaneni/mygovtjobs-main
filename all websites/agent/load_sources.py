"""Load official and unofficial website catalogs from the monorepo."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from .state_map import STATE_NAMES

ROOT = Path(__file__).resolve().parents[2]
AGENT_ROOT = Path(__file__).resolve().parents[1]


def _host(url: str) -> str:
    try:
        return (urlparse(url).hostname or "").lower()
    except Exception:
        return ""


def _base_url(url: str) -> str:
    host = _host(url)
    if not host:
        return ""
    scheme = urlparse(url).scheme or "https"
    return f"{scheme}://{host}/"


def load_official_sites() -> list[dict[str, Any]]:
    """Parse frontend/src/data/officialSites.ts into structured records."""
    path = ROOT / "frontend" / "src" / "data" / "officialSites.ts"
    if not path.exists():
        return []

    text = path.read_text(encoding="utf-8")
    sites: list[dict[str, Any]] = []

    blocks = re.split(r"\n\s*\{", text)
    for block in blocks:
        id_m = re.search(r'id:\s*"([^"]+)"', block)
        name_m = re.search(r'name:\s*"([^"]+)"', block)
        url_m = re.search(r'url:\s*"([^"]+)"', block)
        latest_m = re.search(r'latestUrl:\s*"([^"]+)"', block)
        scope_m = re.search(r'scope:\s*"([^"]+)"', block)
        cat_m = re.search(r'category:\s*"([^"]+)"', block)
        states_m = re.search(r'stateIds:\s*\[([^\]]+)\]', block)
        notes_m = re.search(r'notes:\s*"([^"]*)"', block)

        if not id_m or not name_m:
            continue

        state_ids: list[str] = ["all"]
        if states_m:
            state_ids = [s.strip().strip('"') for s in states_m.group(1).split(",") if s.strip()]

        url = url_m.group(1) if url_m else ""
        latest = latest_m.group(1) if latest_m else url

        sites.append(
            {
                "id": id_m.group(1),
                "name": name_m.group(1),
                "url": url,
                "latestUrl": latest,
                "domain": _host(url) or _host(latest),
                "baseUrl": _base_url(latest or url),
                "type": "official",
                "scope": scope_m.group(1) if scope_m else "central",
                "category": cat_m.group(1) if cat_m else "general",
                "stateIds": state_ids,
                "stateNames": [STATE_NAMES.get(s, s) for s in state_ids],
                "notes": notes_m.group(1) if notes_m else "",
                "source": "officialSites.ts",
            }
        )

    return sites


def load_scraper_registry() -> list[dict[str, Any]]:
    """Enabled scrapers from scripts/scraper_registry.json."""
    path = ROOT / "scripts" / "scraper_registry.json"
    if not path.exists():
        return []

    registry = json.loads(path.read_text(encoding="utf-8"))
    out: list[dict[str, Any]] = []
    for entry in registry.get("scrapers", []):
        if not entry.get("enabled"):
            continue
        portal = entry.get("portal_url") or ""
        out.append(
            {
                "id": entry.get("code", ""),
                "name": entry.get("code", ""),
                "url": portal,
                "latestUrl": portal,
                "domain": _host(portal),
                "baseUrl": _base_url(portal),
                "type": "official",
                "scope": "scraper",
                "category": entry.get("category") or "general",
                "stateIds": [entry.get("state") or "all"],
                "module": entry.get("module"),
                "feedId": entry.get("feed_id"),
                "source": "scraper_registry.json",
            }
        )
    return out


def load_rss_feeds() -> list[dict[str, Any]]:
    """RSS/Atom feeds from scripts/official-sources.json."""
    path = ROOT / "scripts" / "official-sources.json"
    if not path.exists():
        return []

    payload = json.loads(path.read_text(encoding="utf-8"))
    out: list[dict[str, Any]] = []
    for feed in payload.get("feeds", []):
        feed_url = feed.get("feedUrl")
        if not feed_url:
            continue
        out.append(
            {
                "id": feed.get("id", ""),
                "name": feed.get("name", ""),
                "url": feed_url,
                "latestUrl": feed_url,
                "domain": _host(feed_url),
                "baseUrl": _base_url(feed_url),
                "type": "official",
                "scope": "rss",
                "category": feed.get("category") or "general",
                "stateIds": ["all"],
                "dept": feed.get("dept"),
                "source": "official-sources.json",
            }
        )
    return out


def load_unofficial_portals() -> list[dict[str, Any]]:
    """Aggregator portals from all websites/data/unofficial-portals.json."""
    path = AGENT_ROOT / "data" / "unofficial-portals.json"
    if not path.exists():
        return []

    payload = json.loads(path.read_text(encoding="utf-8"))
    out: list[dict[str, Any]] = []
    for portal in payload.get("portals", []):
        url = portal.get("url") or ""
        listing = portal.get("listingUrl") or url
        declared = portal.get("type", "unofficial")
        out.append(
            {
                "id": portal.get("id", ""),
                "name": portal.get("name", ""),
                "url": url,
                "latestUrl": listing,
                "domain": _host(url),
                "baseUrl": _base_url(url),
                "type": declared if declared == "official" else "unofficial",
                "scope": portal.get("scope") or "aggregator",
                "category": "aggregator",
                "stateIds": portal.get("states") or ["all"],
                "categories": portal.get("categories") or [],
                "stateListingUrl": portal.get("stateListingUrl"),
                "source": "unofficial-portals.json",
            }
        )
    return out

