"""Tests for document classifier and publication gate."""

from datetime import date, datetime, timedelta, timezone

from app.services.document_classifier import classify_document, classify_document_type
from app.services.job_completeness_service import calculate_completeness, publication_tier
from app.services.pdf_candidate import (
    enrichment_meets_quality,
    is_real_pdf,
    score_pdf_candidate,
    select_primary_pdf,
    validate_extracted_dates,
)
from app.services.publish_gate import (
    ValidationResult,
    calculate_job_status,
    can_publish_job,
    india_today,
    resolve_persist_status,
    validate_job_for_publication,
)


def test_classify_recruitment():
    assert (
        classify_document_type("SSC CGL 2026 Recruitment — Apply Online", "https://ssc.gov.in/x")
        == "RECRUITMENT"
    )
    result = classify_document("SSC CGL 2026 Recruitment — Apply Online", "Applications are invited")
    assert result.content_type == "RECRUITMENT"
    assert result.confidence >= 0.85


def test_classify_result_and_form():
    assert classify_document_type("Final Result for Assistant Director") == "RESULT"
    assert classify_document_type("OBC Declaration Form PDF") == "FORM"
    assert classify_document_type("E-Tender for Office Furniture", "https://x.gov.in/tenders") == "TENDER"
    blocked = classify_document("Final Result Notice", "Marks and cut-off released")
    assert blocked.content_type == "OTHER_NOTICE"


def test_classify_gazette_recruitment_is_recruitment():
    assert (
        classify_document_type("Gazette Notification for Recruitment of Assistants")
        == "RECRUITMENT"
    )
    result = classify_document(
        "Gazette Notification for Recruitment of Assistants 2026",
        "Applications are invited",
    )
    assert result.document_type == "RECRUITMENT"
    assert result.content_type == "RECRUITMENT"


def test_classify_recruitment_rules_still_rules():
    assert classify_document_type("UPSC Recruitment Rules for Assistant Section Officer") == "RECRUITMENT_RULES"


def test_can_publish_requires_verified_recruitment():
    today = date(2026, 7, 24)
    ok, errors = can_publish_job(
        {
            "title": "UPSC CDS Recruitment 2026",
            "dept": "UPSC",
            "apply_url": "https://upsc.gov.in/apply",
            "document_type": "RECRUITMENT",
            "verification_status": "VERIFIED",
            "published_at": today - timedelta(days=5),
            "last_date": today + timedelta(days=30),
            "qualification": "Graduate",
            "vacancies": 100,
            "age_limit": "21-30",
            "salary": "Level-7",
            "completeness_score": 80,
        },
        today=today,
    )
    assert ok
    assert errors == []


def test_can_publish_rejects_old_dates_and_forms():
    today = date(2026, 7, 24)
    ok, errors = can_publish_job(
        {
            "title": "OBC Form",
            "dept": "Board",
            "apply_url": "https://example.gov.in/form.pdf",
            "document_type": "FORM",
            "verification_status": "VERIFIED",
            "published_at": date(1995, 1, 1),
            "completeness_score": 90,
        },
        today=today,
    )
    assert not ok
    assert any("recruitment" in e.lower() for e in errors)


def _publishable_job(today: date, deadline: object) -> dict:
    return {
        "title": "UPSC CDS Recruitment 2026",
        "dept": "UPSC",
        "apply_url": "https://upsc.gov.in/apply",
        "document_type": "RECRUITMENT",
        "verification_status": "VERIFIED",
        "published_at": today - timedelta(days=5),
        "last_date": deadline,
        "qualification": "Graduate",
        "vacancies": 100,
        "age_limit": "21-30",
        "salary": "Level-7",
        "completeness_score": 80,
    }


def test_publication_deadline_boundary():
    today = date(2026, 7, 27)
    yesterday_ok, yesterday_errors = can_publish_job(
        _publishable_job(today, today - timedelta(days=1)), today=today
    )
    today_ok, _ = can_publish_job(_publishable_job(today, today), today=today)
    tomorrow_ok, _ = can_publish_job(
        _publishable_job(today, today + timedelta(days=1)), today=today
    )
    assert not yesterday_ok
    assert "Past deadline" in yesterday_errors
    assert today_ok
    assert tomorrow_ok


def test_calculate_job_status_boundaries():
    today = date(2026, 7, 27)
    assert calculate_job_status(today - timedelta(days=1), today=today) == "expired"
    assert calculate_job_status(today, today=today) == "active"
    assert calculate_job_status(today + timedelta(days=1), today=today) == "active"
    assert calculate_job_status(None, today=today) == "needs_review"
    assert calculate_job_status("not-a-date", today=today) == "needs_review"
    assert calculate_job_status(today + timedelta(days=1), True, today=today) == "expired"


def test_validation_result_includes_warnings_and_confidence():
    today = date(2026, 7, 27)
    payload = {
        **_publishable_job(today, today + timedelta(days=10)),
        "source_url": "https://upsc.gov.in/recruitment/notice",
        "notification_url": "https://upsc.gov.in/recruitment/notice.pdf",
        "state_codes": [],
        "vacancies": None,
    }
    result = validate_job_for_publication(payload, today=today)
    assert isinstance(result, ValidationResult)
    assert result.valid
    assert result.confidence == 95
    assert "Vacancy count is not specified" in result.warnings


def test_validation_rejects_unofficial_source_and_duplicate():
    today = date(2026, 7, 27)
    result = validate_job_for_publication(
        {
            **_publishable_job(today, today + timedelta(days=10)),
            "source_url": "https://freejobalert.example/jobs/1",
            "notification_url": "https://freejobalert.example/jobs/1.pdf",
            "is_duplicate": True,
        },
        today=today,
    )
    assert not result.valid
    assert "Source domain is not approved" in result.errors
    assert "Duplicate record" in result.errors


def test_publication_rejects_missing_malformed_deadline_and_html_title():
    today = date(2026, 7, 27)
    for deadline in (None, "not-a-date"):
        ok, errors = can_publish_job(_publishable_job(today, deadline), today=today)
        assert not ok
        assert "Missing or malformed deadline" in errors

    ok, errors = can_publish_job(
        {**_publishable_job(today, today), "title": "<b>UPSC Recruitment</b>"},
        today=today,
    )
    assert not ok
    assert "Title contains HTML markup" in errors


def test_india_today_handles_utc_date_boundary(monkeypatch):
    import app.services.publish_gate as publish_gate

    real_datetime = datetime

    class BoundaryDatetime:
        @classmethod
        def now(cls, tz):
            return real_datetime(2026, 7, 26, 19, 0, tzinfo=timezone.utc).astimezone(tz)

    monkeypatch.setattr(publish_gate, "datetime", BoundaryDatetime)
    assert india_today() == date(2026, 7, 27)


def test_resolve_persist_status_freeze_defaults_to_draft():
    today = date(2026, 7, 24)
    status, verification, published, _ = resolve_persist_status(
        last_date=today + timedelta(days=20),
        document_type="RECRUITMENT",
        verification_status="UNVERIFIED",
        normalized={
            "title": "Bank PO Recruitment 2026",
            "dept": "IBPS",
            "apply_url": "https://ibps.in/apply",
            "published_at": today,
            "qualification": "Graduate",
            "vacancies": 50,
            "age_limit": "20-30",
            "salary": "Scale I",
        },
        auto_publish_verified=False,
        today=today,
        completeness_score=80,
    )
    assert status == "draft"
    assert verification == "NEEDS_REVIEW"
    assert published is False


def test_resolve_persist_status_auto_publish_goes_live():
    today = date(2026, 7, 24)
    status, verification, published, _ = resolve_persist_status(
        last_date=today + timedelta(days=20),
        document_type="RECRUITMENT",
        verification_status="UNVERIFIED",
        normalized={
            "title": "Bank PO Recruitment 2026",
            "dept": "IBPS",
            "apply_url": "https://ibps.in/apply",
            "published_at": today,
            "qualification": "Graduate",
            "vacancies": 50,
            "age_limit": "20-30",
            "salary": "Scale I",
        },
        auto_publish_verified=True,
        today=today,
        completeness_score=80,
    )
    assert status == "live"
    assert verification == "VERIFIED"
    assert published is True


def test_pdf_candidate_scoring():
    assert score_pdf_candidate("https://upsc.gov.in/recruitment-notification.pdf") > 0
    assert score_pdf_candidate("https://ssc.gov.in/final-result.pdf") < 0
    best, score, _ = select_primary_pdf(
        [
            "https://x.gov.in/result.pdf",
            "https://x.gov.in/detailed-advertisement.pdf",
        ]
    )
    assert best and "advertisement" in best
    assert score > 0


def test_is_real_pdf_and_dates():
    assert is_real_pdf(b"%PDF-1.4" + b"0" * 12_000, "application/pdf")
    assert not is_real_pdf(b"<html>error</html>", "text/html")
    today = date(2026, 7, 24)
    errs = validate_extracted_dates(today + timedelta(days=5), today, today=today)
    assert errs
    ok, reasons = enrichment_meets_quality(summary="short", sections=[], fields={})
    assert not ok
    assert reasons


def test_completeness_scoring():
    score, missing = calculate_completeness(
        {
            "title": "Recruitment",
            "dept": "UPSC",
            "apply_url": "https://upsc.gov.in",
            "last_date": "2026-08-01",
            "qualification": "Graduate",
            "vacancies": 10,
            "age_limit": "21-30",
            "salary": "Level-10",
        }
    )
    assert score >= 70
    assert publication_tier(score) == "publish"
    assert publication_tier(50) == "hold"
