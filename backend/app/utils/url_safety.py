"""Block SSRF targets when fetching scraped URLs."""

from __future__ import annotations

import ipaddress
import socket
from urllib.parse import urlparse

_BLOCKED_HOSTS = frozenset(
    {
        "localhost",
        "127.0.0.1",
        "0.0.0.0",
        "::1",
        "metadata.google.internal",
    }
)


def _ip_blocked(addr: str) -> bool:
    try:
        ip = ipaddress.ip_address(addr)
    except ValueError:
        return True
    return bool(
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_reserved
        or ip.is_multicast
    )


def assert_safe_url(url: str) -> None:
    """Raise ValueError if URL must not be fetched."""
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise ValueError(f"Blocked URL scheme: {parsed.scheme or '(none)'}")
    host = (parsed.hostname or "").strip().lower()
    if not host or host in _BLOCKED_HOSTS:
        raise ValueError("Blocked URL host")
    if host.endswith(".local") or host.endswith(".internal"):
        raise ValueError("Blocked internal hostname")

    try:
        infos = socket.getaddrinfo(host, parsed.port or (443 if parsed.scheme == "https" else 80))
    except socket.gaierror as exc:
        raise ValueError(f"Cannot resolve host: {host}") from exc

    for info in infos:
        sockaddr = info[4]
        if sockaddr and _ip_blocked(sockaddr[0]):
            raise ValueError(f"Blocked private/reserved IP for host: {host}")
