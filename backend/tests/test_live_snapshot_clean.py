"""Tests for strict live-jobs snapshot cleaning (aligns with verify --strict)."""

from datetime import date, timedelta

from app.services.live_snapshot_clean import filter_live_snapshot_items, prepare_live_snapshot_row


def _good_row(today: date, **overrides):
    row = {
        "title": "UPSC CDS Recruitment 2026",
        "dept": "UPSC",
        "apply_url": "https://upsc.gov.in/apply",
        "source_url": "https://upsc.gov.in/recruitment/notice",
        "document_type": "RECRUITMENT",
        "verification_status": "VERIFIED",
        "published_to_site": True,
        "status": "live",
        "published_at": (today - timedelta(days=5)).isoformat(),
        "last_date": (today + timedelta(days=30)).isoformat(),
        "qualification": "Graduate",
        "vacancies": 100,
        "age_limit": "21-30",
        "salary": "Level-7",
        "completeness_score": 80,
        "publication_confidence": 95,
        "state_codes": [],
        "detail": {
            "notification_url": "https://upsc.gov.in/recruitment/notice.pdf",
            "source_url": "https://upsc.gov.in/recruitment/notice",
        },
    }
    row.update(overrides)
    return row


def test_prepare_keeps_publishable_live_row():
    today = date(2026, 8, 10)
    kept = prepare_live_snapshot_row(_good_row(today), today=today)
    assert kept is not None
    assert kept["status"] == "live"
    assert kept["published_to_site"] is True
    assert kept["vacancies"] == 100


def test_prepare_drops_unapproved_expired_and_html_title():
    today = date(2026, 8, 10)
    assert prepare_live_snapshot_row(_good_row(today, published_to_site=False), today=today) is None
    assert prepare_live_snapshot_row(_good_row(today, status="expired"), today=today) is None
    assert (
        prepare_live_snapshot_row(
            _good_row(today, last_date=(today - timedelta(days=1)).isoformat()),
            today=today,
        )
        is None
    )
    assert prepare_live_snapshot_row(_good_row(today, title="<b>UPSC</b>"), today=today) is None
    assert prepare_live_snapshot_row(_good_row(today, document_type="RESULT"), today=today) is None
    assert (
        prepare_live_snapshot_row(_good_row(today, verification_status="UNVERIFIED"), today=today)
        is None
    )
    assert prepare_live_snapshot_row(_good_row(today, last_date="10-08-2026"), today=today) is None
    assert prepare_live_snapshot_row(_good_row(today, completeness_score=50), today=today) is None
    assert prepare_live_snapshot_row(_good_row(today, publication_confidence=80), today=today) is None


def test_prepare_strips_html_when_sanitizer_yields_plain_title():
    today = date(2026, 8, 10)
    kept = prepare_live_snapshot_row(
        _good_row(today, title="<p>UPSC CDS Recruitment 2026</p>"),
        today=today,
    )
    assert kept is not None
    assert kept["title"] == "UPSC CDS Recruitment 2026"
    assert "<" not in kept["title"]


def test_filter_live_snapshot_items_counts_drops():
    today = date(2026, 8, 10)
    items = [
        _good_row(today),
        _good_row(today, published_to_site=False, title="Draft job"),
        _good_row(today, status="expired", title="Old job"),
    ]
    kept, dropped = filter_live_snapshot_items(items, today=today)
    assert len(kept) == 1
    assert dropped == 2
