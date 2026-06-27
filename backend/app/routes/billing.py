"""Premium billing via Razorpay."""

from __future__ import annotations

import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from app.config import get_settings
from app.database.session import SessionLocal
from app.middleware.supabase_auth import get_current_user_id
from app.services.razorpay_service import RazorpayNotConfiguredError, RazorpayService

logger = logging.getLogger(__name__)
router = APIRouter()
service = RazorpayService()


class VerifyPaymentBody(BaseModel):
    razorpay_order_id: str = Field(..., min_length=4)
    razorpay_payment_id: str = Field(..., min_length=4)
    razorpay_signature: str = Field(..., min_length=8)


@router.get("/config")
async def billing_config():
    """Public Razorpay key + plan info for checkout (no secrets)."""
    settings = get_settings()
    if not service.configured:
        return {"enabled": False}
    return {
        "enabled": True,
        "key_id": service.public_key_id,
        "amount_paise": settings.razorpay_premium_amount_paise,
        "currency": "INR",
        "description": settings.razorpay_premium_description,
        "site_name": settings.razorpay_checkout_name,
    }


@router.post("/create-order")
async def create_order(user_id: str = Depends(get_current_user_id)):
    if not service.configured:
        raise HTTPException(status_code=503, detail="Payments not configured")
    async with SessionLocal() as session:
        try:
            payload = await service.create_premium_order(session, user_id=user_id)
        except RazorpayNotConfiguredError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        except RuntimeError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc
    return payload


@router.post("/verify")
async def verify_payment(body: VerifyPaymentBody, user_id: str = Depends(get_current_user_id)):
    if not service.verify_payment_signature(
        order_id=body.razorpay_order_id,
        payment_id=body.razorpay_payment_id,
        signature=body.razorpay_signature,
    ):
        raise HTTPException(status_code=400, detail="Invalid payment signature")

    async with SessionLocal() as session:
        ok = await service.mark_order_paid(
            session,
            order_id=body.razorpay_order_id,
            payment_id=body.razorpay_payment_id,
            user_id=user_id,
        )
    if not ok:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"ok": True, "subscription_tier": "premium"}


@router.post("/webhook")
async def razorpay_webhook(request: Request):
    """Razorpay server webhook — configure URL in Razorpay Dashboard."""
    settings = get_settings()
    if not settings.razorpay_webhook_secret:
        raise HTTPException(status_code=503, detail="Webhook not configured")

    body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")
    if not service.verify_webhook_signature(body, signature):
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    event = json.loads(body.decode())
    event_type = event.get("event", "")
    if event_type != "payment.captured":
        return {"ok": True, "ignored": event_type}

    payment = event.get("payload", {}).get("payment", {}).get("entity", {})
    order_id = payment.get("order_id")
    payment_id = payment.get("id")
    if not order_id or not payment_id:
        return {"ok": False}

    async with SessionLocal() as session:
        await service.mark_order_paid(session, order_id=order_id, payment_id=payment_id)
    return {"ok": True}
