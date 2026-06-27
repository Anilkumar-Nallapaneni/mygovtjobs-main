"""Tests for PdfReaderAgent and job PDF URL collection."""

from app.agents.pdf_reader_agent import PdfReaderAgent
from app.utils.job_pdf_urls import collect_pdf_urls_from_dict


def test_collect_pdf_urls_from_apply_and_detail():
    job = {
        "apply_url": "https://dept.gov.in/apply",
        "detail": {
            "pdf_url": "https://dept.gov.in/notices/advt-2026.pdf",
            "pdf_urls": ["https://cdn.gov.in/corrigendum.pdf"],
        },
    }
    urls = collect_pdf_urls_from_dict(job)
    assert "https://dept.gov.in/notices/advt-2026.pdf" in urls
    assert "https://cdn.gov.in/corrigendum.pdf" in urls
    assert "https://dept.gov.in/apply" not in urls


def test_collect_pdf_urls_blocks_aggregators():
    job = {
        "detail": {
            "pdf_url": "https://www.freejobalert.com/fake.pdf",
        },
    }
    assert collect_pdf_urls_from_dict(job) == []


def test_pdf_reader_agent_paths():
    agent = PdfReaderAgent()
    assert agent.detail_dir.name == "job-details"
    assert agent.memory_index_path.name == "pdf-memory-index.json"
