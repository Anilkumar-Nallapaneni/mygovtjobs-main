from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_subscribe_rate_limited(monkeypatch):
    monkeypatch.setenv("ALERT_SUBSCRIBE_RATE_LIMIT_PER_MINUTE", "1")
    from app.config import get_settings
    from app.middleware import rate_limit as rate_limit_module

    get_settings.cache_clear()
    rate_limit_module._subscribe_limiter = None

    async def fake_subscribe(_body):
        return "test-sub-id"

    monkeypatch.setattr("app.routes.alerts.service.subscribe", fake_subscribe)

    payload = {
        "channel": "email",
        "channel_address": "user@example.com",
        "website": "",
    }
    first = client.post("/api/alerts/subscribe", json=payload)
    second = client.post("/api/alerts/subscribe", json={**payload, "channel_address": "other@example.com"})

    get_settings.cache_clear()
    rate_limit_module._subscribe_limiter = None

    assert first.status_code == 200
    assert second.status_code == 429


def test_subscribe_honeypot_silently_accepts():
    res = client.post(
        "/api/alerts/subscribe",
        json={
            "channel": "email",
            "channel_address": "bot@spam.example",
            "website": "https://spam.example",
        },
    )
    assert res.status_code == 200
    assert res.json()["status"] == "subscribed"
    assert res.json()["id"] == "ok"
