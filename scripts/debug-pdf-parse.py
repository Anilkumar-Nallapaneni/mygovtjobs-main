#!/usr/bin/env python3
import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from sqlalchemy import select

from app.database.session import SessionLocal
from app.models.job import Job
from app.parsers.pdf_parser import fetch_pdf_text, parse_pdf_url
from app.utils.job_pdf_urls import collect_pdf_urls


async def main() -> None:
    async with SessionLocal() as s:
        jobs = (await s.execute(select(Job).where(Job.status == "live").limit(5))).scalars().all()
    for job in jobs:
        urls = collect_pdf_urls(job)
        print("---")
        print(job.title[:70])
        print("apply:", (job.apply_url or "")[:90])
        print("pdf_urls:", urls[:2])
        if not urls:
            continue
        u = urls[0]
        try:
            text = await fetch_pdf_text(u)
            print("text_len:", len(text))
        except Exception as exc:
            print("fetch_err:", exc)
            continue
        fields = await parse_pdf_url(u)
        print("field_keys:", sorted(fields.keys()))
        print("sections:", len(fields.get("content_sections") or []))
        print("vacancies:", fields.get("vacancies"))


if __name__ == "__main__":
    asyncio.run(main())
