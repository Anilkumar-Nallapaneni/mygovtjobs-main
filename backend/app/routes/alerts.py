from fastapi import APIRouter, HTTPException, Request

from app.middleware.rate_limit import client_ip, get_subscribe_rate_limiter
from app.schemas.alert import AlertSubscribeRequest, AlertUnsubscribeRequest
from app.services.alert_service import AlertService, AlertSubscriptionError
from app.services.turnstile_service import verify_turnstile

router = APIRouter()
service = AlertService()


@router.post("/subscribe")
async def subscribe(request: Request, body: AlertSubscribeRequest):
    if body.website.strip():
        return {"id": "ok", "status": "subscribed"}

    ip = client_ip(request)
    if not get_subscribe_rate_limiter().allow(f"subscribe:{ip}"):
        raise HTTPException(
            status_code=429,
            detail="Too many subscription attempts. Please try again in a minute.",
        )

    token = request.headers.get("CF-Turnstile-Response") or request.headers.get("X-Turnstile-Token")
    if not await verify_turnstile(token, remote_ip=ip):
        raise HTTPException(status_code=400, detail="Bot verification failed. Please try again.")

    try:
        sub_id = await service.subscribe(body)
    except AlertSubscriptionError:
        raise HTTPException(status_code=503, detail="Could not save subscription. Please try again later.")
    return {"id": sub_id, "status": "subscribed"}


@router.post("/unsubscribe")
async def unsubscribe(body: AlertUnsubscribeRequest):
    if not body.id and not (body.channel and body.channel_address):
        raise HTTPException(status_code=400, detail="Provide subscription id or channel + address")
    try:
        ok = await service.unsubscribe(body)
    except AlertSubscriptionError:
        raise HTTPException(status_code=503, detail="Could not unsubscribe. Please try again later.")
    if not ok:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return {"status": "unsubscribed"}
