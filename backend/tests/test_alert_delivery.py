from datetime import date

from app.models.alert import AlertSubscription
from app.models.job import Job
from app.services.alert_delivery_service import build_alert_message, job_matches_subscription


def _job(**kwargs) -> Job:
    row = Job(
        slug="test-job",
        title="SSC CGL 2026",
        category="ssc",
        state_codes=["up"],
        vacancies=100,
        qualification="Graduate",
        last_date=date(2026, 8, 1),
        apply_url="https://ssc.gov.in/apply",
        status="live",
        content_hash="abc12345",
    )
    for key, value in kwargs.items():
        setattr(row, key, value)
    return row


def _sub(**kwargs) -> AlertSubscription:
    row = AlertSubscription(channel="email", channel_address="user@example.com", is_active=True)
    for key, value in kwargs.items():
        setattr(row, key, value)
    return row


def test_job_matches_state_filter():
    job = _job(state_codes=["mh"])
    assert job_matches_subscription(job, _sub(state_codes=["mh"]))
    assert not job_matches_subscription(job, _sub(state_codes=["up"]))


def test_all_india_job_matches_any_state_filter():
    job = _job(state_codes=[])
    assert job_matches_subscription(job, _sub(state_codes=["up"]))


def test_job_matches_category_filter():
    job = _job(category="banking")
    assert job_matches_subscription(job, _sub(categories=["banking"]))
    assert not job_matches_subscription(job, _sub(categories=["upsc"]))


def test_build_alert_message_includes_links():
    plain, html_body = build_alert_message(_job())
    assert "SSC CGL 2026" in plain
    assert "/jobs/test-job" in plain
    assert "ssc.gov.in" in plain
    assert "<h2>" in html_body


def test_send_push_alert_skips_without_webhook():
    import asyncio

    from app.services.alert_delivery_service import send_push_alert

    ok = asyncio.run(send_push_alert("device-token-abc", "Test", "Body"))
    assert ok is False
