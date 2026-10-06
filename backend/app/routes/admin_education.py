from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import text

from app.database.session import SessionLocal
from app.middleware.auth import require_admin_key

router = APIRouter(dependencies=[Depends(require_admin_key)])

TABLES = {
    "careers": "education_careers",
    "resources": "education_resources",
    "tests": "education_mock_tests",
    "colleges": "education_colleges",
    "scholarships": "education_scholarships",
}

ALLOWED_FIELDS = {
    "careers": {"id","name","stage","description","duration","eligibility","difficulty","avg_starting_salary","scope","icon","exams","top_colleges","key_skills","job_roles","next_steps","source_url","verified","last_verified_at","is_published"},
    "resources": {"title","kind","provider","description","source_url","file_url","exam","subject","stage","verified","last_verified_at","is_published"},
    "tests": {"id","title","exam","subject","duration_minutes","total_questions","total_marks","stages","is_published"},
    "colleges": {"name","city","state","type","website","official_website","courses","entrance_exams","verified","last_verified_at","is_published"},
    "scholarships": {"name","provider","eligibility","qualification","state","amount","deadline","official_url","verified","last_verified_at","is_published"},
}

class ContentPayload(BaseModel):
    data: dict = Field(default_factory=dict)

class QuestionPayload(BaseModel):
    question_text: str
    options: list[str] = Field(default_factory=list)
    correct_index: int = 0
    explanation: str | None = None
    subject: str | None = None
    difficulty: str | None = "Medium"
    marks: float = 4
    negative_marks: float = 0
    sort_order: int = 0
    is_published: bool = True


def _clean(kind: str, data: dict, *, require_id: bool = False) -> dict:
    allowed = ALLOWED_FIELDS[kind]
    clean = {k: v for k, v in data.items() if k in allowed}
    if require_id and not clean.get("id"):
        raise HTTPException(400, "id is required")
    return clean

async def _rows(kind: str, limit: int, offset: int, search: str | None):
    table = TABLES[kind]
    where = ""
    params = {"limit": limit, "offset": offset}
    if search:
        fields = "name" if kind in ("careers", "colleges", "scholarships") else ("title" if kind in ("resources", "tests") else "")
        if fields:
            where = f"WHERE {fields} ILIKE :search"
            params["search"] = f"%{search}%"
    order = "ORDER BY updated_at DESC" if kind != "tests" else "ORDER BY title"
    async with SessionLocal() as session:
        result = await session.execute(text(f"SELECT * FROM public.{table} {where} {order} LIMIT :limit OFFSET :offset"), params)
        return [dict(row._mapping) for row in result.fetchall()]

@router.get("/education/overview")
async def education_overview():
    async with SessionLocal() as session:
        result = await session.execute(text("""
            SELECT 'careers' AS kind, COUNT(*)::int AS total, COUNT(*) FILTER (WHERE is_published)::int AS published FROM public.education_careers
            UNION ALL SELECT 'resources', COUNT(*)::int, COUNT(*) FILTER (WHERE is_published)::int FROM public.education_resources
            UNION ALL SELECT 'tests', COUNT(*)::int, COUNT(*) FILTER (WHERE is_published)::int FROM public.education_mock_tests
            UNION ALL SELECT 'colleges', COUNT(*)::int, COUNT(*) FILTER (WHERE is_published)::int FROM public.education_colleges
            UNION ALL SELECT 'scholarships', COUNT(*)::int, COUNT(*) FILTER (WHERE is_published)::int FROM public.education_scholarships
        """))
        return {row.kind: {"total": row.total, "published": row.published} for row in result.fetchall()}

@router.get("/education/{kind}")
async def list_education(kind: str, limit: int = Query(100, ge=1, le=500), offset: int = Query(0, ge=0), search: str | None = None):
    if kind not in TABLES: raise HTTPException(404, "Unknown education collection")
    return {"items": await _rows(kind, limit, offset, search)}

@router.post("/education/{kind}")
async def create_education(kind: str, body: ContentPayload):
    if kind not in TABLES: raise HTTPException(404, "Unknown education collection")
    data = _clean(kind, body.data, require_id=kind in ("careers", "tests"))
    table = TABLES[kind]
    if not data: raise HTTPException(400, "No fields supplied")
    columns = list(data)
    placeholders = [f":{c}" for c in columns]
    async with SessionLocal() as session:
        try:
            result = await session.execute(text(f"INSERT INTO public.{table} ({','.join(columns)}) VALUES ({','.join(placeholders)}) RETURNING *"), data)
            await session.commit()
        except Exception as exc:
            await session.rollback()
            raise HTTPException(400, str(exc).split('\n')[0])
        return dict(result.first()._mapping)

@router.patch("/education/{kind}/{item_id}")
async def update_education(kind: str, item_id: str, body: ContentPayload):
    if kind not in TABLES: raise HTTPException(404, "Unknown education collection")
    data = _clean(kind, body.data)
    data.pop("id", None)
    if not data: raise HTTPException(400, "No editable fields supplied")
    table = TABLES[kind]
    key = "id"
    if kind in ("resources", "colleges", "scholarships"):
        try: UUID(item_id)
        except ValueError: raise HTTPException(400, "Invalid UUID")
    data["updated_at"] = datetime.now(timezone.utc)
    assignments = ",".join(f"{c}=:{c}" for c in data)
    data["item_id"] = item_id
    async with SessionLocal() as session:
        result = await session.execute(text(f"UPDATE public.{table} SET {assignments} WHERE {key}=:item_id RETURNING *"), data)
        row = result.first()
        if not row: raise HTTPException(404, "Record not found")
        await session.commit()
        return dict(row._mapping)

@router.delete("/education/{kind}/{item_id}")
async def delete_education(kind: str, item_id: str):
    if kind not in TABLES: raise HTTPException(404, "Unknown education collection")
    table = TABLES[kind]
    async with SessionLocal() as session:
        result = await session.execute(text(f"DELETE FROM public.{table} WHERE id=:item_id RETURNING id"), {"item_id": item_id})
        row = result.first()
        if not row: raise HTTPException(404, "Record not found")
        await session.commit()
        return {"deleted": True, "id": str(row[0])}

@router.get("/education/tests/{test_id}/questions")
async def list_questions(test_id: str):
    async with SessionLocal() as session:
        result = await session.execute(text("SELECT * FROM public.education_questions WHERE test_id=:test_id ORDER BY sort_order, created_at"), {"test_id": test_id})
        return {"items": [dict(r._mapping) for r in result.fetchall()]}

@router.post("/education/tests/{test_id}/questions")
async def create_question(test_id: str, body: QuestionPayload):
    values = body.model_dump()
    values["test_id"] = test_id
    async with SessionLocal() as session:
        result = await session.execute(text("""INSERT INTO public.education_questions
            (test_id,question_text,options,correct_index,explanation,subject,difficulty,marks,negative_marks,sort_order,is_published)
            VALUES (:test_id,:question_text,CAST(:options AS jsonb),:correct_index,:explanation,:subject,:difficulty,:marks,:negative_marks,:sort_order,:is_published) RETURNING *"""), {**values, "options": __import__('json').dumps(values["options"])})
        await session.commit()
        return dict(result.first()._mapping)

@router.patch("/education/questions/{question_id}")
async def update_question(question_id: str, body: QuestionPayload):
    values = body.model_dump()
    values["options"] = __import__('json').dumps(values["options"])
    values["question_id"] = question_id
    async with SessionLocal() as session:
        result = await session.execute(text("""UPDATE public.education_questions SET
            question_text=:question_text, options=CAST(:options AS jsonb), correct_index=:correct_index, explanation=:explanation,
            subject=:subject, difficulty=:difficulty, marks=:marks, negative_marks=:negative_marks, sort_order=:sort_order,
            is_published=:is_published WHERE id=:question_id RETURNING *"""), values)
        row = result.first()
        if not row: raise HTTPException(404, "Question not found")
        await session.commit()
        return dict(row._mapping)

@router.delete("/education/questions/{question_id}")
async def delete_question(question_id: str):
    async with SessionLocal() as session:
        result = await session.execute(text("DELETE FROM public.education_questions WHERE id=:id RETURNING id"), {"id": question_id})
        row = result.first()
        if not row: raise HTTPException(404, "Question not found")
        await session.commit()
        return {"deleted": True, "id": str(row[0])}

@router.post("/education/tests/{test_id}/recount")
async def recount_test(test_id: str):
    async with SessionLocal() as session:
        result = await session.execute(text("""UPDATE public.education_mock_tests t SET
          total_questions=(SELECT COUNT(*) FROM public.education_questions q WHERE q.test_id=t.id AND q.is_published),
          total_marks=(SELECT COALESCE(SUM(marks),0) FROM public.education_questions q WHERE q.test_id=t.id AND q.is_published)
          WHERE t.id=:id RETURNING *"""), {"id": test_id})
        row = result.first()
        if not row: raise HTTPException(404, "Test not found")
        await session.commit()
        return dict(row._mapping)
