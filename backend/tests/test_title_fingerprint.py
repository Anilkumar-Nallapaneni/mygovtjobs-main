"""Tests for title_fingerprint dedupe helper."""

from app.services.dedupe_service import title_fingerprint


def test_title_fingerprint_normalizes_punctuation():
    a = title_fingerprint("UPSC Civil Services — 2026")
    b = title_fingerprint("upsc civil services 2026")
    assert a == b
    assert len(a) == 32


def test_title_fingerprint_empty():
    assert title_fingerprint("") == ""
