"""Admin API key middleware tests."""

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.config import get_settings
from app.middleware.auth import require_admin_key


@pytest.fixture(autouse=True)
def _reset_settings_cache():
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def _client_with_route():
    app = FastAPI()

    @app.get("/protected", dependencies=[__import__("fastapi").Depends(require_admin_key)])
    def protected():
        return {"ok": True}

    return TestClient(app)


def test_admin_key_required_when_configured(monkeypatch):
    monkeypatch.setenv("ADMIN_API_KEY", "secret-key")
    client = _client_with_route()
    assert client.get("/protected").status_code == 401
    assert client.get("/protected", headers={"X-Admin-Key": "secret-key"}).status_code == 200


def test_admin_key_rejects_wrong_key(monkeypatch):
    monkeypatch.setenv("ADMIN_API_KEY", "secret-key")
    client = _client_with_route()
    assert client.get("/protected", headers={"X-Admin-Key": "wrong"}).status_code == 401


def test_insecure_admin_allowed_in_dev(monkeypatch):
    monkeypatch.setenv("ADMIN_API_KEY", "")
    monkeypatch.setenv("ALLOW_INSECURE_ADMIN", "1")
    monkeypatch.setenv("APP_ENV", "development")
    get_settings.cache_clear()
    client = _client_with_route()
    assert client.get("/protected").status_code == 200
