#!/usr/bin/env python3
"""Patch live-job vacancy totals from official notification PDFs."""
from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from sqlalchemy import select, update  # noqa: E402

from app.database.session import SessionLocal  # noqa: E402
from app.models.job import Job  # noqa: E402
from app.services.job_persist_service import JobPersistService  # noqa: E402

# Official notice totals (not aggregators).
PATCHES: dict[str, int] = {
    # SSC JE Notice: "Tentative Vacancies: 1748"
    "staff-selection-commission-ssc-notice-of-junior-engineer-examination-2026-2026-h-adfb1951": 1748,
    # SSC CHSL Notice: "approx. 2536 tentative vacancies"
    "staff-selection-commission-ssc-notice-of-combined-higher-secondary-10-2-level-ex-9b90b9f2": 2536,
    # SSC SI CAPF Notice tables: DP Male 205 + DP Female 112 + CAPF GD 1320 + CISF Fire 234
    "staff-selection-commission-ssc-notice-of-sub-inspector-in-delhi-police-and-centr-e6402946": 1871,
    # IBPS CRP-RRBs-XV Annexure I (reported banks): Office Assistants category totals
    "institute-of-banking-personnel-selection-ibps-ibps-crp-rrbs-xv-recruitment-of-of-84e1f763": 8183,
    # IBPS CRP-RRBs-XV Annexure I: Scale I 4188 + Scale II streams 1047 + Scale III 275
    "institute-of-banking-personnel-selection-ibps-ibps-crp-rrbs-xv-recruitment-of-of-92e88be2": 5510,
    # RCF Advt 16022026 post-wise advertised totals
    "rashtriya-chemicals-and-fertilizers-limited-rcf-rcf-management-trainee-in-variou-a4db524e": 95,
    # MECL Advt 03/Rectt./2026 post-wise advertised totals
    "mineral-exploration-and-consultancy-limited-mecl-mecl-non-executive-posts-techni-699116e9": 121,
    # ISRO SAC:02:2026 post-code position counts 3+7+5+10+2+4+2+6+1+1+1+1+1+1+2+1
    "isro-indian-space-research-organisation-inviting-online-applications-for-the-pos-8298a71c": 48,
}


async def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--export", action="store_true")
    args = ap.parse_args()
    async with SessionLocal() as session:
        rows = (
            await session.execute(select(Job).where(Job.slug.in_(tuple(PATCHES))))
        ).scalars().all()
        print(f"matched={len(rows)} expected={len(PATCHES)}", flush=True)
        for job in rows:
            new = PATCHES[job.slug]
            print(
                f"  {job.vacancies} -> {new} | {(job.title or '')[:72]}",
                flush=True,
            )
            if args.apply:
                await session.execute(
                    update(Job).where(Job.id == job.id).values(vacancies=new)
                )
        missing = set(PATCHES) - {r.slug for r in rows}
        for slug in missing:
            print(f"MISSING slug={slug}", flush=True)
        if args.apply:
            await session.commit()
            if args.export:
                count = await JobPersistService().export_live_jobs_json(session)
                print(f"exported={count}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
