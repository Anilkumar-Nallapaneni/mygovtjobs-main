"""Sliding-window rate limiter for public API routes."""

import time
import logging
from collections import defaultdict

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import get_settings

logger = logging.getLogger(__name__)


class SlidingWindowRateLimiter:
    """Process-local limiter — use Redis when REDIS_URL is set for multi-worker production."""

    def __init__(self, *, max_requests: int, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window = window_seconds
        self._hits: dict[str, list[float]] = defaultdict(list)

    async def allow(self, key: str) -> bool:
        now = time.time()
        window_start = now - self.window
        hits = [t for t in self._hits[key] if t > window_start]
        if len(hits) >= self.max_requests:
            return False
        hits.append(now)
        self._hits[key] = hits
        if len(self._hits) > 5000:
            self._prune_stale(now)
        return True

    def _prune_stale(self, now: float) -> None:
        cutoff = now - self.window
        stale = [ip for ip, hits in self._hits.items() if not hits or hits[-1] <= cutoff]
        for ip in stale:
            del self._hits[ip]


class RedisSlidingWindowRateLimiter:
    """Shared limiter backed by Redis INCR + EXPIRE (fixed window per key)."""

    def __init__(self, redis_url: str, *, max_requests: int, window_seconds: int = 60):
        from redis import asyncio as redis

        self._client = redis.from_url(redis_url, decode_responses=True)
        self.max_requests = max_requests
        self.window = window_seconds
        self._fallback = SlidingWindowRateLimiter(
            max_requests=max_requests,
            window_seconds=window_seconds,
        )

    async def allow(self, key: str) -> bool:
        safe_key = f"rl:{key}"
        try:
            pipe = self._client.pipeline()
            pipe.incr(safe_key)
            pipe.expire(safe_key, self.window)
            count, _ = await pipe.execute()
            return int(count) <= self.max_requests
        except Exception:
            logger.exception("Redis rate limiter failed; using process-local fallback")
            return await self._fallback.allow(key)


_rate_limiter: SlidingWindowRateLimiter | RedisSlidingWindowRateLimiter | None = None
_subscribe_limiter: SlidingWindowRateLimiter | RedisSlidingWindowRateLimiter | None = None


def _build_limiter(*, max_requests: int, window_seconds: int = 60):
    settings = get_settings()
    redis_url = (settings.redis_url or "").strip()
    if redis_url:
        try:
            return RedisSlidingWindowRateLimiter(
                redis_url,
                max_requests=max_requests,
                window_seconds=window_seconds,
            )
        except Exception:
            logger.exception("Redis rate limiter initialization failed; using process-local limiter")
    return SlidingWindowRateLimiter(max_requests=max_requests, window_seconds=window_seconds)


def get_api_rate_limiter():
    global _rate_limiter
    if _rate_limiter is None:
        settings = get_settings()
        _rate_limiter = _build_limiter(max_requests=settings.rate_limit_per_minute)
    return _rate_limiter


def get_subscribe_rate_limiter():
    global _subscribe_limiter
    if _subscribe_limiter is None:
        settings = get_settings()
        _subscribe_limiter = _build_limiter(
            max_requests=settings.alert_subscribe_rate_limit_per_minute,
            window_seconds=60,
        )
    return _subscribe_limiter


def _trusted_proxy_ips() -> frozenset[str]:
    raw = get_settings().trusted_proxy_ips or ""
    return frozenset(ip.strip() for ip in raw.split(",") if ip.strip())


def client_ip(request: Request) -> str:
    """Only trust X-Forwarded-For when the direct peer is a configured proxy."""
    peer = request.client.host if request.client else ""
    if peer in _trusted_proxy_ips():
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
    return peer or "unknown"


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, *, max_requests: int = 120, window_seconds: int = 60):
        super().__init__(app)
        self._max_requests = max_requests
        self._window_seconds = window_seconds

    async def dispatch(self, request: Request, call_next):
        if not request.url.path.startswith("/api/"):
            return await call_next(request)

        limiter = get_api_rate_limiter()
        ip = client_ip(request)
        if not await limiter.allow(ip):
            return Response("Rate limit exceeded", status_code=429)
        return await call_next(request)
