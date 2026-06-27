import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

from app.agents.ingest_agent import IngestAgent


def test_ingest_agent_run_source_saves_normalized_row():
    agent = IngestAgent()
    entry = {"code": "ssc-rss", "enabled": True, "module": "rss_feed"}
    raw_row = {"title": "SSC CGL 2026", "link": "https://ssc.gov.in/notification"}
    normalized = {
        "title": "SSC CGL 2026",
        "apply_url": "https://ssc.gov.in/notification",
        "category": "ssc",
        "vacancies": 7500,
        "detail": {"source": "ssc-rss"},
    }

    mock_scraper = MagicMock()
    mock_scraper.fetch = AsyncMock(return_value=[raw_row])

    async def run():
        with (
            patch.object(agent, "registry", {"scrapers": [entry]}),
            patch.object(agent, "_scraper_for", return_value=mock_scraper),
            patch.object(agent, "_normalize_raw", new_callable=AsyncMock, return_value=normalized),
            patch.object(agent.persist, "upsert_normalized", new_callable=AsyncMock) as upsert,
            patch("app.agents.ingest_agent.SessionLocal") as session_local,
            patch.object(agent, "_record_source_run", new_callable=AsyncMock),
            patch.object(agent.source_sync, "ensure_source", new_callable=AsyncMock, return_value="src-1"),
        ):
            session = AsyncMock()
            session_local.return_value.__aenter__.return_value = session
            session.execute = AsyncMock()
            session.commit = AsyncMock()
            session.rollback = AsyncMock()
            upsert.return_value = MagicMock(id="job-1")
            return await agent.run_source("ssc-rss")

    result = asyncio.run(run())
    assert result["saved"] == 1
    assert result["fetched"] == 1
