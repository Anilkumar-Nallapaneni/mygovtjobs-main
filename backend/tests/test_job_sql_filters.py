"""SQL recruitment filter helpers."""

from sqlalchemy import select

from app.models.job import Job
from app.services.job_sql_filters import apply_recruitment_filters, recruitment_sql_filters


def test_recruitment_sql_filters_returns_conditions():
    conds = recruitment_sql_filters()
    assert len(conds) >= 5


def test_apply_recruitment_filters_adds_where_clause():
    stmt = apply_recruitment_filters(select(Job))
    compiled = str(stmt.compile(compile_kwargs={"literal_binds": True})).lower()
    assert "where" in compiled
    assert "jobs" in compiled
