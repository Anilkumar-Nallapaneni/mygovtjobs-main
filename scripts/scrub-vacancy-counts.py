#!/usr/bin/env python3
"""Re-resolve vacancy counts in live-jobs.json (pincode/salary false positives)."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LIVE = ROOT / "frontend" / "public" / "data" / "live-jobs.json"

import sys

sys.path.insert(0, str(ROOT / "backend"))

from app.utils.vacancy_extract import extract_vacancies, resolve_vacancies

RECRUIT_POSTS_RE = re.compile(r"\b\d{1,5}\s*(?:posts?|vacanc)", re.I)


def posts_sum(row: dict) -> int:
    posts = row.get("posts") or []
    if not isinstance(posts, list):
        return 0
    return sum(int(p.get("vacancies") or 0) for p in posts if isinstance(p, dict))


def resolve_row(row: dict) -> int:
    title = str(row.get("title") or "")
    detail = row.get("detail") if isinstance(row.get("detail"), dict) else {}
    summary = str(detail.get("summary") or "")
    salary = str(row.get("salary") or "")
    context = " ".join(filter(None, [summary, salary])).strip()
    stored = int(row.get("vacancies") or 0)
    psum = posts_sum(row)

    resolved = resolve_vacancies(stored, title, context, posts_sum=psum)

    # Administrative circulars / liaison — not mass recruitment
    if resolved > 100 and psum == 0 and not RECRUIT_POSTS_RE.search(title):
        title_only = extract_vacancies(title, title=title)
        if title_only > 0:
            resolved = title_only
        elif resolved > 500:
            resolved = 0

    return max(0, resolved)


def main() -> None:
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
    print(f"scrub-vacancy-counts: updated {changed} rows")
    print(f"  total vacancies sum: {total:,} | jobs with vac>0: {with_vac}")


if __name__ == "__main__":
    main()
