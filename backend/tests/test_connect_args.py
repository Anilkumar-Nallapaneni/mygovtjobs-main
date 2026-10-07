import ssl
import pytest

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


def test_legacy_insecure_flag_cannot_skip_verification(monkeypatch):
    monkeypatch.setenv("DATABASE_SSL_INSECURE", "1")
    ctx = asyncpg_connect_args()["ssl"]
    assert ctx.verify_mode == ssl.CERT_REQUIRED
    assert ctx.check_hostname is True


def test_render_verifies_pooler_ssl(monkeypatch):
    monkeypatch.delenv("DATABASE_SSL_INSECURE", raising=False)
    monkeypatch.delenv("GITHUB_ACTIONS", raising=False)
    monkeypatch.setenv("RENDER", "true")
    ctx = asyncpg_connect_args()["ssl"]
    assert ctx.verify_mode == ssl.CERT_REQUIRED
    assert ctx.check_hostname is True


def test_ci_and_legacy_disable_flags_cannot_disable_tls(monkeypatch):
    monkeypatch.setenv("GITHUB_ACTIONS", "true")
    monkeypatch.setenv("DATABASE_SSL_DISABLE", "1")
    monkeypatch.setenv("DATABASE_SSL_RELAX_HOSTNAME", "1")
    ctx = asyncpg_connect_args()["ssl"]
    assert ctx.verify_mode == ssl.CERT_REQUIRED
    assert ctx.check_hostname is True


def test_additional_ca_is_loaded_without_weakening_verification(monkeypatch):
    from unittest.mock import Mock
    ctx = Mock()
    monkeypatch.setattr(ssl, "create_default_context", lambda: ctx)
    monkeypatch.setenv("DATABASE_SSL_CA_FILE", "/trusted/provider-ca.pem")
    assert asyncpg_connect_args()["ssl"] is ctx
    assert ctx.load_verify_locations.call_args.kwargs == {"cafile": "/trusted/provider-ca.pem"}


@pytest.mark.parametrize("invalid_pem", [None, "not a certificate"])
def test_missing_or_invalid_ca_has_actionable_error(monkeypatch, tmp_path, invalid_pem):
    path = tmp_path / "provider.pem"
    if invalid_pem is not None:
        path.write_text(invalid_pem)
    monkeypatch.setenv("DATABASE_SSL_CA_FILE", str(path))
    with pytest.raises(RuntimeError, match="readable, valid trusted CA PEM"):
        asyncpg_connect_args()
