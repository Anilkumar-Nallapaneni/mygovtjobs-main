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
            patch.object(agent.persist, "export_live_jobs_json", new_callable=AsyncMock, return_value=1),
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


def test_run_all_enabled_runs_sources_in_parallel():
    agent = IngestAgent()
    entries = [
        {"code": "src-a", "enabled": True},
        {"code": "src-b", "enabled": True},
        {"code": "src-c", "enabled": False},
    ]
    first_started = asyncio.Event()
    saw_parallel = asyncio.Event()
    concurrent = 0
    lock = asyncio.Lock()

    async def fake_run_source(code: str) -> dict:
        nonlocal concurrent
        async with lock:
            concurrent += 1
            if concurrent >= 2:
                saw_parallel.set()
            if code == "src-a":
                first_started.set()
        if code != "src-a":
            await first_started.wait()
        await asyncio.sleep(0.05)
        async with lock:
            concurrent -= 1
        return {"source": code, "fetched": 1, "saved": 1}

    async def run():
        with (
            patch.object(agent, "registry", {"scrapers": entries}),
            patch.object(agent, "run_source", side_effect=fake_run_source),
            patch("app.agents.ingest_agent.SessionLocal") as session_local,
            patch.object(agent.source_sync, "sync_registry", new_callable=AsyncMock, return_value=0),
        ):
            session = AsyncMock()
            session_local.return_value.__aenter__.return_value = session
            return await agent.run_all_enabled()

    results = asyncio.run(run())
    assert {r["source"] for r in results} == {"src-a", "src-b"}
    assert saw_parallel.is_set()
