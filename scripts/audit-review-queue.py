#!/usr/bin/env python3
"""Read-only P0 audit of the private review queue and publication funnel."""
from __future__ import annotations
import asyncio, json, sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from sqlalchemy import select, func

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'backend'))
from app.database.session import SessionLocal
from app.models.job import Job, JobReviewQueue


def items(v):
    if isinstance(v, list): return [str(x).strip() for x in v if str(x).strip()]
    if v: return [str(v).strip()]
    return []

async def main():
    report = {'generated_at': datetime.now(timezone.utc).isoformat()}
    async with SessionLocal() as s:
        qrows = (await s.execute(select(JobReviewQueue))).scalars().all()
        jobs = (await s.execute(select(Job))).scalars().all()
    status = Counter(str(r.status or 'unknown') for r in qrows)
    errors, warnings = Counter(), Counter()
    bands = Counter()
    sources = Counter()
    for r in qrows:
        c=float(r.confidence or 0)
        bands['90-100' if c>=90 else '85-89' if c>=85 else '80-84' if c>=80 else '60-79' if c>=60 else '<60'] += 1
        for e in items(r.validation_errors): errors[e] += 1
        for w in items(r.validation_warnings): warnings[w] += 1
        p=r.normalized_payload if isinstance(r.normalized_payload,dict) else r.raw_payload if isinstance(r.raw_payload,dict) else {}
        src=str(p.get('source_code') or p.get('source') or p.get('dept') or 'unknown')[:120]
        sources[src]+=1
    job_status=Counter(str(j.status or 'unknown') for j in jobs)
    report.update({
      'review_queue_total':len(qrows), 'review_queue_status':dict(status), 'confidence_bands':dict(bands),
      'top_validation_errors':errors.most_common(30), 'top_validation_warnings':warnings.most_common(20),
      'top_queue_sources':sources.most_common(30), 'jobs_total':len(jobs), 'job_status':dict(job_status),
      'live_jobs':job_status.get('live',0), 'draft_pending_jobs':job_status.get('draft',0)+job_status.get('pending',0)
    })
    out=ROOT/'docs'/'audits'/'p0-review-queue-latest.json'; out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf-8')
    print('\n=== P0 REVIEW QUEUE AUDIT (READ ONLY) ===')
    print(f"review queue: {len(qrows)} | statuses: {dict(status)}")
    print(f"confidence: {dict(bands)}")
    print(f"jobs: {len(jobs)} | statuses: {dict(job_status)}")
    print('\nTop validation errors:')
    for k,v in errors.most_common(15): print(f"  {v:>5}  {k}")
    print('\nTop queue sources:')
    for k,v in sources.most_common(15): print(f"  {v:>5}  {k}")
    print(f"\nWrote {out}")

if __name__=='__main__': asyncio.run(main())
