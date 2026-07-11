#!/usr/bin/env python3
"""Probe live job apply/official URLs; mark repeated failures in jobs table."""
from __future__ import annotations

import argparse
import asyncio
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

import httpx
from sqlalchemy import text

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.database.session import SessionLocal  # noqa: E402

URL_KEYS = ("apply_url", "official_url", "notification_pdf", "result_url", "admit_card_url")
FAIL_THRESHOLD = 2
TIMEOUT = 15.0
USER_AGENT = "MyGovtJobs-LinkCheck/1.0 (+https://www.livegovtjobs.com)"


def pick_url(row: dict) -> str | None:
    for key in URL_KEYS:
        val = row.get(key)
        if val and isinstance(val, str) and re.search(r"^https?://", val, re.I):
            return val.strip()
    detail = row.get("detail") or {}
    if isinstance(detail, dict):
        for key in URL_KEYS:
            val = detail.get(key)
            if val and isinstance(val, str) and re.search(r"^https?://", val, re.I):
                return val.strip()
    return None


async def probe(client: httpx.AsyncClient, url: str) -> int:
    try:
        resp = await client.head(url, follow_redirects=True)
        if resp.status_code >= 400:
            resp = await client.get(url, follow_redirects=True)
        return int(resp.status_code)
    except Exception:
        return 0


async def run(limit: int, concurrency: int) -> int:
    async with SessionLocal() as session:
        rows = (
            await session.execute(
                text(
                    """
                    SELECT id, slug, title, apply_url, detail
                    FROM jobs
                    WHERE status = 'live'
                    ORDER BY link_last_checked_at NULLS FIRST, updated_at DESC
                    LIMIT :limit
                    """
                ),
                {"limit": limit},
            )
        ).mappings().all()

    if not rows:
        print("No live jobs to check.", flush=True)
        return 0

    sem = asyncio.Semaphore(max(1, concurrency))
    checked = 0
    broken = 0

    async with httpx.AsyncClient(
        timeout=TIMEOUT,
        headers={"User-Agent": USER_AGENT},
        verify=True,
    ) as client:

        async def check_one(row: dict) -> None:
            nonlocal checked, broken
            url = pick_url(dict(row))
            if not url:
                return
            async with sem:
                status = await probe(client, url)
            checked += 1
            domain = urlparse(url).netloc.lower()
            now = datetime.now(timezone.utc)
            failures = 0 if 200 <= status < 400 else FAIL_THRESHOLD
            if failures >= FAIL_THRESHOLD:
                broken += 1
            async with SessionLocal() as session:
                await session.execute(
                    text(
                        """
                        UPDATE jobs
                        SET link_last_checked_at = :now,
                            link_last_http_status = :status,
                            link_consecutive_failures = CASE
                              WHEN :status BETWEEN 200 AND 399 THEN 0
                              ELSE COALESCE(link_consecutive_failures, 0) + 1
                            END,
                            source_domain = COALESCE(source_domain, :domain),
                            verified_at = CASE
                              WHEN :status BETWEEN 200 AND 399 THEN :now
                              ELSE verified_at
                            END,
                            last_http_status = :status
                        WHERE id = :id
                        """
                    ),
                    {
                        "id": row["id"],
                        "now": now,
                        "status": status,
                        "domain": domain,
                    },
                )
                await session.commit()
            label = "OK" if 200 <= status < 400 else "FAIL"
            print(f"[{label}] {row.get('slug')} HTTP {status} — {url[:80]}", flush=True)

        await asyncio.gather(*(check_one(dict(r)) for r in rows))

    print(f"Checked {checked} URLs; {broken} marked with new failure increment.", flush=True)
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Probe job apply/official URLs")
    parser.add_argument("--limit", type=int, default=100, help="Max jobs to probe")
    parser.add_argument("--concurrency", type=int, default=6, help="Parallel HTTP probes")
    args = parser.parse_args()
    return asyncio.run(run(args.limit, args.concurrency))


if __name__ == "__main__":
    raise SystemExit(main())
