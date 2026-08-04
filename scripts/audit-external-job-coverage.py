#!/usr/bin/env python3
"""Compare jobs from official archives + sample aggregators vs our DB.

Reports which external listings already exist on Live Govt Jobs and which are missing.
"""

from __future__ import annotations

import asyncio
import json
import re
import sys
from collections import Counter, defaultdict
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import httpx
from sqlalchemy import text

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.database.session import SessionLocal  # noqa: E402
from app.services.dedupe_service import title_fingerprint  # noqa: E402

ARCHIVES = ROOT / "frontend" / "public" / "data" / "official-archives"
LIVE_JSON = ROOT / "frontend" / "public" / "data" / "live-jobs.json"
WEBSITES = ROOT / "all websites" / "output" / "all-websites.json"
REGISTRY = ROOT / "scripts" / "scraper_registry.json"
OUT = ROOT / "scripts" / "output" / "external-job-coverage.json"

# Lightweight aggregator homepage samples (coverage map only — not for apply links).
AGGREGATORS = [
    ("freejobalert", "https://www.freejobalert.com/"),
    ("sarkariresult", "https://www.sarkariresult.com/"),
    ("sarkariresult-com", "https://sarkariresult.com.cm/"),
    ("rojgarresult", "https://rojgarresult.com/"),
]

RECRUITMENT_HINT = re.compile(
    r"recruit|vacanc|notification|apply|advt|advertisement|walk.?in|posts?\b|cen\b",
    re.I,
)
NOISE_HINT = re.compile(
    r"result|admit\s*card|answer\s*key|cutoff|cut.?off|syllabus|interview|marks|"
    r"previous\s*paper|score\s*card|hall\s*ticket|merit\s*list",
    re.I,
)


def _norm_url(url: str | None) -> str:
    if not url:
        return ""
    u = url.strip().lower().split("#")[0].rstrip("/")
    u = u.replace("http://", "https://")
    return u


def _domain(url: str | None) -> str:
    if not url:
        return ""
    try:
        host = urlparse(url if "://" in url else f"https://{url}").hostname or ""
    except Exception:
        return ""
    return host.lower().removeprefix("www.")


def load_archives() -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    if not ARCHIVES.exists():
        return items
    for path in sorted(ARCHIVES.glob("*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        bucket = path.stem
        for raw in data.get("items") or []:
            title = str(raw.get("title") or "").strip()
            link = str(raw.get("link") or "").strip()
            if not title and not link:
                continue
            items.append(
                {
                    "bucket": bucket,
                    "title": re.sub(r"<[^>]+>", " ", title),
                    "link": link,
                    "sourceName": raw.get("sourceName") or raw.get("dept") or "",
                    "fp": title_fingerprint(re.sub(r"<[^>]+>", " ", title)),
                    "url_key": _norm_url(link),
                    "domain": _domain(link),
                }
            )
    return items


async def load_db_jobs() -> dict[str, Any]:
    async with SessionLocal() as session:
        rows = (
            await session.execute(
                text(
                    """
                    SELECT id::text AS id, title, status, verification_status,
                           source_url, apply_url, primary_pdf_url, source_domain,
                           title_fingerprint, last_date, detail->>'source' AS source_key
                    FROM jobs
                    """
                )
            )
        ).mappings().all()

        sources = (
            await session.execute(
                text(
                    """
                    SELECT code, name, is_active, portal_url, feed_url, last_run_at, last_error
                    FROM sources
                    ORDER BY code
                    """
                )
            )
        ).mappings().all()

    by_fp: dict[str, list[dict]] = defaultdict(list)
    by_url: set[str] = set()
    by_domain: Counter[str] = Counter()
    status_counts: Counter[str] = Counter()

    for r in rows:
        status_counts[str(r["status"] or "?")] += 1
        fp = (r["title_fingerprint"] or title_fingerprint(r["title"] or "")).strip()
        if fp:
            by_fp[fp].append(dict(r))
        for u in (r["source_url"], r["apply_url"], r["primary_pdf_url"]):
            nu = _norm_url(u)
            if nu:
                by_url.add(nu)
        d = (r["source_domain"] or _domain(r["source_url"]) or _domain(r["apply_url"]) or "").removeprefix("www.")
        if d:
            by_domain[d] += 1

    return {
        "rows": [dict(r) for r in rows],
        "by_fp": by_fp,
        "by_url": by_url,
        "by_domain": by_domain,
        "status_counts": status_counts,
        "sources": [dict(s) for s in sources],
    }


def match_item(item: dict[str, Any], db: dict[str, Any]) -> dict[str, Any]:
    hits: list[dict] = []
    if item["url_key"] and item["url_key"] in db["by_url"]:
        # Find rows with that URL
        for row in db["rows"]:
            urls = {_norm_url(row.get("source_url")), _norm_url(row.get("apply_url")), _norm_url(row.get("primary_pdf_url"))}
            if item["url_key"] in urls:
                hits.append(row)
    if not hits and item["fp"]:
        hits = list(db["by_fp"].get(item["fp"]) or [])

    if not hits:
        return {"match": "missing", "our_status": None, "our_title": None, "our_id": None}

    # Prefer live > draft > expired
    order = {"live": 0, "draft": 1, "expired": 2}
    hits.sort(key=lambda r: order.get(str(r.get("status")), 9))
    best = hits[0]
    return {
        "match": "found",
        "our_status": best.get("status"),
        "our_title": best.get("title"),
        "our_id": best.get("id"),
        "verification_status": best.get("verification_status"),
    }


async def sample_aggregator(client: httpx.AsyncClient, name: str, url: str) -> list[dict[str, Any]]:
    try:
        resp = await client.get(url, follow_redirects=True, timeout=25.0)
        html = resp.text
    except Exception as exc:
        return [{"aggregator": name, "error": f"{type(exc).__name__}: {exc}", "titles": []}]

    # Pull anchor texts that look like job headlines
    titles: list[str] = []
    for m in re.finditer(r"<a[^>]*>(.*?)</a>", html, flags=re.I | re.S):
        text = re.sub(r"<[^>]+>", " ", m.group(1))
        text = re.sub(r"\s+", " ", text).strip()
        if len(text) < 18 or len(text) > 180:
            continue
        if not RECRUITMENT_HINT.search(text):
            continue
        if NOISE_HINT.search(text) and not re.search(r"recruit|vacanc|notification|apply", text, re.I):
            continue
        titles.append(text)

    # de-dupe preserve order
    seen: set[str] = set()
    uniq: list[str] = []
    for t in titles:
        key = t.lower()
        if key in seen:
            continue
        seen.add(key)
        uniq.append(t)
        if len(uniq) >= 40:
            break

    return [{"aggregator": name, "url": url, "titles": uniq, "error": None}]


def classify_action(match: dict[str, Any], bucket: str) -> str:
    if match["match"] == "missing":
        if bucket in {"last-date"} or RECRUITMENT_HINT.search(bucket):
            return "ingest_or_verify_missing"
        if bucket in {"results", "admit-cards", "answer-keys", "cutoff", "interview", "syllabus", "written-marks", "previous-papers"}:
            return "skip_non_recruitment_archive"
        return "review_missing"
    status = match.get("our_status")
    if status == "live":
        return "ok_already_live"
    if status == "draft":
        return "promote_draft_if_valid"
    if status == "expired":
        return "ok_expired_on_ours"
    return "review"


async def main() -> int:
    print("Loading DB jobs…", flush=True)
    db = await load_db_jobs()
    archives = load_archives()
    print(f"DB jobs: {len(db['rows'])} | archive items: {len(archives)}", flush=True)

    archive_results: list[dict[str, Any]] = []
    action_counts: Counter[str] = Counter()
    bucket_stats: dict[str, Counter[str]] = defaultdict(Counter)

    for item in archives:
        m = match_item(item, db)
        action = classify_action(m, item["bucket"])
        action_counts[action] += 1
        bucket_stats[item["bucket"]][m["match"] if m["match"] == "missing" else f"found:{m['our_status']}"] += 1
        archive_results.append(
            {
                "bucket": item["bucket"],
                "title": item["title"][:160],
                "link": item["link"],
                "sourceName": item["sourceName"],
                "domain": item["domain"],
                **m,
                "action": action,
            }
        )

    # Source registry coverage
    registry = json.loads(REGISTRY.read_text(encoding="utf-8")) if REGISTRY.exists() else {}
    scrapers = registry.get("scrapers") or registry.get("sources") or []
    if isinstance(scrapers, dict):
        scrapers = [{"code": k, **v} for k, v in scrapers.items()]

    source_job_counts: Counter[str] = Counter()
    for row in db["rows"]:
        sk = row.get("source_key")
        if sk:
            source_job_counts[str(sk)] += 1

    scraper_coverage = []
    for s in scrapers:
        key = str(s.get("code") or s.get("key") or s.get("id") or "")
        if not key:
            continue
        enabled = s.get("enabled", True)
        n = source_job_counts.get(key, 0)
        scraper_coverage.append(
            {
                "key": key,
                "name": s.get("name") or key,
                "enabled": enabled,
                "jobs_in_db": n,
                "has_jobs": n > 0,
            }
        )

    # Aggregator sample
    agg_results: list[dict[str, Any]] = []
    headers = {"User-Agent": "MyGovtJobs-CoverageAudit/1.0 (+https://www.livegovtjobs.com)"}
    async with httpx.AsyncClient(headers=headers) as client:
        for name, url in AGGREGATORS:
            print(f"Sampling aggregator {name}…", flush=True)
            samples = await sample_aggregator(client, name, url)
            for sample in samples:
                titles = sample.get("titles") or []
                matched = 0
                missing_titles: list[dict[str, Any]] = []
                found_titles: list[dict[str, Any]] = []
                for title in titles:
                    fp = title_fingerprint(title)
                    hits = db["by_fp"].get(fp) or []
                    # soft match: shared significant tokens
                    if not hits:
                        tokens = set(re.findall(r"[a-z0-9]{4,}", title.lower()))
                        for row in db["rows"]:
                            rt = set(re.findall(r"[a-z0-9]{4,}", (row.get("title") or "").lower()))
                            if len(tokens & rt) >= max(3, min(5, len(tokens) // 2)):
                                hits.append(row)
                                break
                    if hits:
                        matched += 1
                        best = hits[0]
                        found_titles.append(
                            {
                                "external": title[:140],
                                "ours": (best.get("title") or "")[:140],
                                "status": best.get("status"),
                            }
                        )
                    else:
                        missing_titles.append({"external": title[:140]})
                agg_results.append(
                    {
                        "aggregator": name,
                        "url": url,
                        "error": sample.get("error"),
                        "sampled": len(titles),
                        "matched": matched,
                        "missing": len(missing_titles),
                        "match_rate": round(100.0 * matched / len(titles), 1) if titles else None,
                        "missing_sample": missing_titles[:15],
                        "found_sample": found_titles[:10],
                    }
                )

    websites = []
    if WEBSITES.exists():
        websites = json.loads(WEBSITES.read_text(encoding="utf-8")).get("websites") or []

    live_json_count = 0
    if LIVE_JSON.exists():
        live_json_count = len(json.loads(LIVE_JSON.read_text(encoding="utf-8")).get("items") or [])

    missing_recruitment = [
        r
        for r in archive_results
        if r["action"] == "ingest_or_verify_missing" and r["bucket"] == "last-date"
    ]
    draft_to_promote = [
        r for r in archive_results if r["action"] == "promote_draft_if_valid" and r["bucket"] == "last-date"
    ]

    scrapers_with_jobs = sum(1 for s in scraper_coverage if s["has_jobs"])
    scrapers_enabled = [s for s in scraper_coverage if s.get("enabled", True)]
    scrapers_empty = [s for s in scrapers_enabled if not s["has_jobs"]]

    recommendations = []
    if db["status_counts"].get("draft", 0) > 100:
        recommendations.append(
            {
                "priority": 1,
                "action": "Review/promote drafts that pass publish gate",
                "why": f"{db['status_counts'].get('draft', 0)} draft jobs sit in DB but only {db['status_counts'].get('live', 0)} are public. Most 'missing on website' jobs are already scraped as drafts.",
                "command": "Use admin review OR temporarily set AUTO_PUBLISH_VERIFIED=1 for a controlled publish pass, then npm run export:live-jobs",
            }
        )
    if draft_to_promote:
        recommendations.append(
            {
                "priority": 2,
                "action": "Promote matching last-date archive drafts to live",
                "why": f"{len(draft_to_promote)} active last-date notices already exist as draft on our site.",
                "command": "Admin verify those jobs → export:live-jobs",
            }
        )
    if missing_recruitment:
        recommendations.append(
            {
                "priority": 3,
                "action": "Ingest missing active last-date recruitments",
                "why": f"{len(missing_recruitment)} last-date archive items have no DB match by URL/title fingerprint.",
                "command": "npm run daily:sync -- --force  (then review drafts)",
            }
        )
    if scrapers_empty:
        recommendations.append(
            {
                "priority": 4,
                "action": "Fix empty scrapers",
                "why": f"{len(scrapers_empty)}/{len(scrapers_enabled)} enabled scrapers have 0 jobs keyed in DB.",
                "command": "Inspect scraper_registry timeouts/failures; re-run ingest:direct for those keys",
                "examples": [s["key"] for s in scrapers_empty[:20]],
            }
        )
    recommendations.append(
        {
            "priority": 5,
            "action": "Do not ingest unofficial aggregators into production",
            "why": "Aggregator sites are reference-only. Match their headlines to official drafts, then publish official rows.",
            "command": "Keep apply links on .gov.in / .nic.in / approved PSU domains only",
        }
    )

    report = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "summary": {
            "db_total": len(db["rows"]),
            "db_by_status": dict(db["status_counts"]),
            "live_json": live_json_count,
            "websites_cataloged": len(websites),
            "websites_official": sum(1 for w in websites if w.get("type") == "official"),
            "websites_unofficial": sum(1 for w in websites if w.get("type") == "unofficial"),
            "archive_items": len(archives),
            "archive_actions": dict(action_counts),
            "scrapers_total": len(scraper_coverage),
            "scrapers_with_jobs": scrapers_with_jobs,
            "scrapers_enabled_empty": len(scrapers_empty),
            "last_date_missing": len(missing_recruitment),
            "last_date_draft_on_ours": len(draft_to_promote),
            "last_date_already_live": sum(
                1 for r in archive_results if r["bucket"] == "last-date" and r["action"] == "ok_already_live"
            ),
        },
        "bucket_stats": {k: dict(v) for k, v in bucket_stats.items()},
        "missing_last_date_sample": missing_recruitment[:25],
        "draft_last_date_sample": draft_to_promote[:25],
        "empty_scrapers": scrapers_empty[:40],
        "aggregators": agg_results,
        "recommendations": recommendations,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")

    s = report["summary"]
    print("\n=== External job coverage audit ===", flush=True)
    print(f"DB: {s['db_total']} (live={s['db_by_status'].get('live',0)} draft={s['db_by_status'].get('draft',0)} expired={s['db_by_status'].get('expired',0)})")
    print(f"Public JSON: {s['live_json']} | Websites catalog: {s['websites_cataloged']} ({s['websites_official']} official / {s['websites_unofficial']} unofficial)")
    print(f"Archive items checked: {s['archive_items']}")
    print(f"  last-date missing: {s['last_date_missing']}")
    print(f"  last-date already draft on ours: {s['last_date_draft_on_ours']}")
    print(f"  last-date already live: {s['last_date_already_live']}")
    print(f"Scrapers with jobs: {s['scrapers_with_jobs']}/{s['scrapers_total']} | empty enabled: {s['scrapers_enabled_empty']}")
    for a in agg_results:
        if a.get("error"):
            print(f"Aggregator {a['aggregator']}: ERROR {a['error']}")
        else:
            print(f"Aggregator {a['aggregator']}: sampled={a['sampled']} matched={a['matched']} missing={a['missing']} ({a['match_rate']}%)")
    print("\nWhat to do (priority):")
    for rec in recommendations:
        print(f"  P{rec['priority']}. {rec['action']}")
        print(f"     → {rec['why']}")
    print(f"\nFull report: {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
