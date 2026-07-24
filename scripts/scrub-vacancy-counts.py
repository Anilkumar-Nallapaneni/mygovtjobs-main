#!/usr/bin/env python3
"""Re-resolve vacancy counts (result/cutoff noise, years, pincode false positives).

Examples:
  node scripts/run-python.mjs scripts/scrub-vacancy-counts.py
  node scripts/run-python.mjs scripts/scrub-vacancy-counts.py --apply --export
"""

from __future__ import annotations

import argparse
import asyncio
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LIVE = ROOT / "frontend" / "public" / "data" / "live-jobs.json"

sys.path.insert(0, str(ROOT / "backend"))

from app.utils.vacancy_extract import (  # noqa: E402
    extract_vacancies,
    is_non_vacancy_document,
    resolve_vacancies,
)

RECRUIT_POSTS_RE = re.compile(r"\b\d{1,6}\s*(?:,\d{3})*\s*(?:posts?|vacanc)", re.I)
RECRUIT_HINT_RE = re.compile(
    r"\b(?:recruit(?:ment|ing)?|notification|apply\s*online|vacanc|bharti|posts?\s+of|walk-?in|engagement)\b",
    re.I,
)
URL_TITLE_RE = re.compile(r"^https?://", re.I)
FAQ_NOISE_RE = re.compile(r"\bfrequently\s+asked\s+questions\b|\b\bfaq\b", re.I)


def posts_sum(row: dict) -> int:
    posts = row.get("posts") or []
    if not isinstance(posts, list):
        return 0
    return sum(int(p.get("vacancies") or 0) for p in posts if isinstance(p, dict))


def resolve_row(row: dict) -> int:
    title = str(row.get("title") or "")
    slug = str(row.get("slug") or "")
    detail = row.get("detail") if isinstance(row.get("detail"), dict) else {}
    summary = str(detail.get("summary") or "")
    salary = str(row.get("salary") or "")
    context = " ".join(filter(None, [summary, salary, slug])).strip()
    stored = int(row.get("vacancies") or 0)
    psum = posts_sum(row)

    if is_non_vacancy_document(title, context):
        return 0
    if URL_TITLE_RE.match(title.strip()) or FAQ_NOISE_RE.search(title):
        return 0

    resolved = resolve_vacancies(stored, title, context, posts_sum=psum)

    # Administrative circulars / liaison — not mass recruitment.
    # Keep real recruitments that only store the total in the DB/title without "N posts".
    if resolved > 100 and psum == 0 and not RECRUIT_POSTS_RE.search(title):
        title_only = extract_vacancies(title, title=title)
        if title_only > 0:
            resolved = title_only
        elif resolved > 500 and not RECRUIT_HINT_RE.search(title):
            resolved = 0

    return max(0, resolved)


def scrub_live_json() -> tuple[int, int, int]:
    data = json.loads(LIVE.read_text(encoding="utf-8"))
    key = "items" if "items" in data else "jobs"
    rows = data[key]
    changed = 0
    for row in rows:
        old = int(row.get("vacancies") or 0)
        new = resolve_row(row)
        if new != old:
            row["vacancies"] = new
            changed += 1
    LIVE.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    total = sum(int(r.get("vacancies") or 0) for r in rows)
    with_vac = sum(1 for r in rows if int(r.get("vacancies") or 0) > 0)
    return changed, total, with_vac


async def scrub_database(*, apply: bool) -> int:
    from sqlalchemy import select

    from app.database.session import SessionLocal
    from app.models.job import Job

    changed = 0
    async with SessionLocal() as session:
        rows = (
            await session.execute(select(Job).where(Job.status.in_(("live", "expired"))))
        ).scalars().all()
        for job in rows:
            detail = job.detail if isinstance(job.detail, dict) else {}
            row = {
                "title": job.title or "",
                "slug": job.slug or "",
                "vacancies": int(job.vacancies or 0),
                "salary": job.salary or "",
                "detail": detail,
                "posts": detail.get("posts") if isinstance(detail.get("posts"), list) else [],
            }
            new = resolve_row(row)
            old = int(job.vacancies or 0)
            if new == old:
                continue
            changed += 1
            if apply:
                job.vacancies = new
        if apply and changed:
            await session.commit()
    return changed


def run_clean_live_jobs() -> None:
    subprocess.run(
        ["node", "scripts/run-python.mjs", "scripts/clean-live-jobs-json.py"],
        cwd=ROOT,
        check=False,
    )
    subprocess.run(["node", "scripts/build-live-jobs-list.mjs"], cwd=ROOT, check=False)
    subprocess.run(["node", "scripts/build-live-jobs-bootstrap.mjs"], cwd=ROOT, check=False)


async def main_async() -> int:
    parser = argparse.ArgumentParser(description="Scrub vacancy counts in JSON and/or DB")
    parser.add_argument("--apply", action="store_true", help="Write corrected vacancies to Supabase")
    parser.add_argument(
        "--export",
        action="store_true",
        help="After DB apply, re-export live-jobs.json then scrub+clean list/bootstrap",
    )
    parser.add_argument(
        "--json-only",
        action="store_true",
        help="Only scrub frontend/public/data/live-jobs.json (default when no --apply)",
    )
    args = parser.parse_args()

    if args.apply:
        changed_db = await scrub_database(apply=True)
        print(f"scrub-vacancy-counts: DB updated {changed_db} rows", flush=True)
        if args.export:
            from app.database.session import SessionLocal
            from app.services.job_persist_service import JobPersistService

            async with SessionLocal() as session:
                count = await JobPersistService().export_live_jobs_json(session)
            print(f"Exported {count} jobs to live-jobs.json", flush=True)

    changed, total, with_vac = scrub_live_json()
    print(f"scrub-vacancy-counts: JSON updated {changed} rows", flush=True)
    print(f"  total vacancies sum: {total:,} | jobs with vac>0: {with_vac}", flush=True)

    if args.apply or args.export or not args.json_only:
        run_clean_live_jobs()
        print("scrub-vacancy-counts: rebuilt list + bootstrap", flush=True)

    return 0


def main() -> None:
    raise SystemExit(asyncio.run(main_async()))


if __name__ == "__main__":
    main()
