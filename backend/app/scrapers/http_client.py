"""Shared httpx helpers for scrapers."""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from dataclasses import dataclass
import logging
import ssl
import httpx

from app.utils.url_safety import assert_safe_url, host_allows_legacy_tls

logger = logging.getLogger(__name__)

DEFAULT_MAX_RETRIES = 3
DEFAULT_RETRY_BACKOFF = 1.5


def _headers(user_agent: str | None) -> dict[str, str]:
    ua = user_agent or "MyGovtJobs/1.0 (+https://github.com/gov-job-alert)"
    return {
        "User-Agent": ua,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-IN,en;q=0.9,hi;q=0.8",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
    }


def _legacy_gov_ssl_context() -> ssl.SSLContext:
    """Many Indian government portals still need older TLS/cert tolerance."""
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    if hasattr(ssl, "TLSVersion"):
        ctx.minimum_version = ssl.TLSVersion.TLSv1
    legacy_connect = getattr(ssl, "OP_LEGACY_SERVER_CONNECT", 0)
    if legacy_connect:
        ctx.options |= legacy_connect
    return ctx


async def _ssrf_request_hook(request: httpx.Request) -> None:
    """Re-validate every hop (including redirects) before the request is sent."""
    assert_safe_url(str(request.url))


@asynccontextmanager
async def create_async_client(
    *,
    timeout: float = 30,
    user_agent: str | None = None,
    allow_legacy_tls: bool = False,
    url_for_tls_policy: str | None = None,
) -> AsyncIterator[httpx.AsyncClient]:
    """Create an httpx client with SSRF redirect re-checks.

    Legacy TLS (verify off) is off by default. Pass allow_legacy_tls=True only
    for known broken gov portals, or pass url_for_tls_policy so the host suffix
    allowlist can enable it automatically.
    """
    use_legacy = allow_legacy_tls
    if url_for_tls_policy and host_allows_legacy_tls(url_for_tls_policy):
        use_legacy = True

    async with httpx.AsyncClient(
        timeout=timeout,
        follow_redirects=True,
        headers=_headers(user_agent),
        verify=_legacy_gov_ssl_context() if use_legacy else True,
        event_hooks={"request": [_ssrf_request_hook]},
    ) as client:
        yield client


@dataclass(frozen=True)
class TextResponse:
    text: str
    status_code: int
    url: str


def _is_retryable_http_error(exc: Exception) -> bool:
    if isinstance(exc, httpx.TimeoutException | httpx.NetworkError | httpx.ConnectError):
        return True
    if isinstance(exc, httpx.HTTPStatusError):
        code = exc.response.status_code
        return code == 429 or code >= 500
    if isinstance(exc, ValueError) and str(exc).startswith("Blocked"):
        return False
    return False


async def get_text(
    url: str,
    *,
    user_agent: str | None = None,
    timeout: float = 30,
    max_retries: int = DEFAULT_MAX_RETRIES,
    retry_backoff: float = DEFAULT_RETRY_BACKOFF,
) -> TextResponse:
    last_exc: Exception | None = None
    for attempt in range(max_retries):
        try:
            async with create_async_client(
                timeout=timeout,
                user_agent=user_agent,
                url_for_tls_policy=url,
            ) as client:
                res: httpx.Response = await client.get(url)
                res.raise_for_status()
                return TextResponse(text=res.text, status_code=res.status_code, url=str(res.url))
        except Exception as exc:
            last_exc = exc
            if attempt >= max_retries - 1 or not _is_retryable_http_error(exc):
                raise
            delay = retry_backoff**attempt
            logger.warning(
                "get_text retry %s/%s url=%s err=%s sleep=%.1fs",
                attempt + 1,
                max_retries,
                url,
                exc,
                delay,
            )
            await asyncio.sleep(delay)
    raise last_exc  # pragma: no cover
