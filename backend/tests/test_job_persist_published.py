from datetime import date, datetime, timezone

from app.services.job_persist_service import (
    _is_dramatic_snapshot_drop,
    _resolve_published_at,
    _should_preserve_public_gate_on_conflict,
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


def test_preserve_public_gate_for_non_expired_unpublished_conflict():
    assert _should_preserve_public_gate_on_conflict(status="draft", published_to_site=False)
    assert _should_preserve_public_gate_on_conflict(status="live", published_to_site=False)
    assert not _should_preserve_public_gate_on_conflict(status="expired", published_to_site=False)
    assert not _should_preserve_public_gate_on_conflict(status="live", published_to_site=True)


def test_dramatic_snapshot_drop_guard_ignores_small_or_moderate_changes():
    assert not _is_dramatic_snapshot_drop(None, 1)
    assert not _is_dramatic_snapshot_drop(10, 1)
    assert not _is_dramatic_snapshot_drop(1000, 600)


def test_dramatic_snapshot_drop_guard_flags_large_catalog_collapse():
    assert _is_dramatic_snapshot_drop(2600, 1)
    assert _is_dramatic_snapshot_drop(2600, 1299)
    assert not _is_dramatic_snapshot_drop(2600, 1300)


def test_ungated_feed_dump_detection():
    from app.services.job_persist_service import _snapshot_looks_like_ungated_feed_dump

    dump = {
        "items": [
            {"title": "Feed item", "status": "live", "vacancies": 0}
            for _ in range(20)
        ]
    }
    dated_but_unverified = {
        "items": [
            {
                "title": "Feed item",
                "status": "live",
                "published_to_site": True,
                "last_date": "2026-09-01",
                "vacancies": 2,
            }
            for _ in range(20)
        ]
    }
    gated = {
        "items": [
            {
                "title": "Official job",
                "status": "live",
                "published_to_site": True,
                "document_type": "RECRUITMENT",
                "verification_status": "VERIFIED",
                "last_date": "2026-09-01",
                "vacancies": 2,
            }
            for _ in range(20)
        ]
    }
    assert _snapshot_looks_like_ungated_feed_dump(dump)
    assert _snapshot_looks_like_ungated_feed_dump(dated_but_unverified)
    assert not _snapshot_looks_like_ungated_feed_dump(gated)


def test_export_raises_on_dramatic_drop_when_not_allowed(tmp_path, monkeypatch):
    """Dramatic shrink must raise so npm export:live-jobs exits non-zero."""
    import asyncio
    import json
    from types import SimpleNamespace
    from unittest.mock import AsyncMock, patch

    from app.schemas.job import JobOut
    from app.services.job_persist_service import JobPersistService

    snapshot = tmp_path / "live-jobs.json"
    snapshot.write_text(
        json.dumps(
            {
                "items": [
                    {
                        "title": f"Job {i}",
                        "status": "live",
                        "published_to_site": True,
                        "document_type": "RECRUITMENT",
                        "verification_status": "VERIFIED",
                        "last_date": "2026-12-01",
                        "vacancies": 1,
                    }
                    for i in range(2600)
                ]
            }
        ),
        encoding="utf-8",
    )
    monkeypatch.delenv("ALLOW_DRASTIC_JSON_EXPORT", raising=False)

    row = JobOut(
        id="1",
        slug="tiny",
        title="Tiny gated set",
        dept="UPSC",
        category=None,
        state_codes=[],
        vacancies=1,
        qualification="Graduate",
        salary="Level-7",
        age_limit="21-30",
        last_date=date(2026, 12, 1),
        apply_url="https://upsc.gov.in/apply",
        pdf_url=None,
        status="live",
        published_at=datetime(2026, 6, 1, tzinfo=timezone.utc),
        detail={"notification_url": "https://upsc.gov.in/n.pdf"},
        document_type="RECRUITMENT",
        verification_status="VERIFIED",
        completeness_score=80,
        publication_confidence=95.0,
        published_to_site=True,
    )

    async def _run():
        with (
            patch(
                "app.services.job_persist_service.get_settings",
                return_value=SimpleNamespace(live_jobs_json_path=str(snapshot)),
            ),
            patch("app.services.job_service.JobService") as job_service_cls,
        ):
            job_service_cls.return_value.list_jobs = AsyncMock(return_value=([row], 1))
            try:
                await JobPersistService().export_live_jobs_json(AsyncMock())
                raised = False
            except RuntimeError as exc:
                raised = True
                assert "refusing to replace" in str(exc)
            assert raised
            assert len(json.loads(snapshot.read_text(encoding="utf-8"))["items"]) == 2600

    asyncio.run(_run())
