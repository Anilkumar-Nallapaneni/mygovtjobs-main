from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_contact_honeypot_silently_accepts():
    res = client.post(
        "/api/contact",
        json={
            "name": "Bot",
            "email": "bot@spam.example",
            "message": "spam message here",
            "website": "https://spam.example",
        },
    )
    assert res.status_code == 200
    assert res.json()["status"] == "sent"


def test_contact_rate_limited(monkeypatch):
    monkeypatch.setenv("ALERT_SUBSCRIBE_RATE_LIMIT_PER_MINUTE", "1")
    from app.config import get_settings
    from app.middleware import rate_limit as rate_limit_module

    get_settings.cache_clear()
    rate_limit_module._subscribe_limiter = None

    async def fake_send(_body):
        return True

    async def fake_turnstile(*_a, **_k):
        return True

    monkeypatch.setattr("app.routes.contact.send_contact_email", fake_send)
    monkeypatch.setattr("app.routes.contact.verify_turnstile", fake_turnstile)

    payload = {
        "name": "Test User",
        "email": "user@example.com",
        "message": "This is a test message for the contact form.",
        "website": "",
    }
    first = client.post("/api/contact", json=payload)
    second = client.post(
        "/api/contact",
        json={**payload, "email": "other@example.com"},
    )

    get_settings.cache_clear()
    rate_limit_module._subscribe_limiter = None

    assert first.status_code == 200
    assert second.status_code == 429
