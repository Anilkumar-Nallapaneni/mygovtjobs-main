from fastapi import APIRouter, Depends, HTTPException, Request

from app.middleware.rate_limit import client_ip, get_subscribe_rate_limiter
from app.middleware.supabase_auth import get_current_user_id, get_optional_current_user_id
from app.schemas.alert import AlertSubscribeRequest, AlertUnsubscribeRequest
from app.services.alert_service import AlertService, AlertSubscriptionError
from app.services.turnstile_service import verify_turnstile
from app.config import get_settings

router = APIRouter()
service = AlertService()


@router.get("/channels")
async def alert_channels():
    """Public channel configuration + last site-wide delivery (no PII)."""
    settings = get_settings()
    last_sent = None
    try:
        from sqlalchemy import func, select

        from app.database.session import SessionLocal
        from app.models.alert import AlertDelivery

        async with SessionLocal() as session:
            last_sent = (await session.execute(select(func.max(AlertDelivery.sent_at)))).scalar()
    except Exception:
        last_sent = None
    return {
        "email": bool(settings.resend_api_key),
        "telegram": bool(settings.telegram_bot_token),
        "whatsapp": bool(
            settings.twilio_account_sid and settings.twilio_auth_token and settings.twilio_whatsapp_from
        ),
        "push": bool(settings.push_webhook_url),
        "last_site_delivery_at": last_sent.isoformat() if last_sent else None,
    }


@router.post("/subscribe")
async def subscribe(
    request: Request,
    body: AlertSubscribeRequest,
    user_id: str | None = Depends(get_optional_current_user_id),
):
    if body.website.strip():
        return {"id": "ok", "status": "subscribed"}

    ip = client_ip(request)
    if not await get_subscribe_rate_limiter().allow(f"subscribe:{ip}"):
        raise HTTPException(
            status_code=429,
            detail="Too many subscription attempts. Please try again in a minute.",
        )

    token = request.headers.get("CF-Turnstile-Response") or request.headers.get("X-Turnstile-Token")
    if not await verify_turnstile(token, remote_ip=ip):
        raise HTTPException(status_code=400, detail="Bot verification failed. Please try again.")

    try:
        sub_id = await service.subscribe(body, user_id=user_id)
    except AlertSubscriptionError:
        raise HTTPException(status_code=503, detail="Could not save subscription. Please try again later.")
    return {"id": sub_id, "status": "subscribed"}


@router.post("/unsubscribe")
async def unsubscribe(
    body: AlertUnsubscribeRequest,
    user_id: str = Depends(get_current_user_id),
):
    try:
        ok = await service.unsubscribe(body, user_id=user_id)
    except AlertSubscriptionError:
        raise HTTPException(status_code=503, detail="Could not unsubscribe. Please try again later.")
    if not ok:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return {"status": "unsubscribed"}
