import ssl

from app.database.connect_args import asyncpg_connect_args


def test_default_uses_verifying_ssl_context(monkeypatch):
    monkeypatch.delenv("DATABASE_SSL_INSECURE", raising=False)
    monkeypatch.delenv("DATABASE_SSL_DISABLE", raising=False)
    monkeypatch.delenv("GITHUB_ACTIONS", raising=False)
    args = asyncpg_connect_args(command_timeout=30)
    assert args["command_timeout"] == 30
    assert args["statement_cache_size"] == 0
    ctx = args["ssl"]
    assert isinstance(ctx, ssl.SSLContext)
    assert ctx.verify_mode == ssl.CERT_REQUIRED


def test_insecure_mode_skips_verification(monkeypatch):
    monkeypatch.setenv("DATABASE_SSL_INSECURE", "1")
    ctx = asyncpg_connect_args()["ssl"]
    assert ctx.verify_mode == ssl.CERT_NONE


def test_render_uses_pooler_friendly_ssl(monkeypatch):
    monkeypatch.delenv("DATABASE_SSL_INSECURE", raising=False)
    monkeypatch.delenv("GITHUB_ACTIONS", raising=False)
    monkeypatch.setenv("RENDER", "true")
    ctx = asyncpg_connect_args()["ssl"]
    assert ctx.verify_mode == ssl.CERT_NONE
