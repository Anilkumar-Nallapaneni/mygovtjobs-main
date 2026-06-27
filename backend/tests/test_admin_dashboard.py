"""Admin dashboard endpoint tests."""

from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_admin_dashboard_requires_key(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.delenv("ALLOW_INSECURE_ADMIN", raising=False)
    monkeypatch.delenv("ADMIN_API_KEY", raising=False)
    from app.config import get_settings

    get_settings.cache_clear()
    res = client.get("/api/admin/dashboard")
    get_settings.cache_clear()
    assert res.status_code in (401, 503)


def test_admin_dashboard_shape_with_key(monkeypatch):
    monkeypatch.setenv("ADMIN_API_KEY", "test-admin-key")
    monkeypatch.setenv("ALLOW_INSECURE_ADMIN", "1")
    from app.config import get_settings

    get_settings.cache_clear()

    class FakeSession:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return None

        async def execute(self, _stmt):
            return MagicMock(scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=[]))))

    with patch("app.routes.admin.SessionLocal", lambda: FakeSession()):
        with patch(
            "app.routes.admin.SupabaseAuditService.table_counts",
            new_callable=AsyncMock,
            return_value={"jobs": 1, "raw_ingest_total": 0},
        ):
            res = client.get("/api/admin/dashboard", headers={"X-Admin-Key": "test-admin-key"})

    get_settings.cache_clear()
    assert res.status_code == 200
    body = res.json()
    assert "jobs" in body
    assert "scrapers" in body
    assert "ingest" in body
