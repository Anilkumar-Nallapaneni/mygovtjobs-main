"""Tests for JobDetailAgent."""

from app.agents.job_detail_agent import JobDetailAgent
from app.agents.job_detail_sections import (
    _infer_detail_source,
    _is_placeholder_sections,
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
    assert any(s.get("paragraphs") or s.get("lists") or s.get("tables") for s in sections)

def test_sections_from_summary_keeps_long_pdf_body_without_headings():
    text = (
        "Staff Selection Commission invites online applications for Combined Graduate Level. "
        "Candidates must be graduates. The upper age limit is twenty seven years. "
        "Last date to apply is printed in the notice. Vacancy details are given in Annexure. "
        "Pay scale shall be as per government norms for the post. "
        "Application fee details and selection process are available in the official PDF. "
        "How to apply instructions are provided on the commission website portal."
    )
    sections = _sections_from_summary(text)
    assert sections
    assert any(s.get("paragraphs") for s in sections)
    assert not _is_placeholder_sections(sections)


def test_is_placeholder_sections_detects_pending_copy():
    assert _is_placeholder_sections(
        [
            {
                "heading": "Overview",
                "paragraphs": ["Full details are being verified.", "Please read the official notification."],
                "tables": [],
                "lists": [],
                "links": [],
            }
        ]
    )


def test_placeholder_sections_not_treated_as_complete():
    rich = [
        {
            "heading": "Eligibility and Qualification",
            "paragraphs": ["Graduate degree from a recognized university is required."],
            "tables": [],
            "lists": [],
            "links": [],
        }
    ]
    assert not _is_placeholder_sections(rich)


def test_job_detail_agent_paths():
    agent = JobDetailAgent()
    assert agent.detail_dir.name == "job-details"
