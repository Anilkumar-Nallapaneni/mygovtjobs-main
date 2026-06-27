"""Tests for JobDetailAgent."""

from app.agents.job_detail_agent import JobDetailAgent, _infer_detail_source, _sections_from_summary


def test_infer_detail_source_pdf():
    assert _infer_detail_source({"memorized_at": "2026-01-01T00:00:00Z"}) == "pdf"
    assert _infer_detail_source({"detail_source": "pdf"}) == "pdf"


def test_infer_detail_source_notification():
    assert _infer_detail_source({"source": "structured-import"}) == "notification"


def test_sections_from_summary_fallback():
    text = "RECRUITMENT NOTIFICATION\n\nTotal vacancies: 120 posts for Clerk."
    sections = _sections_from_summary(text)
    assert sections
    assert any("Notification" in str(s.get("heading", "")) for s in sections)


def test_job_detail_agent_paths():
    agent = JobDetailAgent()
    assert agent.detail_dir.name == "job-details"
