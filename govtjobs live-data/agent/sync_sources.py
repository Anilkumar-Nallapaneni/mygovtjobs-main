"""Build config/sources.json from parent repo official site catalogs."""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = ROOT.parent
CONFIG_DIR = ROOT / "config"


def sync_sources() -> Path:
    registry_path = REPO_ROOT / "scripts" / "scraper_registry.json"
    sites_path = REPO_ROOT / "frontend" / "src" / "data" / "officialSites.ts"
    feeds_path = REPO_ROOT / "scripts" / "official-sources.json"

    if not registry_path.exists():
        raise FileNotFoundError(f"Missing registry: {registry_path}")

    registry = json.loads(registry_path.read_text(encoding="utf-8"))
    names: dict[str, str] = {}
    if sites_path.exists():
        text = sites_path.read_text(encoding="utf-8")
        for m in re.finditer(r'id:\s*"([^"]+)"[^}]*name:\s*"([^"]+)"', text):
            names[m.group(1)] = m.group(2)

    feed_map: dict[str, dict] = {}
    if feeds_path.exists():
        for f in json.loads(feeds_path.read_text(encoding="utf-8")).get("feeds", []):
            feed_map[f.get("id", "")] = f

    sources: list[dict] = []
    for s in registry.get("scrapers", []):
        if not s.get("enabled"):
            continue
        code = s.get("code", "")
        feed_id = s.get("feed_id")
        feed = feed_map.get(feed_id or "", {})
        sources.append(
            {
                "code": code,
                "name": names.get(code) or feed.get("name") or code,
                "module": s.get("module"),
                "state": s.get("state") or "all",
                "category": s.get("category") or "general",
                "portal_url": s.get("portal_url"),
                "feed_id": feed_id,
                "feed_url": feed.get("feedUrl") if feed_id else None,
                "maxItems": s.get("maxItems") or registry.get("maxItems") or 50,
            }
        )

    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    out = CONFIG_DIR / "sources.json"
    out.write_text(
        json.dumps(
            {
                "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
                "count": len(sources),
                "sources": sources,
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    return out


if __name__ == "__main__":
    path = sync_sources()
    print(f"Wrote {path}")
