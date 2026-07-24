"""Tests for JobDetailAgent."""

from app.agents.job_detail_agent import (
    JobDetailAgent,
    _infer_detail_source,
    _sections_from_summary,
    _summary_has_job_signals,
)


def test_infer_detail_source_pdf():
    assert _infer_detail_source({"memorized_at": "2026-01-01T00:00:00Z"}) == "pdf"
    assert _infer_detail_source({"detail_source": "pdf"}) == "pdf"


def test_infer_detail_source_notification():
    assert _infer_detail_source({"source": "structured-import"}) == "notification"


def test_sections_from_summary_rejects_weak_blurbs():
    weak = "Applications are invited. Read the notification for full details."
    assert _sections_from_summary(weak) == []
    assert not _summary_has_job_signals(weak)


def test_sections_from_summary_accepts_rich_text():
    text = (
        "RECRUITMENT NOTIFICATION\n\n"
        "Total vacancy: 120 posts for Clerk.\n"
        "Qualification: Graduate degree required.\n"
        "Age limit: 18 to 27 years.\n"
        "Last date for online application: 20.08.2026.\n"
        "Salary: Pay Level-4.\n"
        "Application fee: Rs 100.\n"
        "Selection process: Written exam and interview.\n"
        "How to apply: Apply online on the official portal.\n"
    )
    assert _summary_has_job_signals(text)
    sections = _sections_from_summary(text)
    assert sections


def test_job_detail_agent_paths():
    agent = JobDetailAgent()
    assert agent.detail_dir.name == "job-details"
