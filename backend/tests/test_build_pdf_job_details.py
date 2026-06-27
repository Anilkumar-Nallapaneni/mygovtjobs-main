import asyncio
import importlib.util
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "build-pdf-job-details.py"


def load_builder_module():
    sys.path.insert(0, str(ROOT / "backend"))
    spec = importlib.util.spec_from_file_location("build_pdf_job_details_under_test", SCRIPT)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_pdf_urls_collects_known_pdf_fields_and_section_links():
    builder = load_builder_module()

    job = {
        "pdf_url": "https://dept.gov.in/notice-a.pdf",
        "apply_url": "https://dept.gov.in/notice-a.pdf",
        "detail": {
            "notification_url": "https://dept.gov.in/ViewPdf.aspx?id=10",
            "pdf_urls": [
                "https://dept.gov.in/notice-b.pdf",
                "https://freejobalert.com/notice-c.pdf",
            ],
            "content_sections": [
                {
                    "links": [
                        {"url": "https://dept.gov.in/attachments/notice-d"},
                    ]
                }
            ],
        },
    }

    assert builder._pdf_urls(job) == [
        "https://dept.gov.in/notice-a.pdf",
        "https://dept.gov.in/ViewPdf.aspx?id=10",
        "https://dept.gov.in/notice-b.pdf",
        "https://dept.gov.in/attachments/notice-d",
    ]


def test_enrich_job_merges_all_pdf_sections(monkeypatch):
    builder = load_builder_module()
    seen_urls = []

    async def fake_parse_pdf_url(url):
        seen_urls.append(url)
        return {
            "summary": f"Summary from {url}",
            "qualification": "Graduate",
            "content_sections": [
                {
                    "heading": "Eligibility" if url.endswith("a.pdf") else "How To Apply",
                    "paragraphs": [f"Content from {url}"],
                    "tables": [],
                    "lists": [],
                    "links": [{"label": "PDF", "url": url}],
                }
            ],
        }

    monkeypatch.setattr(builder, "parse_pdf_url", fake_parse_pdf_url)

    out = asyncio.run(
        builder.enrich_job(
            {
                "slug": "multi-pdf-job",
                "pdf_url": "https://dept.gov.in/a.pdf",
                "detail": {"pdf_urls": ["https://dept.gov.in/b.pdf"]},
            }
        )
    )

    assert seen_urls == ["https://dept.gov.in/a.pdf", "https://dept.gov.in/b.pdf"]
    assert out["qualification"] == "Graduate"
    assert out["pdf_url"] == "https://dept.gov.in/a.pdf"
    assert out["detail"]["pdf_url"] == "https://dept.gov.in/a.pdf"
    assert out["detail"]["pdf_urls"] == ["https://dept.gov.in/a.pdf", "https://dept.gov.in/b.pdf"]
    assert out["detail"]["pdfUrls"] == ["https://dept.gov.in/a.pdf", "https://dept.gov.in/b.pdf"]
    assert [section["heading"] for section in out["detail"]["content_sections"]] == [
        "PDF 1: Eligibility",
        "PDF 2: How To Apply",
    ]
    assert [section["source_pdf_url"] for section in out["detail"]["content_sections"]] == [
        "https://dept.gov.in/a.pdf",
        "https://dept.gov.in/b.pdf",
    ]


def test_enrich_job_preserves_single_pdf_section_headings(monkeypatch):
    builder = load_builder_module()

    async def fake_parse_pdf_url(url):
        return {
            "summary": "Single PDF summary",
            "content_sections": [
                {
                    "heading": "Notification",
                    "paragraphs": ["Single PDF content"],
                    "tables": [],
                    "lists": [],
                    "links": [{"label": "PDF", "url": url}],
                }
            ],
        }

    monkeypatch.setattr(builder, "parse_pdf_url", fake_parse_pdf_url)

    out = asyncio.run(builder.enrich_job({"slug": "single-pdf-job", "apply_url": "https://dept.gov.in/a.pdf"}))

    assert out["detail"]["content_sections"][0]["heading"] == "Notification"
    assert out["detail"]["content_sections"][0]["source_pdf_url"] == "https://dept.gov.in/a.pdf"
