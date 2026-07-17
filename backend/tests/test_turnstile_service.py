"""Turnstile fail-open (dev) vs fail-closed (production)."""

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.turnstile_service import verify_turnstile


def test_missing_secret_allows_in_development():
    with patch("app.services.turnstile_service.get_settings") as gs:
        gs.return_value = MagicMock(app_env="development", turnstile_secret_key=None)
        assert asyncio.run(verify_turnstile(None)) is True
        assert asyncio.run(verify_turnstile("any")) is True


def test_missing_secret_rejects_in_production():
    with patch("app.services.turnstile_service.get_settings") as gs:
        gs.return_value = MagicMock(app_env="production", turnstile_secret_key=None)
        assert asyncio.run(verify_turnstile(None)) is False
        assert asyncio.run(verify_turnstile("token")) is False


def test_empty_token_rejected_when_secret_set():
    with patch("app.services.turnstile_service.get_settings") as gs:
        gs.return_value = MagicMock(app_env="development", turnstile_secret_key="sec")
        assert asyncio.run(verify_turnstile(None)) is False
        assert asyncio.run(verify_turnstile("  ")) is False


def test_cloudflare_success():
    mock_res = MagicMock()
    mock_res.json.return_value = {"success": True}
    mock_client = AsyncMock()
    mock_client.__aenter__.return_value = mock_client
    mock_client.post = AsyncMock(return_value=mock_res)

    with patch("app.services.turnstile_service.get_settings") as gs:
        gs.return_value = MagicMock(app_env="production", turnstile_secret_key="sec")
        with patch("app.services.turnstile_service.httpx.AsyncClient", return_value=mock_client):
            assert asyncio.run(verify_turnstile("tok", remote_ip="1.2.3.4")) is True
