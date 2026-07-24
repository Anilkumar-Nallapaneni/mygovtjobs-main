"""HTTP integration tests for public + admin routes."""

import os

import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def _reset_settings_cache():
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def test_jobs_list_returns_paginated_shape():
    res = client.get("/api/jobs", params={"limit": 5, "offset": 0})
    if res.status_code == 503:
        pytest.skip("database unavailable")
    assert res.status_code == 200
    body = res.json()
    assert "items" in body
    assert "total" in body
    assert body["limit"] == 5
    assert isinstance(body["items"], list)


def test_jobs_list_etag_changes_with_filters():
    res_a = client.get("/api/jobs", params={"limit": 10, "state": "up"})
    res_b = client.get("/api/jobs", params={"limit": 10, "state": "mh"})
    if res_a.status_code == 503:
        pytest.skip("database unavailable")
    assert res_a.status_code == 200
    assert res_b.status_code == 200
    etag_a = res_a.headers.get("etag")
    etag_b = res_b.headers.get("etag")
    assert etag_a and etag_b
    assert etag_a != etag_b


def test_jobs_list_supports_304_not_modified():
    """Live DB: 304 when ETag stable. Skip if concurrent writes keep bumping updated_at."""
    for _ in range(6):
        first = client.get("/api/jobs", params={"limit": 5})
        if first.status_code == 503:
            pytest.skip("database unavailable")
        etag = first.headers.get("etag")
        assert etag
        second = client.get("/api/jobs", params={"limit": 5}, headers={"If-None-Match": etag})
        if second.status_code == 304:
            assert second.headers.get("etag") == etag
            return
        # Max(updated_at) moved between GETs (enrich/ingest) — retry
    pytest.skip("etag unstable under concurrent DB writes")


def test_admin_stats_requires_key_when_configured(monkeypatch):
    monkeypatch.setenv("ADMIN_API_KEY", "test-secret-key")
    monkeypatch.setenv("APP_ENV", "development")
    res = client.get("/api/admin/stats")
    assert res.status_code == 401

    res_ok = client.get("/api/admin/stats", headers={"X-Admin-Key": "test-secret-key"})
    assert res_ok.status_code == 200
    assert "jobs" in res_ok.json()


def test_admin_stats_rejects_wrong_key(monkeypatch):
    monkeypatch.setenv("ADMIN_API_KEY", "correct-key")
    res = client.get("/api/admin/stats", headers={"X-Admin-Key": "wrong-key"})
    assert res.status_code == 401


def test_root_hides_docs_in_production(monkeypatch):
    import importlib

    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("CORS_ORIGINS", "https://example.com")
    get_settings.cache_clear()
    from app import main as main_module

    importlib.reload(main_module)
    prod_client = TestClient(main_module.app)
    try:
        res = prod_client.get("/")
        assert res.status_code == 200
        assert "docs" not in res.json()
        assert prod_client.get("/docs").status_code == 404
    finally:
        monkeypatch.delenv("APP_ENV", raising=False)
        get_settings.cache_clear()
        importlib.reload(main_module)
