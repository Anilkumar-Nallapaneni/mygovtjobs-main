import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.job_persist_service import JobPersistService


def _execute_result(job):
    return MagicMock(scalar_one_or_none=MagicMock(return_value=job))


def test_existing_job_lookup_falls_back_to_source_url():
    content_match = None
    source_match = SimpleNamespace(id="existing-job")
    session = AsyncMock()
    session.execute = AsyncMock(side_effect=[_execute_result(content_match), _execute_result(source_match)])

    result = asyncio.run(
        JobPersistService()._existing_job_for_identity(
            session,
            digest="new-content-hash",
            source_url="https://example.gov.in/recruitment/notice",
        )
    )

    assert result is source_match
    assert session.execute.await_count == 2


def test_upsert_normalized_updates_existing_source_url_row_without_insert():
    existing = SimpleNamespace(id="existing-job")
    session = AsyncMock()
    session.execute = AsyncMock()
    session.flush = AsyncMock()
    session.commit = AsyncMock()

    service = JobPersistService()
    service._existing_job_for_identity = AsyncMock(return_value=existing)

    normalized = {
        "title": "WII Project Recruitment 2026",
        "dept": "Wildlife Institute of India",
        "apply_url": "https://www.wii.gov.in/recruitments/advtno_wii_advt1_rpcell_july2026",
        "source_url": "https://www.wii.gov.in/recruitments/advtno_wii_advt1_rpcell_july2026",
        "content_hash": "new-content-hash",
        "detail": {"summary": "Recruitment notice for project positions"},
    }

    with patch("app.services.job_review_service.JobReviewService.enqueue", new_callable=AsyncMock):
        result = asyncio.run(service.upsert_normalized(session, normalized))

    assert result is existing
    assert existing.content_hash == "new-content-hash"
    assert existing.source_url == normalized["source_url"]
    assert existing.title == normalized["title"]
    session.flush.assert_awaited_once()
    session.commit.assert_awaited_once()
    session.execute.assert_not_awaited()
