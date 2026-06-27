"""JobService full-text search filter."""

from sqlalchemy import select

from app.models.job import Job
from app.services.job_service import _apply_search_filter


def test_apply_search_filter_uses_fts_and_ilike_fallback():
    stmt, ts_query = _apply_search_filter(select(Job), "upsc civil")
    compiled = str(stmt).lower()
    assert "search_vector" in compiled
    assert "@@" in compiled
    assert "like" in compiled
    assert ts_query is not None


def test_apply_search_filter_empty_query():
    stmt, ts_query = _apply_search_filter(select(Job), "  ")
    assert ts_query is None
