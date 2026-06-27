"""HTTP route integration tests (TestClient)."""

from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient

from app.main import app
from app.services.job_service import DatabaseUnavailableError

client = TestClient(app)


def test_root_returns_service_info():
    res = client.get("/")
    assert res.status_code == 200
    assert res.json().get("service") == "mygovtjobs-api"


def test_health_reports_db_status(monkeypatch):
    class FakeSession:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return None

        async def execute(self, _stmt):
            return MagicMock()

    monkeypatch.setattr("app.database.session.SessionLocal", lambda: FakeSession())

    res = client.get("/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] in ("ok", "degraded")
    assert "database" in body


def test_health_degraded_when_db_fails(monkeypatch):
    class BrokenSession:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return None

        async def execute(self, _stmt):
            raise ConnectionError("db down")

    monkeypatch.setattr("app.database.session.SessionLocal", lambda: BrokenSession())

    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "degraded"
    assert res.json()["database"]["connected"] is False


def test_list_jobs_503_when_db_unavailable():
    with patch("app.routes.jobs.service.list_jobs", new_callable=AsyncMock) as mock_list:
        mock_list.side_effect = DatabaseUnavailableError()
        res = client.get("/api/jobs?limit=5")
    assert res.status_code == 503


def test_get_job_404_when_missing():
    with patch("app.routes.jobs.service.get_by_slug", new_callable=AsyncMock, return_value=None):
        res = client.get("/api/jobs/nonexistent-slug-xyz")
    assert res.status_code == 404


def test_admin_stats_requires_key(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.delenv("ALLOW_INSECURE_ADMIN", raising=False)
    monkeypatch.delenv("ADMIN_API_KEY", raising=False)
    from app.config import get_settings

    get_settings.cache_clear()
    res = client.get("/api/admin/stats")
    get_settings.cache_clear()
    assert res.status_code in (401, 503)


def test_meta_states_returns_static_list():
    res = client.get("/api/meta/states")
    assert res.status_code == 200
    data = res.json()
    items = data.get("items", data) if isinstance(data, dict) else data
    assert isinstance(items, list)
    assert len(items) >= 28


def test_list_jobs_returns_payload():
    from app.schemas.job import JobListResponse, JobOut

    mock_item = JobOut(
        id="1",
        slug="test-job",
        title="SSC CGL 2026",
        dept="SSC",
        category="ssc",
        state_codes=["up"],
        vacancies=100,
        qualification="Graduate",
        salary=None,
        age_limit=None,
        last_date=None,
        apply_url="https://ssc.gov.in/n.pdf",
        pdf_url=None,
        status="live",
        published_at=None,
        post_name=None,
        posts=[],
        important_dates=[],
        detail={},
    )
    with patch("app.routes.jobs.service.list_jobs", new_callable=AsyncMock, return_value=([mock_item], 1)):
        with patch("app.routes.jobs.service.list_jobs_etag", new_callable=AsyncMock, return_value="jobs-1"):
            res = client.get("/api/jobs?limit=1")
    assert res.status_code == 200
    body = res.json()
    assert body["total"] == 1
    assert body["items"][0]["slug"] == "test-job"


def test_subscribe_validation_422():
    res = client.post("/api/alerts/subscribe", json={"channel": "email", "channel_address": "not-an-email"})
    assert res.status_code == 422
