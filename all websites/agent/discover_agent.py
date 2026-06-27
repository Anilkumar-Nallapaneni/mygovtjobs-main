"""All Websites Agent — catalog every govt job portal across India."""

from __future__ import annotations

import asyncio
import json
import logging
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from .load_sources import (
    load_official_sites,
    load_rss_feeds,
    load_scraper_registry,
    load_unofficial_portals,
)
from .probe import probe_websites
from .state_map import STATE_NAMES

logger = logging.getLogger(__name__)

AGENT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = AGENT_ROOT / "output"


def _host(url: str) -> str:
    try:
        return (urlparse(url).hostname or "").lower()
    except Exception:
        return ""


def _dedupe_key(site: dict[str, Any]) -> str:
    domain = site.get("domain") or _host(site.get("url") or site.get("latestUrl") or "")
    if domain:
        return f"domain:{domain}"
    return f"id:{site.get('id', '')}"


class AllWebsitesAgent:
    """
    Discover and save all government job websites:
    - Official portals (curated + scraper registry + RSS)
    - Unofficial aggregators (Sarkari Result, etc.)
    """

    def __init__(self, output_dir: Path | None = None):
        self.output_dir = output_dir or DEFAULT_OUTPUT

    def run(
        self,
        *,
        probe: bool = False,
        probe_limit: int | None = None,
        probe_concurrency: int = 8,
    ) -> dict[str, Any]:
        started = datetime.now(timezone.utc)
        logger.info("Collecting website catalogs…")

        official_curated = load_official_sites()
        official_registry = load_scraper_registry()
        official_rss = load_rss_feeds()
        unofficial = load_unofficial_portals()

        merged = self._merge_records(
            [
                *official_curated,
                *official_registry,
                *official_rss,
                *unofficial,
            ]
        )

        official_all = [s for s in merged if s.get("type") == "official"]
        unofficial_all = [s for s in merged if s.get("type") == "unofficial"]

        if probe:
            logger.info("Probing %s websites…", len(merged))
            probed = asyncio.run(
                probe_websites(
                    merged,
                    concurrency=probe_concurrency,
                    limit=probe_limit,
                )
            )
            probed_map = {_dedupe_key(s): s.get("probe") for s in probed}
            for site in merged:
                site["probe"] = probed_map.get(_dedupe_key(site))

        finished = datetime.now(timezone.utc)
        summary = self._build_summary(merged, official_all, unofficial_all)

        paths = self._write_outputs(
            merged=merged,
            official=official_all,
            unofficial=unofficial_all,
            summary=summary,
            started=started,
            finished=finished,
            probe=probe,
        )

        logger.info(
            "Saved %s unique websites (%s official, %s unofficial) → %s",
            len(merged),
            len(official_all),
            len(unofficial_all),
            self.output_dir,
        )

        return {"summary": summary, "paths": {k: str(v) for k, v in paths.items()}}

    def _merge_records(self, records: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Merge duplicates by domain; prefer curated official metadata."""
        rank = {
            "officialSites.ts": 100,
            "scraper_registry.json": 80,
            "official-sources.json": 70,
            "unofficial-portals.json": 60,
        }

        by_key: dict[str, dict[str, Any]] = {}
        for rec in records:
            if not rec.get("url") and not rec.get("latestUrl") and not rec.get("domain"):
                continue

            domain = rec.get("domain") or _host(rec.get("url") or rec.get("latestUrl") or "")
            if domain and not rec.get("domain"):
                rec["domain"] = domain

            key = _dedupe_key(rec)
            prev = by_key.get(key)
            if not prev:
                by_key[key] = rec
                continue

            prev_rank = rank.get(prev.get("source", ""), 0)
            new_rank = rank.get(rec.get("source", ""), 0)
            if new_rank > prev_rank:
                merged = {**rec, **{k: v for k, v in prev.items() if k not in rec or not rec[k]}}
                by_key[key] = merged
            else:
                for k, v in rec.items():
                    if k not in prev or prev[k] in ("", [], None):
                        prev[k] = v
                    elif k == "stateIds" and isinstance(v, list):
                        prev_states = set(prev.get("stateIds") or [])
                        prev_states.update(v)
                        prev["stateIds"] = sorted(prev_states)

        return sorted(
            by_key.values(),
            key=lambda s: (
                0 if s.get("type") == "official" else 1,
                -(s.get("jobReferences") or 0),
                s.get("name") or s.get("domain") or "",
            ),
        )

    def _build_summary(
        self,
        all_sites: list[dict],
        official: list[dict],
        unofficial: list[dict],
    ) -> dict[str, Any]:
        by_state: dict[str, int] = defaultdict(int)
        by_type: dict[str, int] = defaultdict(int)
        by_category: dict[str, int] = defaultdict(int)

        for site in all_sites:
            by_type[site.get("type") or "unknown"] += 1
            by_category[site.get("category") or "general"] += 1
            for st in site.get("stateIds") or ["all"]:
                by_state[st] += 1

        probe_ok = sum(1 for s in all_sites if (s.get("probe") or {}).get("ok"))
        probe_fail = sum(1 for s in all_sites if s.get("probe") and not s["probe"].get("ok"))

        return {
            "totalWebsites": len(all_sites),
            "officialCount": len(official),
            "unofficialCount": len(unofficial),
            "uniqueDomains": len({s.get("domain") for s in all_sites if s.get("domain")}),
            "byType": dict(by_type),
            "byCategory": dict(sorted(by_category.items(), key=lambda x: -x[1])),
            "byState": {
                code: {"name": STATE_NAMES.get(code, code), "count": count}
                for code, count in sorted(by_state.items(), key=lambda x: (-x[1], x[0]))
            },
            "probeOk": probe_ok,
            "probeFailed": probe_fail,
        }

    def _write_outputs(
        self,
        *,
        merged: list[dict],
        official: list[dict],
        unofficial: list[dict],
        summary: dict,
        started: datetime,
        finished: datetime,
        probe: bool,
    ) -> dict[str, Path]:
        out = self.output_dir
        by_state_dir = out / "by-state"
        by_type_dir = out / "by-type"
        out.mkdir(parents=True, exist_ok=True)
        by_state_dir.mkdir(exist_ok=True)
        by_type_dir.mkdir(exist_ok=True)

        now = finished.isoformat().replace("+00:00", "Z")
        meta = {
            "generatedAt": now,
            "startedAt": started.isoformat().replace("+00:00", "Z"),
            "durationSeconds": round((finished - started).total_seconds(), 1),
            "probed": probe,
            "agent": "all-websites",
            "version": "1.0",
        }

        paths: dict[str, Path] = {}

        def write(path: Path, payload: dict) -> None:
            path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
            paths[path.stem] = path

        write(out / "all-websites.json", {**meta, "count": len(merged), "websites": merged})
        write(out / "summary.json", {**meta, **summary})
        write(by_type_dir / "official.json", {**meta, "count": len(official), "websites": official})
        write(
            by_type_dir / "unofficial.json",
            {**meta, "count": len(unofficial), "websites": unofficial},
        )

        grouped: dict[str, list[dict]] = defaultdict(list)
        for site in merged:
            for st in site.get("stateIds") or ["all"]:
                grouped[st].append(site)

        for state_code, items in grouped.items():
            fname = "all-india.json" if state_code == "all" else f"{state_code}.json"
            write(
                by_state_dir / fname,
                {
                    **meta,
                    "state": state_code,
                    "stateName": STATE_NAMES.get(state_code, state_code),
                    "count": len(items),
                    "websites": items,
                },
            )

        domains = sorted(
            {
                s["domain"]: {
                    "domain": s["domain"],
                    "type": s.get("type"),
                    "name": s.get("name"),
                    "url": s.get("latestUrl") or s.get("url"),
                    "stateIds": s.get("stateIds"),
                }
                for s in merged
                if s.get("domain")
            }.values(),
            key=lambda d: (0 if d["type"] == "official" else 1, d["domain"]),
        )
        write(out / "domains.json", {**meta, "count": len(domains), "domains": domains})

        if probe:
            probe_rows = [
                {
                    "id": s.get("id"),
                    "name": s.get("name"),
                    "domain": s.get("domain"),
                    "url": s.get("latestUrl") or s.get("url"),
                    "type": s.get("type"),
                    **(s.get("probe") or {}),
                }
                for s in merged
                if s.get("probe")
            ]
            write(out / "probe-results.json", {**meta, "count": len(probe_rows), "results": probe_rows})

        return paths
