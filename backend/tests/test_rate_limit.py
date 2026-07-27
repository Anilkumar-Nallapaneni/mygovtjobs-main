from unittest.mock import MagicMock

import asyncio

from app.middleware.rate_limit import RedisSlidingWindowRateLimiter, SlidingWindowRateLimiter, client_ip


def test_sliding_window_blocks_after_limit():
    limiter = SlidingWindowRateLimiter(max_requests=2, window_seconds=60)
    assert asyncio.run(limiter.allow("a"))
    assert asyncio.run(limiter.allow("a"))
    assert not asyncio.run(limiter.allow("a"))
    assert asyncio.run(limiter.allow("b"))


def test_client_ip_ignores_forwarded_from_untrusted_peer():
    request = MagicMock()
    request.client.host = "203.0.113.10"
    request.headers = {"x-forwarded-for": "1.2.3.4, 203.0.113.10"}
    assert client_ip(request) == "203.0.113.10"


def test_client_ip_trusts_forwarded_from_configured_proxy(monkeypatch):
    monkeypatch.setenv("TRUSTED_PROXY_IPS", "10.0.0.1")
    from app.config import get_settings

    get_settings.cache_clear()

    request = MagicMock()
    request.client.host = "10.0.0.1"
    request.headers = {"x-forwarded-for": "1.2.3.4, 10.0.0.1"}
    assert client_ip(request) == "1.2.3.4"

    get_settings.cache_clear()


def test_redis_limiter_uses_pipeline(monkeypatch):
    import sys
    from unittest.mock import MagicMock

    calls = {"count": 0}

    class FakeRedis:
        def pipeline(self):
            return self

        def incr(self, _key):
            calls["count"] += 1
            return self

        def expire(self, _key, _ttl):
            return self

        async def execute(self):
            return [calls["count"], True]

    fake_redis = MagicMock()
    fake_redis.from_url = lambda *_a, **_k: FakeRedis()
    fake_module = MagicMock()
    fake_module.asyncio = fake_redis
    monkeypatch.setitem(sys.modules, "redis", fake_module)
    limiter = RedisSlidingWindowRateLimiter("redis://localhost:6379/0", max_requests=2)
    assert asyncio.run(limiter.allow("ip-1"))
    assert asyncio.run(limiter.allow("ip-1"))
    assert not asyncio.run(limiter.allow("ip-1"))


def test_redis_limiter_falls_back_when_redis_is_unavailable(monkeypatch):
    import sys

    class BrokenRedis:
        def pipeline(self):
            raise ConnectionError("redis unavailable")

    fake_redis = MagicMock()
    fake_redis.from_url = lambda *_a, **_k: BrokenRedis()
    fake_module = MagicMock()
    fake_module.asyncio = fake_redis
    monkeypatch.setitem(sys.modules, "redis", fake_module)

    limiter = RedisSlidingWindowRateLimiter("redis://localhost:6379/0", max_requests=1)
    assert asyncio.run(limiter.allow("ip-1"))
    assert not asyncio.run(limiter.allow("ip-1"))
