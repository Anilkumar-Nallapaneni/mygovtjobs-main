#!/usr/bin/env python3
"""Audit PDF date extraction for jobs in live-jobs.json (read-only)."""
import asyncio
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.parsers.pdf_parser import parse_pdf_url


async def audit_job(job: dict) -> dict:
    pdf = job.get("pdf_url") or job.get("apply_url")
    if not pdf or ".pdf" not in str(pdf).lower():
        return {"title": job.get("title"), "skip": "no pdf"}
    fields = await parse_pdf_url(pdf)
    stored_pub = str(job.get("published_at") or "")[:10]
    stored_last = str(job.get("last_date") or "")[:10]
    pub = fields.get("published_date")
    last = fields.get("last_date")
    return {
        "title": (job.get("title") or "")[:70],
        "stored_pub": stored_pub,
        "stored_last": stored_last,
        "pdf_pub": pub,
        "pdf_last": last,
        "same_stored": stored_pub == stored_last and stored_pub not in ("", "None"),
        "pdf_split": bool(pub and last and pub != last),
    }


async def main() -> None:
  path = ROOT / "frontend/public/data/live-jobs.json"
  jobs = json.loads(path.read_text(encoding="utf-8")).get("items") or []
  needle = sys.argv[1] if len(sys.argv) > 1 else "DFPD Recruitment"
  matches = [j for j in jobs if needle.lower() in (j.get("title") or "").lower()]
  if not matches:
    print("no match for", needle)
    return
  for job in matches[:3]:
    print(json.dumps(await audit_job(job), indent=2))


if __name__ == "__main__":
    asyncio.run(main())
