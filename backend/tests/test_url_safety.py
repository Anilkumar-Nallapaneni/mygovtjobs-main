"""URL safety / SSRF helpers."""

import pytest

from app.utils.url_safety import assert_safe_url, host_allows_legacy_tls


def test_assert_safe_url_blocks_localhost():
    with pytest.raises(ValueError, match="Blocked"):
        assert_safe_url("http://127.0.0.1/secret")


def test_assert_safe_url_blocks_non_http():
    with pytest.raises(ValueError, match="scheme"):
        assert_safe_url("file:///etc/passwd")


def test_host_allows_legacy_tls_gov_in():
    assert host_allows_legacy_tls("https://ssc.gov.in/notice.pdf") is True
    assert host_allows_legacy_tls("https://www.nic.in/") is True
    assert host_allows_legacy_tls("https://example.com/x") is False
    assert host_allows_legacy_tls("https://drive.google.com/file/d/1") is False
