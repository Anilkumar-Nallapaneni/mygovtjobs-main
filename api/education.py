"""Same-origin practice-test grading. Answer keys stay in backend data, not the site bundle."""

from collections import defaultdict
from pathlib import Path
import os
import re
import sys
import time
from urllib.parse import parse_qsl, urlencode

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

_SKIP_DIRS = {"_vendor", "site-packages", "dist-packages", "node_modules", ".venv", "__pycache__"}


def _mount_backend() -> str | None:
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
    message = f"{type(exc).__name__}: {exc}"
    message = re.sub(r"postgresql(?:\+\w+)?://\S+", "postgresql://***", message, flags=re.I)
    message = re.sub(r"(://)[^/\s]+@", r"\1***@", message)
    return message[:400]


_mounted = _mount_backend()
try:
    from app.routes.education import router

    _import_error = None
except Exception as exc:
    router = None
    _import_error = _safe_import_error(exc)
    print("education-bundle-missing", _mounted, _import_error)

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
if _import_error or router is None:
    @app.api_route("/{full_path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"])
    async def education_bundle_missing(full_path: str):
        return JSONResponse({"detail": "Practice-test grading package is not in the function bundle"}, status_code=500)
else:
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
