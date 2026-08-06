from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi

from app.config import get_settings
from app.middleware.admin_audit import AdminAuditMiddleware
from app.middleware.rate_limit import RateLimitMiddleware
from app.routes import admin, alerts, billing, contact, health, ingest, job_reports, jobs, meta

load_dotenv()

_settings = get_settings()
_is_production = _settings.app_env == "production"

if _settings.sentry_dsn:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration

    sentry_sdk.init(
        dsn=_settings.sentry_dsn,
        environment=_settings.app_env,
        traces_sample_rate=_settings.sentry_traces_sample_rate,
        integrations=[FastApiIntegration()],
    )

app = FastAPI(
    title="My Govt Jobs API",
    description="Government job listings, ingestion, and alerts",
    version="0.2.0",
    docs_url=None if _is_production else "/docs",
    redoc_url=None if _is_production else "/redoc",
    openapi_url=None if _is_production else "/openapi.json",
)

_origins = [o.strip() for o in _settings.cors_origins.split(",") if o.strip()]
if not _origins:
    _origins = (
        ["http://localhost:3689", "http://127.0.0.1:3689"]
        if not _is_production
        else []
    )
if not _origins and _is_production:
    raise RuntimeError("CORS_ORIGINS must be set in production")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RateLimitMiddleware, max_requests=_settings.rate_limit_per_minute)
app.add_middleware(AdminAuditMiddleware)

app.include_router(health.router, tags=["health"])
app.include_router(jobs.router, prefix="/api/jobs", tags=["jobs"])
app.include_router(jobs.router, prefix="/api/search", tags=["search"])
app.include_router(meta.router, prefix="/api/meta", tags=["meta"])
app.include_router(ingest.router, prefix="/api/ingest", tags=["ingest"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["alerts"])
app.include_router(contact.router, prefix="/api/contact", tags=["contact"])
app.include_router(job_reports.router, prefix="/api/job-reports", tags=["job-reports"])
app.include_router(billing.router, prefix="/api/billing", tags=["billing"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])


def _custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    schema.setdefault("components", {}).setdefault("securitySchemes", {})["AdminApiKey"] = {
        "type": "apiKey",
        "in": "header",
        "name": "X-Admin-Key",
        "description": "Admin API key for ingest and management routes",
    }
    for path, methods in schema.get("paths", {}).items():
        if path.startswith("/api/admin") or path.startswith("/api/ingest"):
            for operation in methods.values():
                if isinstance(operation, dict):
                    operation["security"] = [{"AdminApiKey": []}]
    app.openapi_schema = schema
    return app.openapi_schema


if not _is_production:
    app.openapi = _custom_openapi


@app.get("/")
def root():
    settings = get_settings()
    payload = {"service": "mygovtjobs-api", "version": "0.2.0"}
    if settings.app_env != "production":
        payload["docs"] = "/docs"
    return payload
