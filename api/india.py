"""Same-origin, read-only India API for the existing Vite Vercel project.

Reuse the FastAPI router and SQL queries; never start ingest or expose admin routes.
"""
from pathlib import Path
import os
import re
import sys
from urllib.parse import parse_qsl, urlencode

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

_SKIP_DIRS = {"_vendor", "site-packages", "dist-packages", "node_modules", ".venv", "__pycache__"}


def _mount_backend() -> str | None:
    """Find the backend package whether it sits next to the repo or in the function bundle."""
    here = Path(__file__).resolve()
    roots: list[Path] = []
    for candidate in (
        here.parents[1] / "backend" if len(here.parents) > 1 else None,
        here.parent / "backend",
        Path("/var/task/backend"),
        Path("/var/task"),
    ):
        if candidate is not None and candidate.is_dir() and candidate not in roots:
            roots.append(candidate)
    for root in roots:
        if (root / "app" / "__init__.py").is_file():
            sys.path.insert(0, str(root))
            return str(root)
    for root in roots:
        base_depth = len(root.parts)
        for dirpath, dirnames, filenames in os.walk(root):
            depth = len(Path(dirpath).parts) - base_depth
            dirnames[:] = [name for name in dirnames if name not in _SKIP_DIRS and "env" not in name.lower()]
            if depth > 5:
                dirnames.clear()
                continue
            if Path(dirpath).name == "app" and "__init__.py" in filenames:
                found = Path(dirpath).parent
                sys.path.insert(0, str(found))
                return str(found)
    return None


def _safe_import_error(exc: BaseException) -> str:
    text = f"{type(exc).__name__}: {exc}"
    text = re.sub(r"postgresql(?:\+\w+)?://\S+", "postgresql://***", text, flags=re.I)
    text = re.sub(r"(://)[^/\s]+@", r"\1***@", text)
    return text[:400]


_mounted = _mount_backend()
try:
    from sqlalchemy import text
    from sqlalchemy.exc import SQLAlchemyError

    from app.database.session import SessionLocal
    from app.middleware.rate_limit import SlidingWindowRateLimiter, client_ip
    from app.routes.india import router

    _import_error = None
except Exception as exc:
    text = None
    SQLAlchemyError = Exception
    SessionLocal = None
    SlidingWindowRateLimiter = None
    client_ip = None
    router = None
    _import_error = _safe_import_error(exc)
    print("india-bundle-missing", _mounted, _import_error)

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
if _import_error or router is None or SessionLocal is None or SlidingWindowRateLimiter is None:
    @app.api_route("/{full_path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"])
    async def india_bundle_missing(full_path: str):
        return JSONResponse({"detail": "India API package is not in the function bundle"}, status_code=500)
else:
    app.include_router(router, prefix="/api/india")
_india_limiter = SlidingWindowRateLimiter(max_requests=60, window_seconds=60) if SlidingWindowRateLimiter else None


@app.middleware("http")
async def vercel_india_path(request: Request, call_next):
    # Vercel targets the single function, passing the captured route explicitly.
    # Also accept original ASGI paths, as used by local uvicorn and API tests.
    if _import_error or _india_limiter is None or client_ip is None:
        return JSONResponse({"detail": "India API package is not in the function bundle"}, status_code=500)
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
    if SessionLocal is None or text is None:
        return JSONResponse({"detail": "India API package is not in the function bundle"}, status_code=500)
    async with SessionLocal() as session:
        await session.execute(text("SELECT 1"))
    return {"status": "ok", "service": "india", "database": "connected"}
