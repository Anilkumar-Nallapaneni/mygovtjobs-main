import json
import logging

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.middleware.admin_audit import AdminAuditMiddleware


def _audit_event(caplog) -> dict:
    record = next(item for item in caplog.records if item.name == "app.admin_audit")
    return json.loads(record.getMessage().removeprefix("admin_audit "))


def test_admin_request_is_audited_without_exposing_key(caplog):
    app = FastAPI()
    app.add_middleware(AdminAuditMiddleware)

    @app.get("/api/admin/ping")
    async def ping():
        return {"ok": True}

    with caplog.at_level(logging.INFO, logger="app.admin_audit"):
        response = TestClient(app).get(
            "/api/admin/ping",
            headers={"X-Admin-Key": "do-not-log-this", "X-Request-ID": "audit-123"},
        )

    event = _audit_event(caplog)
    assert response.status_code == 200
    assert response.headers["X-Request-ID"] == "audit-123"
    assert event["request_id"] == "audit-123"
    assert event["path"] == "/api/admin/ping"
    assert event["outcome"] == "allowed"
    assert event["credential_present"] is True
    assert "do-not-log-this" not in caplog.text


def test_public_request_is_not_written_to_admin_audit(caplog):
    app = FastAPI()
    app.add_middleware(AdminAuditMiddleware)

    @app.get("/api/jobs")
    async def jobs():
        return []

    with caplog.at_level(logging.INFO, logger="app.admin_audit"):
        response = TestClient(app).get("/api/jobs")

    assert response.status_code == 200
    assert not [item for item in caplog.records if item.name == "app.admin_audit"]
