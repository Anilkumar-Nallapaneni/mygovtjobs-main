"""Production evidence only: PostgreSQL enforces a read-only transaction."""
from __future__ import annotations
import asyncio
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from sqlalchemy import text

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
from app.database.session import SessionLocal


async def main():
    report = {"generated_at": datetime.now(timezone.utc).isoformat(), "database_writes": 0}
    queries = {
        "job_status": "SELECT status, count(*) AS count FROM jobs GROUP BY status ORDER BY count DESC",
        "job_completeness": """SELECT count(*) AS total,
          count(*) FILTER (WHERE last_date IS NULL) AS missing_deadline,
          count(*) FILTER (WHERE NULLIF(primary_pdf_url,'') IS NULL AND NULLIF(detail->>'pdf_url','') IS NULL) AS missing_pdf_candidates,
          count(*) FILTER (WHERE NULLIF(source_url,'') IS NULL AND NULLIF(apply_url,'') IS NULL) AS missing_source_and_apply,
          count(*) FILTER (WHERE verified_at IS NULL) AS missing_verified_at,
          count(*) FILTER (WHERE completeness_score < 70) AS below_completeness_70
          FROM jobs""",
        "live_coverage": "SELECT state_codes, dept, count(*) AS count FROM jobs WHERE status='live' GROUP BY state_codes,dept ORDER BY count DESC",
        "source_yield": "SELECT s.code, count(j.id) AS stored, count(j.id) FILTER (WHERE j.status='live') AS live FROM sources s LEFT JOIN jobs j ON j.source_id=s.id GROUP BY s.code ORDER BY stored DESC",
        "review_queue": "SELECT status,count(*) AS count FROM job_review_queue GROUP BY status",
        "district_identity": """SELECT count(*) AS total, count(DISTINCT lgd_district_code) AS unique_lgd_codes,
          count(DISTINCT state_id) AS state_count,
          count(*) FILTER (WHERE verification_status='verified') AS verified,
          count(*) FILTER (WHERE lgd_provenance->>'source_sha256'='387ce8805f54b68baaeda1dbc40751927e8eb981f2b48548ffeaf833a6881d68') AS matching_source_hash
          FROM india_districts""",
        "lgd_snapshots": "SELECT sha256,jsonb_array_length(records) AS record_count, imported_at FROM india_lgd_district_snapshots",
        "migration_043_history": "SELECT filename FROM schema_migrations WHERE filename LIKE '%043%'",
        "rls": "SELECT relname,relrowsecurity FROM pg_class WHERE relnamespace='public'::regnamespace AND relname IN ('jobs','sources','india_states','india_districts','india_cities','india_places','india_lgd_district_snapshots','job_review_queue') ORDER BY relname",
        "public_policies": "SELECT tablename,policyname,roles,cmd,qual FROM pg_policies WHERE schemaname='public' AND tablename IN ('jobs','sources','india_districts','india_states','india_lgd_district_snapshots','job_review_queue') ORDER BY tablename,policyname",
        "private_table_grants": "SELECT table_name,grantee,privilege_type FROM information_schema.role_table_grants WHERE table_schema='public' AND table_name IN ('india_lgd_district_snapshots','job_review_queue') AND grantee IN ('anon','authenticated')",
    }
    async with SessionLocal() as session:
        await session.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"))
        for name, query in queries.items():
            # Nested savepoints isolate an absent optional history table without writes to data.
            try:
                async with session.begin_nested():
                    report[name] = [dict(row) for row in (await session.execute(text(query))).mappings()]
            except Exception as exc:
                report[name] = {"unavailable": type(exc).__name__}
        await session.rollback()
    path = ROOT / "docs/audits/production-readonly-2026-10-07.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(report, indent=2, default=str), encoding="utf-8")
    print(json.dumps({k: v for k, v in report.items() if k not in {"source_yield", "public_policies"}}, indent=2, default=str))
    print(f"Evidence: {path}")


if __name__ == "__main__":
    asyncio.run(main())
