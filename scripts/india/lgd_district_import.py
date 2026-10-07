"""Read-only LGD planning and guarded, transactional imports (explicit --apply only)."""
from __future__ import annotations

import json
import re
from datetime import date

from sqlalchemy import text

from normalize_lgd_districts import SOURCE, SOURCE_URL, canonical_state_ids


def district_slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def provenance(row: dict) -> dict:
    return {key: row[key] for key in ("source", "source_provider", "source_download_date",
                                    "source_filename", "source_sha256", "state_name")}


def district_values(row: dict, source_id) -> dict:
    return {"state_id": row["state_id"], "name": row["district_name"],
            "slug": district_slug(row["district_name"]), "source_id": source_id,
            "source_record_id": row["district_lgd_code"], "source_url": SOURCE_URL,
            "verification_status": "verified", "lgd_district_code": row["district_lgd_code"],
            "lgd_state_code": row["state_lgd_code"], "census_2001_code": row["census_2001_code"],
            "census_2011_code": row["census_2011_code"], "lgd_provenance": provenance(row)}


def plan_district_import(rows: list[dict], existing: list[dict], source_id) -> dict:
    """Match authoritative identity; never silently adopt unrelated verified records."""
    by_code, by_name, by_slug = {}, {}, {}
    for item in existing:
        code = item.get("lgd_district_code")
        if not code and item.get("source_name") == SOURCE:
            code = item.get("source_record_id")
        if code:
            if code in by_code:
                raise ValueError(f"Database contains duplicate LGD code: {code}")
            by_code[code] = item
        by_name[(item["state_id"], item["name"])] = item
        if item.get("slug"):
            by_slug[(item["state_id"], item["slug"])] = item
    actions, conflicts = [], []
    for row in rows:
        code = row["district_lgd_code"]
        values = district_values(row, source_id)
        current = by_code.get(code)
        named = by_name.get((row["state_id"], row["district_name"]))
        slugged = by_slug.get((row["state_id"], values["slug"]))
        if current is None:
            current = named
        if any(item is not None and (current is None or item["id"] != current["id"])
               for item in (named, slugged)):
            conflicts.append({"district_lgd_code": code, "reason": "Existing name/slug belongs to another district"})
            continue
        if current is None:
            actions.append({"action": "insert", "values": values})
            continue
        current_code = current.get("lgd_district_code") or current.get("source_record_id")
        lgd_owned = current.get("source_name") == SOURCE
        unclaimed = current.get("verification_status") == "pending" and current.get("source_id") is None and not current_code
        if (current_code and current_code != code) or not (lgd_owned or unclaimed):
            conflicts.append({"district_lgd_code": code, "id": str(current["id"]),
                              "reason": "Existing record has another identity/source or is already independently verified"})
            continue
        old_provenance = current.get("lgd_provenance") or {}
        old_date = old_provenance.get("source_download_date")
        if old_date and date.fromisoformat(old_date) > date.fromisoformat(row["source_download_date"]):
            conflicts.append({"district_lgd_code": code, "reason": "Refusing to replace a newer LGD snapshot"})
            continue
        unchanged = all(str(current.get(key)) == str(value) if key == "source_id"
                        else current.get(key) == value for key, value in values.items())
        actions.append({"action": "unchanged" if unchanged else "update", "id": str(current["id"]),
                        "attach": not current.get("lgd_district_code"), "values": values})
    return {"actions": actions, "conflicts": conflicts,
            "prospective_inserts": sum(item["action"] == "insert" for item in actions),
            "prospective_updates": sum(item["action"] == "update" for item in actions),
            "prospective_unchanged": sum(item["action"] == "unchanged" for item in actions)}


UPSERT = """
INSERT INTO public.india_districts AS d
  (state_id,name,slug,source_id,source_record_id,source_url,verification_status,verified_at,
   lgd_district_code,lgd_state_code,census_2001_code,census_2011_code,lgd_provenance)
VALUES
  (:state_id,:name,:slug,:source_id,:source_record_id,:source_url,'verified',NOW(),
   :lgd_district_code,:lgd_state_code,:census_2001_code,:census_2011_code,CAST(:lgd_provenance AS jsonb))
ON CONFLICT (lgd_district_code) DO UPDATE SET
  state_id=EXCLUDED.state_id, name=EXCLUDED.name, slug=EXCLUDED.slug,
  source_id=EXCLUDED.source_id, source_record_id=EXCLUDED.source_record_id,
  source_url=EXCLUDED.source_url, verification_status='verified', verified_at=NOW(),
  lgd_state_code=EXCLUDED.lgd_state_code, census_2001_code=EXCLUDED.census_2001_code,
  census_2011_code=EXCLUDED.census_2011_code, lgd_provenance=EXCLUDED.lgd_provenance, updated_at=NOW()
WHERE d.source_id=EXCLUDED.source_id
  AND COALESCE(d.lgd_provenance->>'source_download_date','') <= EXCLUDED.lgd_provenance->>'source_download_date'
RETURNING id
"""


async def execute_plan(session, plan: dict, rows: list[dict], metadata: dict):
    """Called only after all conflicts are checked and a write lock is held."""
    if plan["conflicts"]:
        raise ValueError("LGD import has conflicts; review the dry-run report")
    await session.execute(text("""
        INSERT INTO public.india_lgd_district_snapshots(sha256,metadata,records)
        VALUES (:sha256,CAST(:metadata AS jsonb),CAST(:records AS jsonb))
        ON CONFLICT (sha256) DO NOTHING
    """), {"sha256": metadata["sha256"], "metadata": json.dumps(metadata), "records": json.dumps(rows)})
    for action in plan["actions"]:
        if action["action"] == "unchanged":
            continue
        values = {**action["values"], "lgd_provenance": json.dumps(action["values"]["lgd_provenance"])}
        if action.get("attach"):
            # Keep the original UUID and all dependent city/place foreign keys.
            result = await session.execute(text("""
                UPDATE public.india_districts SET lgd_district_code=:lgd_district_code, source_id=:source_id
                WHERE id::text=:id AND lgd_district_code IS NULL
                  AND (source_id=:source_id OR (source_id IS NULL AND verification_status='pending'))
                RETURNING id
            """), {**values, "id": action["id"]})
            if result.first() is None:
                raise ValueError("District identity changed during import; transaction aborted")
        result = await session.execute(text(UPSERT), values)
        if result.first() is None:
            raise ValueError("District provenance guard refused the UPSERT; transaction aborted")


async def run_database_plan(session, rows: list[dict], metadata: dict, apply: bool = False) -> dict:
    if not apply:
        # Not a rollback-based dry run: PostgreSQL itself forbids writes.
        await session.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"))
    else:
        await session.execute(text("LOCK TABLE public.india_districts IN SHARE ROW EXCLUSIVE MODE"))
    source = await session.execute(text("SELECT id FROM public.india_sources WHERE name=:name AND active=TRUE"), {"name": SOURCE})
    sid = source.scalar_one_or_none()
    if sid is None:
        raise ValueError("LGD source is missing/inactive; apply the reviewed India backend migrations first")
    states = await session.execute(text("SELECT id FROM public.india_states WHERE verification_status='verified'"))
    state_ids = set(states.scalars().all())
    if state_ids != canonical_state_ids():
        raise ValueError(f"Database verified state mapping mismatch: missing={sorted(canonical_state_ids() - state_ids)}, unknown={sorted(state_ids - canonical_state_ids())}")
    result = await session.execute(text("""
        SELECT to_jsonb(d) AS record, s.name AS source_name
        FROM public.india_districts d LEFT JOIN public.india_sources s ON s.id=d.source_id
    """))
    existing = [{**item["record"], "source_name": item["source_name"]} for item in result.mappings().all()]
    schema = await session.execute(text("""
        SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public'
          AND tablename='india_districts' AND indexname='uq_india_districts_lgd_code')
          AND to_regclass('public.india_lgd_district_snapshots') IS NOT NULL
          AND (SELECT count(*) FROM information_schema.columns WHERE table_schema='public'
            AND table_name='india_districts' AND column_name IN
            ('lgd_district_code','lgd_state_code','census_2001_code','census_2011_code','lgd_provenance'))=5
          AS migration_ready
    """))
    migration_ready = bool(schema.scalar_one())
    plan = plan_district_import(rows, existing, sid)
    report = {key: value for key, value in plan.items() if key != "actions"}
    report.update({"database_records_seen": len(existing), "migration_043_required": not migration_ready,
                   "database_writes": 0, "status": "FAIL" if plan["conflicts"] else "PASS",
                   "mode": "apply" if apply else "dry-run"})
    if apply:
        if not migration_ready:
            raise ValueError("Migration 043 is required before LGD import; no writes made")
        await execute_plan(session, plan, rows, metadata)
        await session.commit()
        report["database_writes"] = plan["prospective_inserts"] + plan["prospective_updates"]
        report["snapshot_write_attempted"] = True
    else:
        await session.rollback()
    return report
