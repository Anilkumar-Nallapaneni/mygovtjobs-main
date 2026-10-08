"""Same-origin, read-only India API for the existing Vite Vercel project.

Reuse the FastAPI router and SQL queries; never start ingest or expose admin routes.
"""
from pathlib import Path
import os
import sys
from urllib.parse import parse_qsl, urlencode

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.database.session import SessionLocal
from app.middleware.rate_limit import SlidingWindowRateLimiter, client_ip
from app.routes.india import router

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
app.include_router(router, prefix="/api/india")
_india_limiter = SlidingWindowRateLimiter(max_requests=60, window_seconds=60)


@app.middleware("http")
async def vercel_india_path(request: Request, call_next):
    # Vercel targets the single function, passing the captured route explicitly.
    # Also accept original ASGI paths, as used by local uvicorn and API tests.
    if os.environ.get("VERCEL") and not (os.environ.get("DATABASE_URL") or "").strip():
        return JSONResponse({"detail": "India API server database is not configured"}, status_code=503)
    if not await _india_limiter.allow(client_ip(request)):
        return JSONResponse({"detail": "Rate limit exceeded"}, status_code=429)
    if request.scope["path"] in {"/api/india", "/api/india/"}:
        params = parse_qsl(request.scope.get("query_string", b"").decode(), keep_blank_values=True)
        route = next((value for key, value in params if key == "_india_path"), "")
        if route:
            if any(part in {".", ".."} for part in route.split("/")):
                return JSONResponse({"detail": "Invalid India API path"}, status_code=400)
            path = "/api/india/" + route.lstrip("/")
            request.scope["path"] = path
            request.scope["raw_path"] = path.encode()
            request.scope["query_string"] = urlencode([(k, v) for k, v in params if k != "_india_path"]).encode()
    return await call_next(request)


@app.exception_handler(SQLAlchemyError)
@app.exception_handler(ConnectionError)
@app.exception_handler(OSError)
async def database_unavailable(_request: Request, _error: Exception):
    # Do not send DB URLs, credentials, raw SQL or driver error details to clients.
    return JSONResponse({"detail": "Verified India database service unavailable"}, status_code=503)


@app.get("/api/india/health")
async def india_health():
    async with SessionLocal() as session:
        await session.execute(text("SELECT 1"))
    return {"status": "ok", "service": "india", "database": "connected"}
