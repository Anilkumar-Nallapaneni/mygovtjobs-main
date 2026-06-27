from functools import lru_cache
from pathlib import Path

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(str(REPO_ROOT / ".env"), str(REPO_ROOT / "backend" / ".env")),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/mygovtjobs"
    supabase_url: str | None = None
    supabase_service_role_key: str | None = None
    sql_echo: bool = False
    live_jobs_json_path: str = str(REPO_ROOT / "frontend" / "public" / "data" / "live-jobs.json")
    cors_origins: str = (
        "http://localhost:2222,http://localhost:2223,http://127.0.0.1:2222,"
        "http://127.0.0.1:2223"
    )
    admin_api_key: str | None = None
    allow_insecure_admin: bool = False
    app_env: str = "development"
    allow_fallback_json_export: bool = True
    rate_limit_per_minute: int = 120
    alert_subscribe_rate_limit_per_minute: int = 8
    redis_url: str | None = None
    job_details_storage_bucket: str = "job-details"
    trusted_proxy_ips: str = "127.0.0.1,::1"
    ingest_lookback_days: int = 60
    ingest_max_items_per_source: int = 120
    ingest_concurrency: int = 6
    ingest_skip_per_source_export: bool = False  # set INGEST_SKIP_PER_SOURCE_EXPORT=1 during batch ingest
    pdf_ocr_enabled: bool = True  # Tesseract via pymupdf; off by default in production (see validator)
    database_command_timeout: int = 120  # asyncpg command timeout (seconds); avoids Supabase pooler cancel
    # Daily IngestAgent run — 8:00 AM IST, once per calendar day
    daily_sync_hour_ist: int = 8
    daily_sync_minute_ist: int = 0
    daily_sync_enforce_once: bool = True
    daily_sync_state_path: str = str(REPO_ROOT / "frontend" / "public" / "data" / "daily-sync-state.json")
    # Alert delivery (email via Resend, Telegram bot)
    resend_api_key: str | None = None
    alert_from_email: str = "My Govt Jobs <onboarding@resend.dev>"
    contact_to_email: str = "contact@govtjobs.me"
    telegram_bot_token: str | None = None
    alert_site_url: str = "https://govtjobs.me"
    alert_delivery_lookback_hours: int = 48
    alert_delivery_after_sync: bool = False
    twilio_account_sid: str | None = None
    twilio_auth_token: str | None = None
    twilio_whatsapp_from: str | None = None
    # Web push — POST subscription token + message to your push bridge (e.g. FCM relay)
    push_webhook_url: str | None = None
    sentry_dsn: str | None = None
    sentry_traces_sample_rate: float = 0.1
    # Razorpay Premium (India) — https://dashboard.razorpay.com
    razorpay_key_id: str | None = None
    razorpay_key_secret: str | None = None
    razorpay_webhook_secret: str | None = None
    razorpay_premium_amount_paise: int = 9900  # ₹99
    razorpay_premium_description: str = "My Govt Jobs Premium — instant alerts & priority support"
    razorpay_checkout_name: str = "My Govt Jobs"

    @model_validator(mode="after")
    def _production_defaults(self) -> "Settings":
        # Docker/Railway/Render images omit Tesseract unless explicitly installed.
        if self.app_env.strip().lower() == "production" and not _env_explicit("PDF_OCR_ENABLED"):
            object.__setattr__(self, "pdf_ocr_enabled", False)
        return self


def _env_explicit(name: str) -> bool:
    import os

    return name in os.environ


@lru_cache
def get_settings() -> Settings:
    return Settings()
