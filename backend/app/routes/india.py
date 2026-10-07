from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import text

from app.database.session import SessionLocal
from app.services.job_service import JobService

router = APIRouter()

CATEGORIES = {
    "school", "college", "university", "company", "industry", "tourism", "temple",
    "heritage", "hotel", "hospital", "airport", "railway", "transport", "government_office",
    "agriculture", "industries", "jobs", "education", "companies", "tourism", "temples",
    "hotels", "hospitals", "schemes", "gk"
}

CATEGORY_GROUPS = {
    "education": ("school", "college", "university"),
    "companies": ("company", "industry"),
    "temples": ("temple", "heritage"),
    "hotels": ("hotel",),
    "hospitals": ("hospital",),
    "transport": ("airport", "railway", "transport"),
}

# to_jsonb keeps the existing API available before additive migration 043 is applied.
DISTRICT_PROVENANCE_SQL = """
    d.source_record_id,
    (SELECT name FROM india_sources WHERE id=d.source_id) AS source_name,
    to_jsonb(d)->>'lgd_district_code' AS lgd_district_code,
    to_jsonb(d)->>'lgd_state_code' AS lgd_state_code,
    to_jsonb(d)->'lgd_provenance' AS provenance
"""



def _state_id(value: str) -> str:
    value = value.strip().lower()
    if not value or len(value) > 8 or not value.replace('-', '').isalnum():
        raise HTTPException(400, "Invalid state id")
    return value


@router.get("/overview")
async def india_overview():
    async with SessionLocal() as session:
        result = await session.execute(text("""
            SELECT
              (SELECT count(*) FROM india_states WHERE verification_status='verified')::int AS states,
              (SELECT count(*) FROM india_districts WHERE verification_status='verified')::int AS districts,
              (SELECT count(*) FROM india_cities WHERE verification_status='verified')::int AS cities,
              (SELECT count(*) FROM india_places WHERE verification_status='verified')::int AS places,
              (SELECT count(*) FROM india_places WHERE verification_status='verified' AND category='school')::int AS schools,
              (SELECT count(*) FROM india_places WHERE verification_status='verified' AND category='college')::int AS colleges,
              (SELECT count(*) FROM india_places WHERE verification_status='verified' AND category='university')::int AS universities,
              (SELECT count(*) FROM india_places WHERE verification_status='verified' AND category='hospital')::int AS hospitals,
              (SELECT count(*) FROM india_places WHERE verification_status='verified' AND category='company')::int AS companies
        """))
        return dict(result.first()._mapping)


@router.get("/states")
async def india_states():
    async with SessionLocal() as session:
        result = await session.execute(text("""
            SELECT s.id, s.name, s.abbreviation, s.administrative_type, s.region, s.svg_id, s.capital,
                   (SELECT count(*) FROM india_districts d WHERE d.state_id=s.id AND d.verification_status='verified')::int AS district_count,
                   (SELECT count(*) FROM india_cities c WHERE c.state_id=s.id AND c.verification_status='verified')::int AS city_count,
                   (SELECT count(*) FROM india_places p WHERE p.state_id=s.id AND p.verification_status='verified')::int AS place_count,
                   (SELECT count(*) FROM jobs j WHERE j.status='live' AND s.id = ANY(j.state_codes))::int AS job_count
            FROM india_states s
            WHERE s.verification_status='verified'
            ORDER BY s.administrative_type DESC, s.name
        """))
        return {"items": [dict(row._mapping) for row in result.fetchall()]}


@router.get("/states/{state_id}")
async def india_state(state_id: str):
    state_id = _state_id(state_id)
    async with SessionLocal() as session:
        state = await session.execute(text("""
            SELECT id, name, abbreviation, administrative_type, region, svg_id, capital, source_name, source_url,
                   verification_status, verified_at
            FROM india_states
            LEFT JOIN LATERAL (
              SELECT s.name AS source_name FROM india_sources s WHERE s.id=india_states.source_id
            ) src ON TRUE
            WHERE id=:state_id AND verification_status='verified'
        """), {"state_id": state_id})
        row = state.first()
        if not row:
            raise HTTPException(404, "State not found")
        counts = await session.execute(text("""
            SELECT
              (SELECT count(*) FROM india_districts WHERE state_id=:state_id AND verification_status='verified')::int AS districts,
              (SELECT count(*) FROM india_cities WHERE state_id=:state_id AND verification_status='verified')::int AS cities,
              (SELECT count(*) FROM india_places WHERE state_id=:state_id AND verification_status='verified')::int AS places,
              (SELECT count(*) FROM jobs j WHERE j.status='live' AND :state_id = ANY(j.state_codes))::int AS jobs
        """), {"state_id": state_id})
        payload = dict(row._mapping)
        payload["counts"] = dict(counts.first()._mapping)
        return payload


@router.get("/districts")
async def india_district_directory(
    state_id: str | None = None,
    q: str | None = Query(None, min_length=1, max_length=100),
    limit: int = Query(120, ge=1, le=1000),
):
    params = {"limit": limit}
    clauses = ["d.verification_status='verified'"]
    if state_id:
        state_id = _state_id(state_id)
        clauses.append("d.state_id=:state_id")
        params["state_id"] = state_id
    if q and q.strip():
        clauses.append("(d.name ILIKE :q OR s.name ILIKE :q)")
        params["q"] = f"%{q.strip()}%"
    where = " AND ".join(clauses)
    async with SessionLocal() as session:
        rows = await session.execute(text(f"""
            SELECT d.id::text, d.name, d.slug, d.state_id, s.name AS state_name, d.source_url,
                   d.verification_status, {DISTRICT_PROVENANCE_SQL},
                   (SELECT count(*) FROM india_cities c WHERE c.district_id=d.id AND c.verification_status='verified')::int AS city_count,
                   (SELECT count(*) FROM india_places p WHERE p.district_id=d.id AND p.verification_status='verified')::int AS place_count
            FROM india_districts d
            JOIN india_states s ON s.id=d.state_id AND s.verification_status='verified'
            WHERE {where}
            ORDER BY s.name, d.name
            LIMIT :limit
        """), params)
        count_params = {k: v for k, v in params.items() if k != "limit"}
        total = await session.execute(text(f"SELECT count(*)::int FROM india_districts d JOIN india_states s ON s.id=d.state_id AND s.verification_status='verified' WHERE {where}"), count_params)
        return {"items": [dict(row._mapping) for row in rows.fetchall()], "total": total.scalar_one()}


@router.get("/states/{state_id}/districts")
async def state_districts(state_id: str, limit: int = Query(500, ge=1, le=1000)):
    state_id = _state_id(state_id)
    async with SessionLocal() as session:
        result = await session.execute(text(f"""
            SELECT d.id::text, d.name, d.slug, d.state_id, d.source_url, d.verification_status,
                   {DISTRICT_PROVENANCE_SQL}
            FROM india_districts d
            WHERE d.state_id=:state_id AND d.verification_status='verified'
            ORDER BY d.name LIMIT :limit
        """), {"state_id": state_id, "limit": limit})
        return {"items": [dict(row._mapping) for row in result.fetchall()]}


@router.get("/states/{state_id}/cities")
async def state_cities(state_id: str, district_id: str | None = None, limit: int = Query(500, ge=1, le=1000)):
    state_id = _state_id(state_id)
    async with SessionLocal() as session:
        result = await session.execute(text("""
            SELECT c.id::text, c.name, c.slug, c.district_id::text, d.name AS district_name, c.source_url
            FROM india_cities c
            LEFT JOIN india_districts d ON d.id=c.district_id
            WHERE c.state_id=:state_id AND c.verification_status='verified'
              AND (:district_id IS NULL OR c.district_id::text=:district_id)
            ORDER BY c.name LIMIT :limit
        """), {"state_id": state_id, "district_id": district_id, "limit": limit})
        return {"items": [dict(row._mapping) for row in result.fetchall()]}


@router.get("/states/{state_id}/districts/{district_id}")
async def district_detail(state_id: str, district_id: str):
    state_id = _state_id(state_id)
    async with SessionLocal() as session:
        result = await session.execute(text(f"""
            SELECT d.id::text, d.name, d.slug, d.state_id, s.name AS state_name,
                   d.source_url, d.verification_status, d.verified_at,
                   {DISTRICT_PROVENANCE_SQL},
                   (SELECT count(*) FROM india_cities c WHERE c.district_id=d.id AND c.verification_status='verified')::int AS city_count,
                   (SELECT count(*) FROM india_places p WHERE p.district_id=d.id AND p.verification_status='verified')::int AS place_count
            FROM india_districts d JOIN india_states s ON s.id=d.state_id
            WHERE d.id::text=:district_id AND d.state_id=:state_id AND d.verification_status='verified'
        """), {"state_id": state_id, "district_id": district_id})
        row = result.first()
        if not row:
            raise HTTPException(404, "District not found")
        return dict(row._mapping)


@router.get("/states/{state_id}/districts/{district_id}/cities")
async def district_cities(state_id: str, district_id: str, limit: int = Query(500, ge=1, le=1000)):
    state_id = _state_id(state_id)
    async with SessionLocal() as session:
        result = await session.execute(text("""
            SELECT c.id::text, c.name, c.slug, c.source_url
            FROM india_cities c
            WHERE c.state_id=:state_id AND c.district_id::text=:district_id AND c.verification_status='verified'
            ORDER BY c.name LIMIT :limit
        """), {"state_id": state_id, "district_id": district_id, "limit": limit})
        return {"items": [dict(row._mapping) for row in result.fetchall()]}


@router.get("/states/{state_id}/categories/{category}")
async def state_category(
    state_id: str,
    category: str,
    district_id: str | None = None,
    city_id: str | None = None,
    q: str | None = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    state_id = _state_id(state_id)
    category = category.strip().lower()
    if category not in CATEGORIES:
        raise HTTPException(404, "Unknown India category")

    if category in {"schemes", "gk"}:
        return {"items": [], "total": 0, "category": category, "state_id": state_id,
                "source": "platform-module", "message": "This category is served by an existing platform module; verified India directory data is not fabricated here."}

    if category == "jobs":
        if district_id:
            # jobs currently has state_codes, but no verified district relationship.
            # Returning statewide jobs here would mislabel them as district recruitment.
            return {"items": [], "total": 0, "category": category, "state_id": state_id,
                    "message": "Verified district-level job locations are not available. Browse state jobs instead."}
        jobs, total = await JobService().list_jobs(state=state_id, q=q, limit=limit, offset=offset)
        return {
            "items": [
                {"id": j.id, "name": j.title, "category": "jobs", "description": j.dept,
                 "website": j.apply_url, "source_url": j.pdf_url or j.apply_url,
                 "verified_at": j.verified_at, "job_slug": j.slug, "vacancies": j.vacancies,
                 "last_date": j.last_date, "status": j.status}
                for j in jobs
            ],
            "total": total, "category": category, "state_id": state_id, "source": "LiveGovtJobs jobs service"
        }

    async with SessionLocal() as session:
        if category == "agriculture":
            params = {"state_id": state_id, "limit": limit, "offset": offset}
            district_clause = ""
            if district_id:
                district_clause = " AND district_id=:district_id"
                params["district_id"] = district_id
            q_clause = ""
            if q and q.strip():
                q_clause = " AND crop ILIKE :q"
                params["q"] = f"%{q.strip()}%"
            result = await session.execute(text(f"""
                SELECT id::text, crop AS name, crop_type, season, area_hectares, production_tonnes,
                       source_name, source_url, verified_at
                FROM india_agriculture
                WHERE state_id=:state_id AND verified_at IS NOT NULL {district_clause} {q_clause}
                ORDER BY crop LIMIT :limit OFFSET :offset
            """), params)
            count = await session.execute(text(f"SELECT count(*)::int FROM india_agriculture WHERE state_id=:state_id AND verified_at IS NOT NULL {district_clause} {q_clause}"), params)
            return {"items": [dict(r._mapping) for r in result.fetchall()], "total": count.scalar_one(), "category": category, "state_id": state_id}

        if category == "industries":
            if district_id:
                return {"items": [], "total": 0, "category": category, "state_id": state_id,
                        "message": "Verified district-level industry records are not available."}
            params = {"state_id": state_id, "limit": limit, "offset": offset}
            q_clause = ""
            if q and q.strip():
                q_clause = " AND industry ILIKE :q"
                params["q"] = f"%{q.strip()}%"
            result = await session.execute(text(f"""
                SELECT id::text, industry AS name, description, source_name, source_url, verified_at
                FROM india_industries
                WHERE state_id=:state_id AND verified_at IS NOT NULL {q_clause}
                ORDER BY industry LIMIT :limit OFFSET :offset
            """), params)
            count = await session.execute(text(f"SELECT count(*)::int FROM india_industries WHERE state_id=:state_id AND verified_at IS NOT NULL {q_clause}"), params)
            return {"items": [dict(r._mapping) for r in result.fetchall()], "total": count.scalar_one(), "category": category, "state_id": state_id}

        place_categories = CATEGORY_GROUPS.get(category, (category,))
        conditions = ["p.state_id=:state_id", "p.category = ANY(CAST(:categories AS text[]))", "p.verification_status='verified'"]
        params = {"state_id": state_id, "categories": list(place_categories), "limit": limit, "offset": offset}
        if district_id:
            conditions.append("p.district_id=:district_id")
            params["district_id"] = district_id
        if city_id:
            conditions.append("p.city_id=:city_id")
            params["city_id"] = city_id
        if q and q.strip():
            conditions.append("p.name ILIKE :q")
            params["q"] = f"%{q.strip()}%"
        where = " AND ".join(conditions)
        result = await session.execute(text(f"""
            SELECT p.id::text, p.name, p.category, p.description, p.website, p.address,
                   ST_Y(p.location::geometry) AS latitude, ST_X(p.location::geometry) AS longitude,
                   p.metadata, p.source_name, p.source_url, p.verified_at,
                   d.name AS district_name, c.name AS city_name
            FROM india_places p
            LEFT JOIN india_districts d ON d.id=p.district_id
            LEFT JOIN india_cities c ON c.id=p.city_id
            WHERE {where}
            ORDER BY p.name LIMIT :limit OFFSET :offset
        """), params)
        count = await session.execute(text(f"SELECT count(*)::int AS total FROM india_places p WHERE {where}"), params)
        return {"items": [dict(r._mapping) for r in result.fetchall()], "total": count.scalar_one(), "category": category, "state_id": state_id}


@router.get("/search")
async def india_search(q: str = Query(..., min_length=2, max_length=100), limit: int = Query(30, ge=1, le=100)):
    term = q.strip()
    async with SessionLocal() as session:
        result = await session.execute(text("""
            SELECT record_type, record_key, name, parent_name, state_id, source_url
            FROM india_directory_search
            WHERE name ILIKE :like_term OR parent_name ILIKE :like_term
            ORDER BY CASE WHEN lower(name)=lower(:exact) THEN 0 WHEN lower(name) LIKE lower(:prefix) THEN 1 ELSE 2 END, name
            LIMIT :limit
        """), {"like_term": f"%{term}%", "exact": term, "prefix": f"{term}%", "limit": limit})
        return {"items": [dict(r._mapping) for r in result.fetchall()], "query": term}
