#!/usr/bin/env python3
import asyncio
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.parsers.notification_parser import NotificationParser
from app.parsers.pdf_parser import parse_pdf_url


async def main() -> None:
    jobs = json.loads((ROOT / "frontend/public/data/live-jobs.json").read_text(encoding="utf-8"))["items"]
    job = next(j for j in jobs if "VNSGU Associate Professor" in j.get("title", ""))
    pdf = job.get("pdf_url") or job.get("apply_url")
    print("title:", job["title"][:80])
    print("stored:", job.get("last_date"), job.get("published_at"))
    print("pdf:", pdf)
    fields = await parse_pdf_url(pdf)
    print("pdf extracted:", {k: fields.get(k) for k in ("published_date", "last_date")})
    norm = NotificationParser().parse(
        {"title": job["title"], "link": job.get("apply_url"), "pdfUrls": [pdf]},
        pdf_fields=fields,
    )
    print("parsed:", norm.get("last_date"), norm.get("published_at"))


if __name__ == "__main__":
    asyncio.run(main())
