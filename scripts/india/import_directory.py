#!/usr/bin/env python3
"""Import verified/source-attributed India Explorer records into Supabase/Postgres.

Default is dry-run. Use --apply only after validating the source file.
Supported CSV datasets: districts, cities, places, agriculture, industries, facts.
"""
from __future__ import annotations

import argparse
import csv
import re
from datetime import datetime, timezone
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]

# Allow scripts/india/*.py to import the backend package when launched from npm.
BACKEND_ROOT = PROJECT_ROOT / "backend"
import sys
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from sqlalchemy import text
from app.database.session import SessionLocal

ROOT = PROJECT_ROOT
DATASETS = {"districts", "cities", "places", "agriculture", "industries", "facts"}
PLACE_CATEGORIES = {
    "school", "college", "university", "company", "industry", "tourism", "temple", "heritage",
    "hotel", "hospital", "airport", "railway", "transport", "government_office"
}
REQUIRED_COLUMNS = {
    "districts": {"state_id", "name"},
    "cities": {"state_id", "name"},
    "places": {"state_id", "name", "category"},
    "agriculture": {"state_id", "crop"},
    "industries": {"state_id", "industry"},
    "facts": {"state_id", "title", "body"},
}


def slug(value: str) -> str:
    value = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return value


def required(row: dict, *keys: str) -> str:
    for key in keys:
        value = (row.get(key) or "").strip()
        if value:
            return value
    raise ValueError(f"Missing required column/value: {' or '.join(keys)}")


def read_csv_rows(dataset: str, csv_path: Path) -> list[dict[str, str]]:
    if dataset not in DATASETS:
        raise ValueError(f"Unsupported dataset {dataset}")
    resolved_path = csv_path if csv_path.is_absolute() else ROOT / csv_path
    with resolved_path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        if not reader.fieldnames:
            raise ValueError(f"{dataset} CSV is empty or contains only a template/header row")
        headers = set(reader.fieldnames or [])
        missing = sorted(REQUIRED_COLUMNS[dataset] - headers)
        if missing:
            raise ValueError(f"Missing required CSV columns for {dataset}: {', '.join(missing)}")
        rows = list(reader)
    if not rows:
        raise ValueError(f"{dataset} CSV is empty or contains only a template/header row")
    return rows


async def source_id(session, source_name: str | None):
    if not source_name:
        return None
    result = await session.execute(text("SELECT id FROM india_sources WHERE name=:name"), {"name": source_name})
    row = result.first()
    if not row:
        raise ValueError(f"Unknown source: {source_name}. Add it to india_sources first.")
    return row[0]


async def import_rows(dataset: str, csv_path: Path, apply: bool, source_name: str | None):
    rows = read_csv_rows(dataset, csv_path)

    async with SessionLocal() as session:
        sid = await source_id(session, source_name)
        run = await session.execute(text("""
          INSERT INTO india_import_runs(source_id,dataset,status,records_seen)
          VALUES (:source_id,:dataset,'started',:seen) RETURNING id
        """), {"source_id": sid, "dataset": dataset, "seen": len(rows)})
        run_id = run.scalar_one()
        inserted = rejected = 0
        try:
            for row in rows:
                try:
                    if dataset == "districts":
                        state_id = required(row, "state_id")
                        name = required(row, "name")
                        await session.execute(text("""
                          INSERT INTO india_districts(state_id,name,slug,source_id,source_record_id,source_url,verification_status,verified_at)
                          VALUES (:state_id,:name,:slug,:source_id,:source_record_id,:source_url,'verified',NOW())
                          ON CONFLICT(state_id,name) DO UPDATE SET slug=EXCLUDED.slug, source_id=EXCLUDED.source_id,
                            source_record_id=EXCLUDED.source_record_id, source_url=EXCLUDED.source_url,
                            verification_status='verified', verified_at=NOW(), updated_at=NOW()
                        """), {"state_id": state_id, "name": name, "slug": slug(name), "source_id": sid,
                               "source_record_id": row.get("source_record_id"), "source_url": row.get("source_url")})
                    elif dataset == "cities":
                        state_id = required(row, "state_id")
                        name = required(row, "name")
                        await session.execute(text("""
                          INSERT INTO india_cities(state_id,district_id,name,slug,source_id,source_record_id,source_url,verification_status,verified_at)
                          VALUES (:state_id,NULL,:name,:slug,:source_id,:source_record_id,:source_url,'verified',NOW())
                          ON CONFLICT(state_id,name) DO UPDATE SET slug=EXCLUDED.slug, source_id=EXCLUDED.source_id,
                            source_record_id=EXCLUDED.source_record_id, source_url=EXCLUDED.source_url,
                            verification_status='verified', verified_at=NOW(), updated_at=NOW()
                        """), {"state_id": state_id, "name": name, "slug": slug(name), "source_id": sid,
                               "source_record_id": row.get("source_record_id"), "source_url": row.get("source_url")})
                    elif dataset == "places":
                        state_id = required(row, "state_id")
                        name = required(row, "name")
                        category = required(row, "category").lower()
                        if category not in PLACE_CATEGORIES:
                            raise ValueError(f"Unsupported place category: {category}")
                        await session.execute(text("""
                          INSERT INTO india_places(state_id,district_id,city_id,category,name,description,website,address,metadata,source_id,source_record_id,source_name,source_url,verification_status,verified_at)
                          VALUES (:state_id,NULL,NULL,:category,:name,:description,:website,:address,CAST(:metadata AS jsonb),:source_id,:source_record_id,:source_name,:source_url,'verified',NOW())
                        """), {"state_id": state_id, "category": category, "name": name,
                               "description": row.get("description"), "website": row.get("website"), "address": row.get("address"),
                               "metadata": row.get("metadata") or "{}", "source_id": sid, "source_record_id": row.get("source_record_id"),
                               "source_name": source_name, "source_url": row.get("source_url")})
                    elif dataset == "agriculture":
                        state_id = required(row, "state_id")
                        crop = required(row, "crop")
                        await session.execute(text("""
                          INSERT INTO india_agriculture(state_id,crop,crop_type,season,area_hectares,production_tonnes,source_id,source_name,source_url,verified_at)
                          VALUES (:state_id,:crop,:crop_type,:season,NULLIF(:area,'')::numeric,NULLIF(:production,'')::numeric,:source_id,:source_name,:source_url,NOW())
                        """), {"state_id": state_id, "crop": crop, "crop_type": row.get("crop_type"), "season": row.get("season"),
                               "area": row.get("area_hectares"), "production": row.get("production_tonnes"), "source_id": sid,
                               "source_name": source_name, "source_url": row.get("source_url")})
                    elif dataset == "industries":
                        state_id = required(row, "state_id")
                        industry = required(row, "industry")
                        await session.execute(text("""
                          INSERT INTO india_industries(state_id,industry,description,source_id,source_name,source_url,verified_at)
                          SELECT :state_id,:industry,:description,:source_id,:source_name,:source_url,NOW()
                          WHERE NOT EXISTS (SELECT 1 FROM india_industries WHERE state_id=:state_id AND district_id IS NULL AND industry=:industry)
                        """), {"state_id": state_id, "industry": industry, "description": row.get("description"), "source_id": sid,
                               "source_name": source_name, "source_url": row.get("source_url")})
                    else:
                        state_id = required(row, "state_id")
                        title = required(row, "title")
                        body = required(row, "body")
                        await session.execute(text("""
                          INSERT INTO india_facts(state_id,fact_type,title,body,source_id,source_name,source_url,verification_status,verified_at)
                          VALUES (:state_id,:fact_type,:title,:body,:source_id,:source_name,:source_url,'verified',NOW())
                        """), {"state_id": state_id, "fact_type": row.get("fact_type") or "general", "title": title, "body": body,
                               "source_id": sid, "source_name": source_name, "source_url": row.get("source_url")})
                    inserted += 1
                except Exception as exc:
                    rejected += 1
                    print(f"REJECTED row {inserted + rejected}: {exc}")
                    if apply:
                        raise
            if apply:
                await session.execute(text("""
                  UPDATE india_import_runs SET status=:status, records_inserted=:inserted,
                    records_rejected=:rejected, completed_at=:completed_at WHERE id=:id
                """), {"status": "completed" if rejected == 0 else "partial", "inserted": inserted,
                       "rejected": rejected, "completed_at": datetime.now(timezone.utc), "id": run_id})
                await session.commit()
            else:
                await session.rollback()
                print("DRY RUN: no database changes committed.")
        except Exception as exc:
            await session.rollback()
            print(f"IMPORT FAILED: {exc}")
            raise
    print(f"Dataset={dataset} seen={len(rows)} accepted={inserted} rejected={rejected} apply={apply}")


async def sync_existing_colleges(apply: bool):
    async with SessionLocal() as session:
        source = await source_id(session, "LiveGovtJobs verified education dataset")
        rows = (await session.execute(text("""
          SELECT id,name,city,state,website,official_website,verified,last_verified_at
          FROM public.education_colleges
          WHERE is_published=TRUE AND verified=TRUE
          ORDER BY state,name
        """))).fetchall()
        print(f"Found {len(rows)} verified published education colleges.")
        if not apply:
            print("DRY RUN: no database changes committed.")
            return
        for row in rows:
            state_result = await session.execute(text("SELECT id FROM india_states WHERE lower(name)=lower(:state) OR lower(name) LIKE lower(:state_like) LIMIT 1"),
                                                 {"state": row.state or "", "state_like": f"%{row.state or ''}%"})
            state = state_result.first()
            if not state:
                continue
            await session.execute(text("""
              INSERT INTO india_places(state_id,category,name,website,address,source_id,source_record_id,source_name,source_url,verification_status,verified_at)
              VALUES (:state_id,'college',:name,:website,:city,:source_id,:source_record_id,:source_name,:source_url,'verified',COALESCE(:verified_at,NOW()))
            """), {"state_id": state[0], "name": row.name, "website": row.official_website or row.website, "city": row.city,
                   "source_id": source, "source_record_id": str(row.id), "source_name": "LiveGovtJobs Education Platform",
                   "source_url": row.official_website or row.website, "verified_at": row.last_verified_at})
        await session.commit()
        print("Education college sync completed.")


async def main():
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="command", required=True)
    imp = sub.add_parser("csv")
    imp.add_argument("dataset", choices=sorted(DATASETS))
    imp.add_argument("csv_path", type=Path)
    imp.add_argument("--source", required=True)
    imp.add_argument("--apply", action="store_true")
    edu = sub.add_parser("education-colleges")
    edu.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    if args.command == "csv":
        await import_rows(args.dataset, args.csv_path, args.apply, args.source)
    else:
        await sync_existing_colleges(args.apply)


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
