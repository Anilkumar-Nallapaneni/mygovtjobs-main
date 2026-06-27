"""Shared httpx helpers for scrapers."""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from dataclasses import dataclass
import ssl
import httpx


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


@asynccontextmanager
async def create_async_client(
    *,
    timeout: float = 30,
    user_agent: str | None = None,
    allow_legacy_tls: bool = True,
) -> AsyncIterator[httpx.AsyncClient]:
    async with httpx.AsyncClient(
        timeout=timeout,
        follow_redirects=True,
        headers=_headers(user_agent),
        verify=_legacy_gov_ssl_context() if allow_legacy_tls else True,
    ) as client:
        yield client


@dataclass(frozen=True)
class TextResponse:
    text: str
    status_code: int
    url: str


async def get_text(url: str, *, user_agent: str | None = None, timeout: float = 30) -> TextResponse:
    async with create_async_client(timeout=timeout, user_agent=user_agent) as client:
        res: httpx.Response = await client.get(url)
        res.raise_for_status()
        return TextResponse(text=res.text, status_code=res.status_code, url=str(res.url))
