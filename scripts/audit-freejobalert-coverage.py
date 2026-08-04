#!/usr/bin/env python3
"""Coverage-only check: FreeJobAlert headlines vs our DB.

Never imports FreeJobAlert as a source. Strips brand text from samples.
Policy: do not display FreeJobAlert names or fetch jobs from them.
"""

from __future__ import annotations

import asyncio
import json
import re
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import httpx
from sqlalchemy import text

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.database.session import SessionLocal  # noqa: E402
from app.services.dedupe_service import title_fingerprint  # noqa: E402

OUT = ROOT / "scripts" / "output" / "freejobalert-coverage.json"
HEADERS = {"User-Agent": "MyGovtJobs-CoverageAudit/1.0 (+https://www.livegovtjobs.com)"}
URLS = [
    "https://www.freejobalert.com/",
    "https://www.freejobalert.com/government-jobs/",
    "https://www.freejobalert.com/latest-notifications/",
]
RECRUIT = re.compile(
    r"recruit|vacanc|notification|apply|advt|online form|posts?\b|walk.?in|cen\b",
    re.I,
)
NOISE = re.compile(
    r"result|admit\s*card|answer\s*key|cutoff|syllabus|hall\s*ticket|merit\s*list|"
    r"download app|telegram|whatsapp",
    re.I,
)
BRAND = re.compile(r"freejobalert|\bfja\b|www\.", re.I)


def clean_title(raw: str) -> str:
    t = re.sub(r"<[^>]+>", " ", raw)
    t = re.sub(r"\s+", " ", t).strip()
    t = BRAND.sub("", t)
    return t.strip(" -|/")


async def fetch_titles(client: httpx.AsyncClient, url: str) -> tuple[str, str | None, list[str]]:
    try:
        resp = await client.get(url, follow_redirects=True, timeout=30.0)
        html = resp.text
    except Exception as exc:
        return url, f"{type(exc).__name__}: {exc}", []

    titles: list[str] = []
    for m in re.finditer(r"<a[^>]*>(.*?)</a>", html, flags=re.I | re.S):
        t = clean_title(m.group(1))
        if len(t) < 20 or len(t) > 160:
            continue
        if not RECRUIT.search(t):
            continue
        if NOISE.search(t) and not re.search(r"recruit|vacanc|notification|apply|online form", t, re.I):
            continue
        titles.append(t)

    seen: set[str] = set()
    uniq: list[str] = []
    for t in titles:
        key = t.lower()
        if key in seen:
            continue
        seen.add(key)
        uniq.append(t)
        if len(uniq) >= 50:
            break
    return url, None, uniq


async def main() -> int:
    async with SessionLocal() as session:
        rows = (
            await session.execute(
                text(
                    """
                    SELECT id::text AS id, title, status, last_date, title_fingerprint,
                           apply_url, source_url, detail->>'source' AS source_key
                    FROM jobs
                    """
                )
            )
        ).mappings().all()
        cont = (
            await session.execute(
                text(
                    """
                    SELECT COUNT(*)::int AS n FROM jobs
                    WHERE apply_url ILIKE '%freejobalert%'
                       OR source_url ILIKE '%freejobalert%'
                       OR COALESCE(primary_pdf_url,'') ILIKE '%freejobalert%'
                       OR detail::text ILIKE '%freejobalert%'
                       OR title ILIKE '%freejobalert%'
                    """
                )
            )
        ).mappings().one()
        live_cont = (
            await session.execute(
                text(
                    """
                    SELECT COUNT(*)::int AS n FROM jobs
                    WHERE status = 'live' AND (
                      apply_url ILIKE '%freejobalert%'
                      OR source_url ILIKE '%freejobalert%'
                      OR COALESCE(primary_pdf_url,'') ILIKE '%freejobalert%'
                      OR detail::text ILIKE '%freejobalert%'
                      OR title ILIKE '%freejobalert%'
                    )
                    """
                )
            )
        ).mappings().one()

    by_fp: dict[str, list[dict]] = {}
    db_rows = [dict(r) for r in rows]
    for r in db_rows:
        fp = (r["title_fingerprint"] or title_fingerprint(r["title"] or "")).strip()
        if fp:
            by_fp.setdefault(fp, []).append(r)

    page_stats = []
    all_titles: list[str] = []
    async with httpx.AsyncClient(headers=HEADERS) as client:
        for url in URLS:
            u, err, titles = await fetch_titles(client, url)
            page_stats.append({"url": u, "error": err, "sampled": len(titles)})
            print(f"  {u}: sampled={len(titles)} err={err}", flush=True)
            all_titles.extend(titles)

    seen: set[str] = set()
    titles: list[str] = []
    for t in all_titles:
        key = t.lower()
        if key in seen:
            continue
        seen.add(key)
        titles.append(t)

    matched = []
    missing = []
    for title in titles:
        fp = title_fingerprint(title)
        hits = list(by_fp.get(fp) or [])
        if not hits:
            tokens = set(re.findall(r"[a-z0-9]{4,}", title.lower()))
            best_row = None
            best_score = 0.0
            for row in db_rows:
                rt = set(re.findall(r"[a-z0-9]{4,}", (row.get("title") or "").lower()))
                if not tokens or not rt:
                    continue
                inter = len(tokens & rt)
                union = len(tokens | rt)
                score = inter / union if union else 0.0
                # Require meaningful overlap (avoid Supervisor↔Supervisor false hits)
                if inter >= 3 and score >= 0.35 and score > best_score:
                    best_score = score
                    best_row = row
            if best_row is not None:
                hits = [best_row]
        if hits:
            best = hits[0]
            matched.append(
                {
                    "external": title[:140],
                    "ours": (best.get("title") or "")[:140],
                    "status": best.get("status"),
                    "last_date": str(best.get("last_date") or ""),
                }
            )
        else:
            missing.append({"external": title[:140]})

    live = json.loads((ROOT / "frontend/public/data/live-jobs.json").read_text(encoding="utf-8"))
    live_fja = 0
    for it in live.get("items") or []:
        blob = json.dumps(it).lower()
        if "freejobalert" in blob:
            live_fja += 1

    # Improvements from missing list (official boards mentioned)
    board_hints = Counter()
    for m in missing:
        t = m["external"].lower()
        for board, pat in [
            ("ssc", r"\bssc\b"),
            ("upsc", r"\bupsc\b"),
            ("ibps", r"\bibps\b"),
            ("rrb", r"\brrb\b|railway"),
            ("uppsc", r"\buppsc\b"),
            ("bpsc", r"\bbpsc\b"),
            ("rpsc", r"\brpsc\b|rajasthan"),
            ("aiims", r"\baiims\b|norcet"),
            ("police", r"police|constable"),
            ("banking", r"\bbank\b|sbi|nabard"),
            ("defence", r"army|navy|iaf|air force|afcat|bsf|cisf"),
        ]:
            if re.search(pat, t):
                board_hints[board] += 1

    report = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "policy": {
            "fetch_from_freejobalert": False,
            "show_freejobalert_name": False,
            "use_as": "coverage checklist only — match headlines, then ingest from official portals",
        },
        "pages": page_stats,
        "unique_titles": len(titles),
        "matched": len(matched),
        "missing": len(missing),
        "match_rate_pct": round(100.0 * len(matched) / len(titles), 1) if titles else None,
        "matched_by_status": dict(Counter(m["status"] for m in matched)),
        "matched_sample": matched[:25],
        "missing_sample": missing[:30],
        "missing_board_hints": dict(board_hints.most_common()),
        "db_contamination_rows": cont["n"],
        "live_contamination_rows": live_cont["n"],
        "live_json_contamination": live_fja,
        "improvements": [
            {
                "priority": 1,
                "item": "Keep FreeJobAlert blocked (already enforced)",
                "detail": "apply_url / PDFs / brand text rejected by validation + official domain filters. Do not add as ingest source.",
            },
            {
                "priority": 2,
                "item": "Promote matching drafts to live",
                "detail": f"{sum(1 for m in matched if m['status']=='draft')} sampled headlines already exist as draft — enrich last_date and verify so they appear publicly without using FreeJobAlert.",
            },
            {
                "priority": 3,
                "item": "Close missing boards via official scrapers",
                "detail": "Missing headlines cluster around: "
                + ", ".join(f"{k}({v})" for k, v in board_hints.most_common(8))
                or "n/a",
            },
            {
                "priority": 4,
                "item": "Scrub any residual brand strings",
                "detail": f"DB rows mentioning freejobalert: {cont['n']} (live: {live_cont['n']}). Run data:scrub / sanitize-catalog if > 0.",
            },
        ],
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")

    print("\n=== FreeJobAlert coverage (checklist only) ===", flush=True)
    print(f"Sampled unique recruit headlines: {report['unique_titles']}")
    print(f"Already on our site (any status): {report['matched']} ({report['match_rate_pct']}%)")
    print(f"  by status: {report['matched_by_status']}")
    print(f"Not found on ours: {report['missing']}")
    print(f"Contamination in DB: {report['db_contamination_rows']} (live={report['live_contamination_rows']})")
    print(f"Contamination in live-jobs.json: {report['live_json_contamination']}")
    print("\nMissing board hints:", report["missing_board_hints"])
    print("\nWhat to improve:")
    for imp in report["improvements"]:
        print(f"  P{imp['priority']}. {imp['item']}")
        print(f"     {imp['detail']}")
    print(f"\nWrote {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
