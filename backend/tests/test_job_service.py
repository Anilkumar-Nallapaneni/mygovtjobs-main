"""JobService public query rules."""

import asyncio
from unittest.mock import AsyncMock, MagicMock

from app.services.job_service import JobService


def test_get_by_slug_ignores_draft_status():
    session = AsyncMock()
    session.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=None)))

    async def run():
        return await JobService().get_by_slug("draft-only-job", session=session)

    result = asyncio.run(run())

    assert result is None
    stmt = session.execute.await_args.args[0]
    compiled = str(stmt).lower()
    assert "status" in compiled
    assert "published_to_site" in compiled
    assert "publication_confidence" in compiled
    assert "verification_status" in compiled
    assert "last_date" in compiled
