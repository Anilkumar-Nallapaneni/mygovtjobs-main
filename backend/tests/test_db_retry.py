"""Tests for database retry helpers."""

from app.database.retry import is_transient_db_error


class _FakeConnectionError(Exception):
    pass


def test_is_transient_db_error_connection_closed_message():
    exc = Exception("connection was closed in the middle of operation")
    assert is_transient_db_error(exc) is True


def test_is_transient_db_error_connection_type_orig():
    exc = Exception("db error")
    exc.orig = _FakeConnectionError("gone")  # type: ignore[attr-defined]
    assert is_transient_db_error(exc) is True


def test_is_transient_db_error_non_transient():
    assert is_transient_db_error(ValueError("bad slug")) is False
