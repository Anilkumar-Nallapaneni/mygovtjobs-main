"""ValidationService — aggregator and official link rules."""

from app.services.validation_service import ValidationService


def _base_job(**overrides):
    payload = {
        "title": "SSC CGL 2026 Notification — Apply Online for 7500 Posts",
        "dept": "Staff Selection Commission",
        "apply_url": "https://ssc.gov.in/apply/example",
        "pdf_urls": [],
        "detail": {"summary": "Official SSC CGL recruitment notification."},
    }
    payload.update(overrides)
    return payload


def test_valid_official_job_passes():
    ok, reasons = ValidationService().validate(_base_job())
    assert ok is True
    assert reasons == []


def test_freejobalert_apply_url_rejected():
    ok, reasons = ValidationService().validate(
        _base_job(apply_url="https://www.freejobalert.com/articles/test-3041572")
    )
    assert ok is False
    assert "aggregator_link" in reasons


def test_freejobalert_brand_in_summary_rejected():
    ok, reasons = ValidationService().validate(
        _base_job(
            apply_url="https://ssc.gov.in/apply/example",
            detail={"summary": "Also listed on freejobalert portal"},
        )
    )
    assert ok is False
    assert "aggregator_brand" in reasons


def test_pdf_only_official_job_passes_without_apply_url():
    ok, reasons = ValidationService().validate(
        _base_job(
            title="UPSC Civil Services Exam 2026 Notification PDF",
            apply_url=None,
            pdf_urls=["https://upsc.gov.in/writereaddata/notification.pdf"],
        )
    )
    assert ok is True
    assert reasons == []
