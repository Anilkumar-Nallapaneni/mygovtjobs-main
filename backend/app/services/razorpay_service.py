"""Razorpay order creation and payment verification."""

from __future__ import annotations

import hashlib
import hmac
import logging
import uuid
from datetime import datetime, timezone

import httpx
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_settings

logger = logging.getLogger(__name__)

RAZORPAY_API = "https://api.razorpay.com/v1"


class RazorpayNotConfiguredError(Exception):
    """Razorpay keys missing."""


class RazorpayService:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    def _require_keys(self) -> tuple[str, str]:
        key_id = (self.settings.razorpay_key_id or "").strip()
        key_secret = (self.settings.razorpay_key_secret or "").strip()
        if not key_id or not key_secret:
            raise RazorpayNotConfiguredError("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET required")
        return key_id, key_secret

    @property
    def configured(self) -> bool:
        return bool(self.settings.razorpay_key_id and self.settings.razorpay_key_secret)

    @property
    def public_key_id(self) -> str | None:
        key = (self.settings.razorpay_key_id or "").strip()
        return key or None

    async def create_premium_order(self, session: AsyncSession, *, user_id: str) -> dict:
        key_id, key_secret = self._require_keys()
        amount = self.settings.razorpay_premium_amount_paise
        receipt = f"premium-{user_id[:8]}-{uuid.uuid4().hex[:8]}"

        async with httpx.AsyncClient(timeout=20.0) as client:
            res = await client.post(
                f"{RAZORPAY_API}/orders",
                auth=(key_id, key_secret),
                json={
                    "amount": amount,
                    "currency": "INR",
                    "receipt": receipt[:40],
                    "notes": {"user_id": user_id, "plan": "premium"},
                },
            )
        if res.status_code >= 400:
            logger.error("Razorpay order failed: %s", res.text[:300])
            raise RuntimeError("Could not create payment order")

        order = res.json()
        razorpay_order_id = order["id"]

        await session.execute(
            text(
                """
                INSERT INTO payment_orders (user_id, razorpay_order_id, amount_paise, currency, status)
                VALUES (:user_id, :order_id, :amount, 'INR', 'created')
                """
            ),
            {"user_id": user_id, "order_id": razorpay_order_id, "amount": amount},
        )
        await session.commit()

        return {
            "key_id": key_id,
            "order_id": razorpay_order_id,
            "amount": amount,
            "currency": "INR",
            "name": self.settings.razorpay_checkout_name,
            "description": self.settings.razorpay_premium_description,
        }

    def verify_payment_signature(
        self, *, order_id: str, payment_id: str, signature: str
    ) -> bool:
        _, key_secret = self._require_keys()
        payload = f"{order_id}|{payment_id}".encode()
        expected = hmac.new(key_secret.encode(), payload, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, signature)

    def verify_webhook_signature(self, body: bytes, signature: str) -> bool:
        secret = (self.settings.razorpay_webhook_secret or "").strip()
        if not secret:
            return False
        expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, signature)

    async def mark_order_paid(
        self,
        session: AsyncSession,
        *,
        order_id: str,
        payment_id: str,
        user_id: str | None = None,
    ) -> bool:
        row = (
            await session.execute(
                text(
                    """
                    SELECT user_id, status FROM payment_orders
                    WHERE razorpay_order_id = :order_id
                    """
                ),
                {"order_id": order_id},
            )
        ).mappings().first()

        if not row:
            return False
        if user_id and str(row["user_id"]) != user_id:
            return False
        if row["status"] == "paid":
            return True

        uid = str(row["user_id"])
        now = datetime.now(timezone.utc)

        await session.execute(
            text(
                """
                UPDATE payment_orders
                SET status = 'paid', razorpay_payment_id = :payment_id, paid_at = :paid_at
                WHERE razorpay_order_id = :order_id
                """
            ),
            {"order_id": order_id, "payment_id": payment_id, "paid_at": now},
        )
        await session.execute(
            text(
                """
                UPDATE profiles
                SET subscription_tier = 'premium', updated_at = :now
                WHERE id = :uid
                """
            ),
            {"uid": uid, "now": now},
        )
        await session.commit()
        return True
