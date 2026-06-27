"""Settings — production defaults."""

from unittest.mock import patch

from app.config import Settings


def test_pdf_ocr_disabled_in_production_by_default():
    with patch("app.config._env_explicit", return_value=False):
        s = Settings.model_validate({"app_env": "production"})
    assert s.pdf_ocr_enabled is False


def test_pdf_ocr_explicit_override_in_production():
    with patch("app.config._env_explicit", return_value=True):
        s = Settings.model_validate({"app_env": "production", "pdf_ocr_enabled": True})
    assert s.pdf_ocr_enabled is True
