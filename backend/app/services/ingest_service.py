from app.agents.ingest_agent import IngestAgent
from app.database.session import SessionLocal
from app.services.source_sync_service import SourceSyncService


class IngestService:
    def __init__(self):
        self.agent = IngestAgent()
        self.source_sync = SourceSyncService()

    async def sync_sources_registry(self) -> int:
        async with SessionLocal() as session:
            return await self.source_sync.sync_registry(session)

    async def run_source(self, source_code: str) -> dict:
        return await self.agent.run_source(source_code)

    async def run_all_enabled(self) -> list[dict]:
        return await self.agent.run_all_enabled()
