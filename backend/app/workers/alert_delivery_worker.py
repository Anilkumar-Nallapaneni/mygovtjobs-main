"""CLI entrypoint for alert delivery batches."""

from app.database.session import SessionLocal
from app.services.alert_delivery_service import AlertDeliveryService


async def run_alert_delivery(*, lookback_hours: int | None = None) -> dict[str, int]:
    async with SessionLocal() as session:
        return await AlertDeliveryService().run(session, lookback_hours=lookback_hours)
