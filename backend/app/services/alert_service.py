"""Email / Telegram / push / WhatsApp subscriptions."""

from sqlalchemy import select, update

from app.database.session import SessionLocal
from app.models.alert import AlertSubscription
from app.schemas.alert import AlertSubscribeRequest, AlertUnsubscribeRequest


class AlertSubscriptionError(Exception):
    """Raised when a subscription cannot be persisted."""


class AlertService:
    async def subscribe(self, body: AlertSubscribeRequest, *, user_id: str | None = None) -> str:
        async with SessionLocal() as session:
            try:
                address = body.channel_address.strip()
                owner_filters = [
                    AlertSubscription.user_id == user_id
                    if user_id
                    else AlertSubscription.user_id.is_(None)
                ]
                if not user_id:
                    owner_filters.append(AlertSubscription.is_active.is_(True))
                existing = (
                    await session.execute(
                        select(AlertSubscription).where(
                            AlertSubscription.channel == body.channel,
                            AlertSubscription.channel_address == address,
                            *owner_filters,
                        )
                    )
                ).scalar_one_or_none()
                if existing:
                    if user_id:
                        existing.state_codes = body.state_codes or []
                        existing.categories = body.categories or []
                        existing.qualification_tags = body.qualification_tags or []
                        existing.is_active = True
                        await session.commit()
                        await session.refresh(existing)
                    return str(existing.id)

                sub = AlertSubscription(
                    channel=body.channel,
                    channel_address=address,
                    state_codes=body.state_codes or [],
                    categories=body.categories or [],
                    qualification_tags=body.qualification_tags or [],
                    user_id=user_id,
                    is_active=True,
                )
                session.add(sub)
                await session.commit()
                await session.refresh(sub)
                return str(sub.id)
            except Exception as exc:
                await session.rollback()
                raise AlertSubscriptionError("subscription_failed") from exc

    async def unsubscribe(self, body: AlertUnsubscribeRequest, *, user_id: str) -> bool:
        async with SessionLocal() as session:
            try:
                result = await session.execute(
                    update(AlertSubscription)
                    .where(
                        AlertSubscription.id == body.id,
                        AlertSubscription.user_id == user_id,
                    )
                    .values(is_active=False)
                )
                await session.commit()
                return (result.rowcount or 0) > 0
            except Exception as exc:
                await session.rollback()
                raise AlertSubscriptionError("unsubscribe_failed") from exc
