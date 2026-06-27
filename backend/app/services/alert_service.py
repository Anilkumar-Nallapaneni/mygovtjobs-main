"""Email / Telegram / push / WhatsApp subscriptions."""

from sqlalchemy import select, update

from app.database.session import SessionLocal
from app.models.alert import AlertSubscription
from app.schemas.alert import AlertSubscribeRequest, AlertUnsubscribeRequest


class AlertSubscriptionError(Exception):
    """Raised when a subscription cannot be persisted."""


class AlertService:
    async def subscribe(self, body: AlertSubscribeRequest) -> str:
        async with SessionLocal() as session:
            try:
                existing = (
                    await session.execute(
                        select(AlertSubscription).where(
                            AlertSubscription.channel == body.channel,
                            AlertSubscription.channel_address == body.channel_address.strip(),
                        )
                    )
                ).scalar_one_or_none()
                if existing:
                    existing.state_codes = body.state_codes or []
                    existing.categories = body.categories or []
                    existing.qualification_tags = body.qualification_tags or []
                    existing.is_active = True
                    if body.user_id:
                        existing.user_id = body.user_id
                    await session.commit()
                    await session.refresh(existing)
                    return str(existing.id)

                sub = AlertSubscription(
                    channel=body.channel,
                    channel_address=body.channel_address.strip(),
                    state_codes=body.state_codes or [],
                    categories=body.categories or [],
                    qualification_tags=body.qualification_tags or [],
                    user_id=body.user_id,
                    is_active=True,
                )
                session.add(sub)
                await session.commit()
                await session.refresh(sub)
                return str(sub.id)
            except Exception as exc:
                await session.rollback()
                raise AlertSubscriptionError("subscription_failed") from exc

    async def unsubscribe(self, body: AlertUnsubscribeRequest) -> bool:
        async with SessionLocal() as session:
            try:
                if body.id:
                    result = await session.execute(
                        update(AlertSubscription)
                        .where(AlertSubscription.id == body.id)
                        .values(is_active=False)
                    )
                elif body.channel and body.channel_address:
                    result = await session.execute(
                        update(AlertSubscription)
                        .where(
                            AlertSubscription.channel == body.channel,
                            AlertSubscription.channel_address == body.channel_address.strip(),
                        )
                        .values(is_active=False)
                    )
                else:
                    return False
                await session.commit()
                return (result.rowcount or 0) > 0
            except Exception as exc:
                await session.rollback()
                raise AlertSubscriptionError("unsubscribe_failed") from exc
