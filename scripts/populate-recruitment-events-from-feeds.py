#!/usr/bin/env python3
"""Populate recruitments + recruitment_events from official-feed-items.json.

Maps admit card / result / answer key feed rows into the lifecycle tables the
Results / Admit Card hubs already read. Dry-run by default; pass --apply to write.

  node scripts/run-python.mjs scripts/populate-recruitment-events-from-feeds.py
  node scripts/run-python.mjs scripts/populate-recruitment-events-from-feeds.py --apply
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import date, datetime
from pathlib import Path
from urllib.parse import urlparse
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from sqlalchemy import text  # noqa: E402

from app.database.session import SessionLocal  # noqa: E402
from app.services.document_classifier import classify_document_type  # noqa: E402

FEED_PATH = ROOT / "frontend" / "public" / "data" / "official-feed-items.json"
EVENT_TYPES = frozenset({"admit_card", "answer_key", "result"})

DOC_TO_EVENT = {
    "ADMIT_CARD": "admit_card",
    "ANSWER_KEY": "answer_key",
    "RESULT": "result",
}


def _slugify(value: str, fallback: str) -> str:
    raw = re.sub(r"[^a-z0-9]+", "-", (value or "").lower()).strip("-")
    if not raw:
        raw = re.sub(r"[^a-z0-9]+", "-", fallback.lower()).strip("-") or "event"
    return raw[:80]


def _parse_date(value: object) -> date | None:
    if value is None or value == "":
        return None
    text_val = str(value).strip()
    if len(text_val) >= 10:
        try:
            return date.fromisoformat(text_val[:10])
        except ValueError:
            pass
    try:
        return datetime.fromisoformat(text_val.replace("Z", "+00:00")).date()
    except ValueError:
        return None


def _org_from_item(item: dict) -> str:
    return (
        str(item.get("dept") or item.get("sourceName") or item.get("sourceId") or "Government of India")
        .strip()
        or "Government of India"
    )


def _document_url(item: dict) -> str | None:
    pdfs = item.get("pdfUrls") or []
    if isinstance(pdfs, list) and pdfs:
        url = str(pdfs[0] or "").strip()
        if url:
            return url
    link = str(item.get("link") or "").strip()
    if link.lower().endswith(".pdf"):
        return link
    return None


def _classify_event(item: dict) -> str | None:
    title = str(item.get("title") or "")
    link = str(item.get("link") or "")
    summary = str(item.get("summary") or "")
    doc = classify_document_type(title=title, url=link, text=summary, dept=str(item.get("dept") or ""))
    event = DOC_TO_EVENT.get(doc)
    if event:
        return event
    # Soft title heuristics for feed rows the classifier leaves as OTHER/UNKNOWN.
    if re.search(r"\b(?:admit\s*card|hall\s*ticket|call\s*letter)\b", title, re.I):
        return "admit_card"
    if re.search(r"\banswer\s*keys?\b", title, re.I):
        return "answer_key"
    if re.search(
        r"\b(?:results?:|final\s+result|merit\s*list|select(?:ed|ion)\s+list|cut[\s-]?off)\b",
        title,
        re.I,
    ):
        return "result"
    return None


def _candidates(limit: int) -> list[dict]:
    payload = json.loads(FEED_PATH.read_text(encoding="utf-8"))
    items = payload.get("items") if isinstance(payload, dict) else payload
    if not isinstance(items, list):
        return []
    out: list[dict] = []
    seen: set[str] = set()
    for item in items:
        if not isinstance(item, dict):
            continue
        event_type = _classify_event(item)
        if not event_type or event_type not in EVENT_TYPES:
            continue
        title = str(item.get("title") or "").strip()
        link = str(item.get("link") or "").strip()
        if not title or not link:
            continue
        # Skip generic hub index rows ("Admit Cards", "Results") with no specific notice.
        if len(title) < 24 and re.fullmatch(r"(?i)admit\s*cards?|results?|answer\s*keys?", title):
            continue
        host = urlparse(link).hostname or ""
        if not host:
            continue
        key = f"{event_type}|{link.lower()}"
        if key in seen:
            continue
        seen.add(key)
        out.append(
            {
                "event_type": event_type,
                "title": title[:400],
                "organization": _org_from_item(item)[:200],
                "official_url": link[:1000],
                "document_url": (_document_url(item) or "")[:1000] or None,
                "event_date": _parse_date(item.get("publishedAt")),
                "state_codes": [
                    str(s).lower()
                    for s in (item.get("stateIds") or [])
                    if str(s).strip() and str(s).lower() not in {"all", "india"}
                ][:12],
                "source_id": str(item.get("sourceId") or "feed"),
                "feed_id": str(item.get("id") or ""),
            }
        )
        if limit and len(out) >= limit:
            break
    return out


async def apply_rows(rows: list[dict]) -> dict:
    inserted_recruitments = 0
    inserted_events = 0
    skipped = 0
    async with SessionLocal() as session:
        for row in rows:
            slug = _slugify(f"{row['organization']}-{row['title']}", row["feed_id"] or row["source_id"])
            existing = (
                await session.execute(
                    text("SELECT id FROM public.recruitments WHERE canonical_slug = :slug LIMIT 1"),
                    {"slug": slug},
                )
            ).first()
            if existing:
                recruitment_id = existing[0]
            else:
                recruitment_id = uuid4()
                await session.execute(
                    text(
                        """
                        INSERT INTO public.recruitments
                          (id, canonical_slug, organization, title, state_codes, status, official_url, updated_at)
                        VALUES
                          (:id, :slug, :org, :title, :states, 'active', :url, now())
                        """
                    ),
                    {
                        "id": recruitment_id,
                        "slug": slug,
                        "org": row["organization"],
                        "title": row["title"],
                        "states": row["state_codes"],
                        "url": row["official_url"],
                    },
                )
                inserted_recruitments += 1

            event_date = row["event_date"]
            dup = (
                await session.execute(
                    text(
                        """
                        SELECT id FROM public.recruitment_events
                        WHERE recruitment_id = :rid
                          AND event_type = :etype
                          AND official_url = :url
                          AND event_date IS NOT DISTINCT FROM :edate
                        LIMIT 1
                        """
                    ),
                    {
                        "rid": recruitment_id,
                        "etype": row["event_type"],
                        "url": row["official_url"],
                        "edate": event_date,
                    },
                )
            ).first()
            if dup:
                skipped += 1
                continue

            result = await session.execute(
                text(
                    """
                    INSERT INTO public.recruitment_events
                      (id, recruitment_id, event_type, event_date, title, official_url, document_url, status, source_evidence, updated_at)
                    VALUES
                      (:id, :rid, :etype, :edate, :title, :url, :doc, 'announced', CAST(:evidence AS jsonb), now())
                    ON CONFLICT (recruitment_id, event_type, event_date, official_url) DO NOTHING
                    RETURNING id
                    """
                ),
                {
                    "id": uuid4(),
                    "rid": recruitment_id,
                    "etype": row["event_type"],
                    "edate": event_date,
                    "title": row["title"],
                    "url": row["official_url"],
                    "doc": row["document_url"],
                    "evidence": json.dumps(
                        {
                            "source": "official-feed-items",
                            "sourceId": row["source_id"],
                            "feedId": row["feed_id"],
                        }
                    ),
                },
            )
            if result.first():
                inserted_events += 1
            else:
                skipped += 1
        await session.commit()
    return {
        "insertedRecruitments": inserted_recruitments,
        "insertedEvents": inserted_events,
        "skippedDuplicates": skipped,
    }


async def main() -> int:
    parser = argparse.ArgumentParser(description="Populate recruitment_events from official feeds")
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--limit", type=int, default=400, help="Max lifecycle events to consider")
    args = parser.parse_args()

    if not FEED_PATH.exists():
        print(f"Missing feed file: {FEED_PATH}", flush=True)
        return 1

    rows = _candidates(args.limit)
    by_type: dict[str, int] = {}
    for row in rows:
        by_type[row["event_type"]] = by_type.get(row["event_type"], 0) + 1
    print(
        json.dumps(
            {
                "candidates": len(rows),
                "byType": by_type,
                "apply": args.apply,
                "sample": [
                    {"type": r["event_type"], "title": r["title"][:90], "org": r["organization"]}
                    for r in rows[:5]
                ],
            },
            indent=2,
            ensure_ascii=False,
        ),
        flush=True,
    )
    if not args.apply:
        print("Dry-run only. Re-run with --apply to write.", flush=True)
        return 0

    stats = await apply_rows(rows)
    print(json.dumps(stats, indent=2), flush=True)
    return 0


if __name__ == "__main__":
    import asyncio

    raise SystemExit(asyncio.run(main()))
