from datetime import date, datetime, timezone

from app.services.job_persist_service import (
    _job_conflict_predicates,
    _resolve_published_at,
    _upsert_published_at,
)


def test_resolve_published_at_uses_top_level_datetime():
    dt = datetime(2026, 6, 1, 12, 0, tzinfo=timezone.utc)
    assert _resolve_published_at({"published_at": dt}) == dt


def test_resolve_published_at_uses_detail_published():
    resolved = _resolve_published_at(
        {"detail": {"published": "2026-05-20T00:00:00+00:00"}}
    )
    assert resolved == datetime(2026, 5, 20, 0, 0, tzinfo=timezone.utc)


def test_resolve_published_at_returns_none_when_unknown():
    assert _resolve_published_at({"last_date": date(2026, 6, 21)}) is None


def test_upsert_published_at_falls_back_to_now_when_unknown():
    before = datetime.now(timezone.utc)
    result = _upsert_published_at({"last_date": date(2026, 6, 21)})
    after = datetime.now(timezone.utc)
    assert before <= result <= after


def test_upsert_published_at_uses_resolved_value():
    dt = datetime(2026, 6, 1, 12, 0, tzinfo=timezone.utc)
    assert _upsert_published_at({"published_at": dt}) == dt


def test_job_conflict_predicates_include_non_empty_source_url():
    predicates = _job_conflict_predicates("abc123", " https://example.gov/job ")

    assert len(predicates) == 2
    assert predicates[0].left.name == "content_hash"
    assert predicates[0].right.value == "abc123"
    assert predicates[1].left.name == "source_url"
    assert predicates[1].right.value == "https://example.gov/job"


def test_job_conflict_predicates_ignore_blank_source_url():
    predicates = _job_conflict_predicates("abc123", "   ")

    assert len(predicates) == 1
    assert predicates[0].left.name == "content_hash"
