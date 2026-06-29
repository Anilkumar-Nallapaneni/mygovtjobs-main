import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from app.scrapers.http_client import TextResponse, get_text


def test_get_text_retries_on_timeout():
    client = AsyncMock()
    client.get = AsyncMock(side_effect=[httpx.TimeoutException("timeout"), httpx.Response(200, text="ok", request=MagicMock())])
    client.__aenter__ = AsyncMock(return_value=client)
    client.__aexit__ = AsyncMock(return_value=None)

    with patch("app.scrapers.http_client.create_async_client") as ctx:
        ctx.return_value.__aenter__ = AsyncMock(return_value=client)
        ctx.return_value.__aexit__ = AsyncMock(return_value=None)
        with patch("app.scrapers.http_client.asyncio.sleep", new_callable=AsyncMock):
            result = asyncio.run(get_text("https://example.gov.in/feed", max_retries=2))

    assert isinstance(result, TextResponse)
    assert result.text == "ok"
    assert client.get.await_count == 2


def test_get_text_does_not_retry_404():
    client = AsyncMock()
    req = httpx.Request("GET", "https://example.gov.in/missing")
    client.get = AsyncMock(return_value=httpx.Response(404, request=req))
    client.__aenter__ = AsyncMock(return_value=client)
    client.__aexit__ = AsyncMock(return_value=None)

    with patch("app.scrapers.http_client.create_async_client") as ctx:
        ctx.return_value.__aenter__ = AsyncMock(return_value=client)
        ctx.return_value.__aexit__ = AsyncMock(return_value=None)
        with pytest.raises(httpx.HTTPStatusError):
            asyncio.run(get_text("https://example.gov.in/missing", max_retries=3))

    assert client.get.await_count == 1
