#!/usr/bin/env python3
"""Break down why live jobs lack discoverable PDF URLs."""
import asyncio
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from sqlalchemy import select

from app.database.session import SessionLocal
from app.models.job import Job
from app.utils.job_pdf_urls import collect_pdf_urls

APPLY_PDF = re.compile(r"\.pdf(\?|/|$)", re.I)
PORTAL_HINT = re.compile(r"apply|register|recruit|career|login|portal|online", re.I)


async def main() -> None:
    async with SessionLocal() as session:
        rows = (
            await session.execute(select(Job).where(Job.status == "live"))
        ).scalars().all()

    with_pdf = []
    without_pdf = []
    for job in rows:
        urls = collect_pdf_urls(job)
        if urls:
            with_pdf.append(job)
        else:
            without_pdf.append(job)

    print(f"Live jobs: {len(rows)}")
    print(f"  With PDF URL (agent can read): {len(with_pdf)}")
    print(f"  Without PDF URL: {len(without_pdf)}")

    reasons: Counter[str] = Counter()
    samples: dict[str, list[str]] = {}

    for job in without_pdf:
        apply = str(job.apply_url or "")
        detail = job.detail or {}
        if not apply:
            key = "no_apply_url"
        elif APPLY_PDF.search(apply):
            key = "apply_is_pdf_but_not_collected"
        elif PORTAL_HINT.search(apply):
            key = "apply_is_online_portal_html"
        elif "viewpdf" in apply.lower() or "viewfile" in apply.lower():
            key = "pdf_viewer_page_not_linked"
        elif detail.get("pdf_url") or detail.get("pdf_urls"):
            key = "detail_pdf_blocked_or_invalid"
        else:
            key = "scrape_never_found_pdf"
        reasons[key] += 1
        samples.setdefault(key, [])
        if len(samples[key]) < 2:
            samples[key].append(f"{job.title[:50]} | {apply[:70]}")

    print("\nWhy no PDF (live jobs):")
    for key, n in reasons.most_common():
        print(f"  {key}: {n}")
        for s in samples.get(key, []):
            print(f"    - {s}")


if __name__ == "__main__":
    asyncio.run(main())
