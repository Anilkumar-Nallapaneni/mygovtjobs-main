#!/usr/bin/env python3
"""Backfill detail.pdf_url for live jobs missing a PDF link. Run from repo root:
  npm run pdf:backfill
Optional: --limit 100 --commit-every 25

HTTP discovery runs outside DB sessions so Supabase pooler idle timeouts do not
drop the connection before commit.
"""
from __future__ import annotations

import argparse
import asyncio
import sys
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from sqlalchemy import select

from app.database.session import SessionLocal
from app.models.job import Job
from app.parsers.notification_parser import NotificationParser
from app.parsers.pdf_parser import parse_pdf_url
from app.scrapers.pdf_discover import ensure_pdf_urls

COMMIT_EVERY = 25


def _log(msg: str) -> None:
    """Print safely on Windows consoles (cp1252) and UTF-8 terminals."""
    try:
        print(msg, flush=True)
    except UnicodeEncodeError:
        print(msg.encode("ascii", errors="replace").decode("ascii"), flush=True)


def _has_pdf(job: Job) -> bool:
    detail = job.detail or {}
    if detail.get("pdf_url"):
        return True
    urls = detail.get("pdf_urls") or []
    return bool(urls) or (job.apply_url and ".pdf" in str(job.apply_url).lower())


@dataclass(frozen=True)
class PdfBackfillCandidate:
    id: str
    title: str
    apply_url: str | None
    detail: dict
    source: str | None


async def load_candidates(limit: int) -> list[PdfBackfillCandidate]:
    async with SessionLocal() as session:
        rows = (
            await session.execute(
                select(Job).where(Job.status == "live").order_by(Job.published_at.desc())
            )
        ).scalars().all()

        out: list[PdfBackfillCandidate] = []
        for job in rows:
            if _has_pdf(job):
                continue
            out.append(
                PdfBackfillCandidate(
                    id=str(job.id),
                    title=job.title or "",
                    apply_url=job.apply_url,
                    detail=dict(job.detail or {}),
                    source=(job.detail or {}).get("source"),
                )
            )
            if limit and len(out) >= limit:
                break
        return out


async def discover_pdf(
    candidate: PdfBackfillCandidate,
    notif: NotificationParser,
) -> dict | None:
    pdf_urls = await ensure_pdf_urls([], candidate.apply_url)
    pdf_fields: dict = {}
    if pdf_urls:
        pdf_fields = await parse_pdf_url(pdf_urls[0])

    normalized = notif.parse(
        {
            "title": candidate.title,
            "link": candidate.apply_url,
            "pdfUrls": pdf_urls,
            "source": candidate.source,
        },
        pdf_fields=pdf_fields,
    )
    nd = normalized.get("detail") or {}
    pdf_url = nd.get("pdf_url")
    if not pdf_url:
        return None
    return {
        "pdf_url": pdf_url,
        "pdf_urls": nd.get("pdf_urls") or [],
    }


async def flush_updates(updates: list[tuple[str, dict]]) -> int:
    if not updates:
        return 0

    async with SessionLocal() as session:
        saved = 0
        for job_id, patch in updates:
            job = await session.get(Job, job_id)
            if not job:
                continue
            detail = dict(job.detail or {})
            detail.update(patch)
            job.detail = detail
            saved += 1
        await session.commit()
    return saved


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=0, help="Max jobs to process (0 = all missing)")
    parser.add_argument(
        "--commit-every",
        type=int,
        default=COMMIT_EVERY,
        help=f"Persist to DB every N discoveries (default {COMMIT_EVERY})",
    )
    args = parser.parse_args()

    candidates = await load_candidates(args.limit)
    total = len(candidates)
    if not total:
        _log("No live jobs missing PDF links.")
        return

    _log(f"Scanning {total} job(s) missing PDF links…")
    notif = NotificationParser()
    updated = 0
    pending: list[tuple[str, dict]] = []

    for scanned, candidate in enumerate(candidates, start=1):
        title_preview = candidate.title[:60]
        try:
            patch = await discover_pdf(candidate, notif)
        except Exception as exc:
            _log(f"-  {title_preview} (error: {exc})")
            continue

        if patch:
            pending.append((candidate.id, patch))
            _log(f"ok {title_preview} -> {patch['pdf_url'][:70]}")
        else:
            _log(f"-  {title_preview} (no PDF found)")

        if len(pending) >= args.commit_every:
            try:
                updated += await flush_updates(pending)
                pending.clear()
                _log(f"  committed batch — {updated} updated so far ({scanned}/{total})")
            except Exception as exc:
                _log(f"  commit failed (will retry next batch): {exc}")
                pending.clear()

    if pending:
        try:
            updated += await flush_updates(pending)
        except Exception as exc:
            _log(f"  final commit failed: {exc}")
            raise

    _log(f"\nDone. scanned={total} updated={updated}")


if __name__ == "__main__":
    asyncio.run(main())
