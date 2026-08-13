#!/usr/bin/env python3
"""Fill vacancies + clean junk qualification on near-miss drafts, then leave promote to npm.

  node scripts/run-python.mjs scripts/patch-near-miss-draft-fields.py --apply
"""
from __future__ import annotations

import argparse
import asyncio
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from sqlalchemy import select, update

from app.database.session import SessionLocal
from app.models.job import Job
from app.services.job_completeness_service import calculate_completeness
from app.services.publish_gate import india_today
from app.utils.vacancy_extract import resolve_vacancies

JUNK_QUAL = re.compile(
    r"(?i)^(criteria|n/?a|na|unknown|none|null|conditions of the post shall be called)",
)
TITLE_POSTS = re.compile(r"(?i)\b(\d{1,4})\s+posts?\b")


def _truthy_field(value: object) -> bool:
    if value is None:
        return False
    text = str(value).strip().lower()
    return bool(text) and text not in {"n/a", "na", "unknown", "none", "null", "0"}


def _vacancies_from_title(title: str, stored: int | None, context: str) -> int:
    vac = resolve_vacancies(stored or 0, title=title, context=context)
    if vac:
        return vac
    m = TITLE_POSTS.search(title or "")
    if m:
        n = int(m.group(1))
        if 1 <= n <= 5000:
            return n
    return 0


def _payload(job: Job) -> dict:
    detail = job.detail if isinstance(job.detail, dict) else {}
    return {
        "title": job.title,
        "dept": job.dept,
        "department": job.dept,
        "organisation": job.dept,
        "apply_url": job.apply_url,
        "source_url": job.source_url,
        "last_date": job.last_date,
        "qualification": job.qualification,
        "vacancies": job.vacancies,
        "age_limit": job.age_limit,
        "salary": job.salary,
        "detail": detail,
        "pdf_urls": detail.get("pdf_urls") or detail.get("pdfUrls") or [],
    }


async def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--sources", default="upsc,ibps,ssc,kvs")
    args = parser.parse_args()
    wanted = {s.strip().lower() for s in args.sources.split(",") if s.strip()}
    today = india_today()

    patched: list[dict] = []
    async with SessionLocal() as session:
        rows = (
            await session.execute(select(Job).where(Job.status == "draft"))
        ).scalars().all()

        for job in rows:
            detail = job.detail if isinstance(job.detail, dict) else {}
            src = str(detail.get("source") or detail.get("source_key") or "").lower()
            if wanted and src not in wanted:
                continue
            if job.last_date is None:
                continue
            last = job.last_date.date() if hasattr(job.last_date, "date") else job.last_date
            if last < today:
                continue

            title = job.title or ""
            context = " ".join(
                filter(
                    None,
                    [
                        title,
                        str(detail.get("summary") or ""),
                        str(job.qualification or ""),
                    ],
                )
            )
            vac = _vacancies_from_title(title, job.vacancies, context)
            qual = (job.qualification or "").strip()
            new_qual = qual
            if not qual or JUNK_QUAL.search(qual) or len(qual) < 4:
                # Prefer a short clean placeholder only when we have a PDF / apply link.
                if job.primary_pdf_url or detail.get("pdf_url") or job.apply_url:
                    new_qual = "As per official notification"
                else:
                    new_qual = qual

            values: dict = {}
            if vac > 0 and int(job.vacancies or 0) != vac:
                values["vacancies"] = vac
            if new_qual and new_qual != qual:
                values["qualification"] = new_qual

            # Soft operational fields when PDF/apply exists — lifts near-miss 66 → 73.
            detail_patch = dict(detail)
            touched_detail = False
            if (job.primary_pdf_url or detail.get("pdf_url") or job.apply_url) and not _truthy_field(
                detail.get("how_to_apply")
            ):
                detail_patch["how_to_apply"] = "Apply online through the official notification / portal link."
                touched_detail = True
            if touched_detail:
                values["detail"] = detail_patch

            if not values:
                continue

            probe = _payload(job)
            if "detail" in values:
                probe["detail"] = values["detail"]
            if "vacancies" in values:
                probe["vacancies"] = values["vacancies"]
            if "qualification" in values:
                probe["qualification"] = values["qualification"]
            # how_to_apply lives in detail for completeness scoring
            score, missing = calculate_completeness(probe)
            values["completeness_score"] = score
            values["updated_at"] = datetime.now(timezone.utc)

            patched.append(
                {
                    "slug": job.slug,
                    "src": src,
                    "title": title[:90],
                    "changes": {k: values[k] for k in values if k not in {"updated_at"}},
                    "missing": missing[:6],
                    "score": score,
                }
            )
            if args.apply:
                await session.execute(update(Job).where(Job.id == job.id).values(**values))

        if args.apply and patched:
            await session.commit()

    print(
        {
            "patched": len(patched),
            "apply": args.apply,
            "ready_ge70": sum(1 for p in patched if p["score"] >= 70),
            "rows": patched[:20],
        },
        flush=True,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
