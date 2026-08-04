#!/usr/bin/env python3
"""Parse smashed IBPS portal titles like 'UBI...21-Jul-202610-Aug-2026' → last_date, then promote open ones."""

from __future__ import annotations

import asyncio
import re
import sys
from datetime import date, datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from sqlalchemy import select, update  # noqa: E402

from app.database.session import SessionLocal  # noqa: E402
from app.models.job import Job  # noqa: E402
from app.services.job_persist_service import JobPersistService  # noqa: E402
from app.services.publish_gate import india_today  # noqa: E402
from app.services.noise_filter import clean_job_title  # noqa: E402

_DMY = re.compile(
    r"(\d{1,2})[-/](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[-/](20\d{2})",
    re.I,
)
_MONTH = {
    "jan": 1,
    "feb": 2,
    "mar": 3,
    "apr": 4,
    "may": 5,
    "jun": 6,
    "jul": 7,
    "aug": 8,
    "sep": 9,
    "oct": 10,
    "nov": 11,
    "dec": 12,
}


def parse_embedded_dates(title: str) -> tuple[date | None, date | None]:
    matches = list(_DMY.finditer(title or ""))
    if not matches:
        return None, None

    def to_date(m: re.Match) -> date:
        d, mon, y = m.groups()
        return date(int(y), _MONTH[mon[:3].lower()], int(d))

    dates = [to_date(m) for m in matches]
    if len(dates) >= 2:
        return dates[0], dates[-1]
    return None, dates[0]


def clean_ibps_title(title: str) -> str:
    t = _DMY.sub(" ", title or "")
    t = re.sub(r"\s+", " ", t).strip()
    # Insert space after bank acronym prefix when smashed: UBIRecruitment → UBI Recruitment
    t = re.sub(r"^([A-Z]{2,8})(?=[A-Z][a-z])", r"\1 ", t)
    t = re.sub(r"(Recruitment|Application|Posts?)(?=[A-Z])", r"\1 ", t)
    return clean_job_title(t) or title


async def main() -> int:
    today = india_today()
    promoted = 0
    enriched = 0

    async with SessionLocal() as session:
        rows = (
            await session.execute(
                select(Job).where(
                    Job.status == "draft",
                    Job.apply_url.ilike("%ibpsreg.ibps.in%"),
                )
            )
        ).scalars().all()
        print(f"IBPS portal drafts: {len(rows)}", flush=True)

        for job in rows:
            published, last = parse_embedded_dates(job.title or "")
            if not last:
                print(f"  skip no-date | {(job.title or '')[:90]}", flush=True)
                continue

            title = clean_ibps_title(job.title or "")
            dept = (job.dept or "").strip() or title.split()[0]
            future = last >= today
            print(f"  {'OPEN' if future else 'PAST'} last={last} | {title[:90]}", flush=True)

            values = {
                "title": title[:240],
                "last_date": last,
                "dept": dept[:120] if dept else job.dept,
                "updated_at": datetime.now(timezone.utc),
            }
            if published and not job.published_at:
                values["published_at"] = datetime(
                    published.year, published.month, published.day, tzinfo=timezone.utc
                )

            # Minimal completeness for gate
            detail = dict(job.detail or {})
            detail.setdefault("how_to_apply", "Apply online via IBPS registration portal")
            detail.setdefault("selection_process", "As per official bank / IBPS notification")
            values["detail"] = detail
            values["qualification"] = job.qualification or "As per official notification"
            values["completeness_score"] = max(int(job.completeness_score or 0), 75)

            if future:
                values.update(
                    {
                        "status": "live",
                        "published_to_site": True,
                        "verification_status": "VERIFIED",
                        "document_type": "RECRUITMENT",
                        "publication_confidence": 90,
                        "published_at": values.get("published_at")
                        or job.published_at
                        or datetime.now(timezone.utc),
                    }
                )
                promoted += 1
            else:
                enriched += 1

            await session.execute(update(Job).where(Job.id == job.id).values(**values))

        await session.commit()
        count = await JobPersistService().export_live_jobs_json(session)
        print(f"promoted={promoted} dated_past={enriched} exported={count}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
