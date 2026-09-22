import ssl

from app.database.connect_args import asyncpg_connect_args


def _clear_ssl_overrides(monkeypatch) -> None:
    for name in (
        "DATABASE_SSL_INSECURE",
        "DATABASE_SSL_DISABLE",
        "DATABASE_SSL_RELAX_HOSTNAME",
        "GITHUB_ACTIONS",
        "RENDER",
    ):
        monkeypatch.delenv(name, raising=False)


def test_default_uses_verifying_ssl_context(monkeypatch):
    _clear_ssl_overrides(monkeypatch)
    args = asyncpg_connect_args(command_timeout=30)
    assert args["command_timeout"] == 30
    assert args["statement_cache_size"] == 0
    ctx = args["ssl"]
    assert isinstance(ctx, ssl.SSLContext)
    assert ctx.verify_mode == ssl.CERT_REQUIRED


def test_insecure_mode_skips_verification(monkeypatch):
    _clear_ssl_overrides(monkeypatch)
    monkeypatch.setenv("DATABASE_SSL_INSECURE", "1")
    ctx = asyncpg_connect_args()["ssl"]
    assert isinstance(ctx, ssl.SSLContext)
    assert ctx.verify_mode == ssl.CERT_NONE


def test_render_uses_pooler_friendly_ssl(monkeypatch):
    _clear_ssl_overrides(monkeypatch)
    monkeypatch.setenv("RENDER", "true")
    ctx = asyncpg_connect_args()["ssl"]
    assert isinstance(ctx, ssl.SSLContext)
    assert ctx.verify_mode == ssl.CERT_NONE


def test_disable_ssl_returns_false(monkeypatch):
    _clear_ssl_overrides(monkeypatch)
    monkeypatch.setenv("DATABASE_SSL_DISABLE", "1")
    assert asyncpg_connect_args()["ssl"] is False
