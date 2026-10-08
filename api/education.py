"""Same-origin practice-test grading. Answer keys stay in backend data, not the site bundle."""

from collections import defaultdict
from pathlib import Path
import os
import sys
import time
from urllib.parse import parse_qsl, urlencode

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.routes.education import router

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
app.include_router(router, prefix="/api/education")
_hits: dict[str, list[float]] = defaultdict(list)


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


async def _allow(key: str, limit: int = 30, window: int = 60) -> bool:
    now = time.time()
    recent = [hit for hit in _hits[key] if now - hit < window]
    if len(recent) >= limit:
        _hits[key] = recent
        return False
    recent.append(now)
    _hits[key] = recent
    return True


@app.middleware("http")
async def vercel_education_path(request: Request, call_next):
    if not await _allow(_client_ip(request)):
        return JSONResponse({"detail": "Rate limit exceeded"}, status_code=429)
    if os.environ.get("VERCEL") and request.scope["path"] in {"/api/education", "/api/education/"}:
        params = parse_qsl(request.scope.get("query_string", b"").decode(), keep_blank_values=True)
        route = next((value for key, value in params if key == "_education_path"), "")
        if route:
            if any(part in {".", ".."} for part in route.split("/")):
                return JSONResponse({"detail": "Invalid education API path"}, status_code=400)
            path = "/api/education/" + route.lstrip("/")
            request.scope["path"] = path
            request.scope["raw_path"] = path.encode()
            request.scope["query_string"] = urlencode(
                [(key, value) for key, value in params if key != "_education_path"]
            ).encode()
    return await call_next(request)
