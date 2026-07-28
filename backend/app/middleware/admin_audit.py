"""Structured audit logging for privileged API requests."""

from __future__ import annotations

import json
import logging
import re
import time
from uuid import uuid4

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

from app.middleware.rate_limit import client_ip

logger = logging.getLogger("app.admin_audit")

_PRIVILEGED_PREFIXES = ("/api/admin", "/api/ingest")
_REQUEST_ID_RE = re.compile(r"^[A-Za-z0-9._:-]{1,128}$")


def _request_id(request: Request) -> str:
    supplied = (request.headers.get("x-request-id") or "").strip()
    return supplied if _REQUEST_ID_RE.fullmatch(supplied) else str(uuid4())


class AdminAuditMiddleware(BaseHTTPMiddleware):
    """Record privileged attempts without logging credentials or request bodies."""

    async def dispatch(self, request: Request, call_next):
        if not request.url.path.startswith(_PRIVILEGED_PREFIXES):
            return await call_next(request)

        request_id = _request_id(request)
        started = time.perf_counter()
        status_code = 500
        try:
            response = await call_next(request)
            status_code = response.status_code
            response.headers["X-Request-ID"] = request_id
            return response
        finally:
            event = {
                "event": "privileged_api_request",
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": status_code,
                "outcome": "allowed" if status_code < 400 else "denied",
                "client_ip": client_ip(request),
                "credential_present": bool(request.headers.get("x-admin-key")),
                "duration_ms": round((time.perf_counter() - started) * 1000, 2),
            }
            logger.info("admin_audit %s", json.dumps(event, separators=(",", ":")))
