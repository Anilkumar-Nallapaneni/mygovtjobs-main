"""Razorpay signature verification."""

from app.services.razorpay_service import RazorpayService
from app.config import Settings


def test_verify_payment_signature():
    svc = RazorpayService(
        Settings(
            razorpay_key_id="rzp_test_abc",
            razorpay_key_secret="test_secret_key",
        )
    )
    import hmac
    import hashlib

    order_id = "order_123"
    payment_id = "pay_456"
    sig = hmac.new(
        b"test_secret_key",
        f"{order_id}|{payment_id}".encode(),
        hashlib.sha256,
    ).hexdigest()
    assert svc.verify_payment_signature(order_id=order_id, payment_id=payment_id, signature=sig)


def test_verify_payment_signature_rejects_bad():
    svc = RazorpayService(
        Settings(
            razorpay_key_id="rzp_test_abc",
            razorpay_key_secret="test_secret_key",
        )
    )
    assert not svc.verify_payment_signature(
        order_id="order_123", payment_id="pay_456", signature="bad"
    )
