from fastapi import APIRouter, HTTPException, Request

from app.middleware.rate_limit import client_ip, get_subscribe_rate_limiter
from app.schemas.contact import ContactRequest
from app.services.contact_service import send_contact_email
from app.services.turnstile_service import verify_turnstile

router = APIRouter()


@router.post("")
async def submit_contact(request: Request, body: ContactRequest):
    if body.website.strip():
        return {"status": "sent"}

    ip = client_ip(request)
    if not await get_subscribe_rate_limiter().allow(f"contact:{ip}"):
        raise HTTPException(
            status_code=429,
            detail="Too many messages. Please try again in a minute.",
        )

    token = request.headers.get("CF-Turnstile-Response") or request.headers.get("X-Turnstile-Token")
    if not await verify_turnstile(token, remote_ip=ip):
        raise HTTPException(status_code=400, detail="Bot verification failed. Please try again.")

    ok = await send_contact_email(body)
    if not ok:
        raise HTTPException(
            status_code=503,
            detail="Could not send message. Email contact@livegovtjobs.com directly.",
        )
    return {"status": "sent"}
