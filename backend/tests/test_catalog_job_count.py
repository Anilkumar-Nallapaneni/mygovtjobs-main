"""Tests for catalog job count helper."""

from app.utils.catalog_job_count import count_catalog_display_jobs


def test_count_catalog_display_jobs_empty():
    assert count_catalog_display_jobs([]) == 0


def test_count_catalog_display_jobs_recruitment_row():
    items = [
        {
            "slug": "ssc-cgl-2026-test",
            "title": "SSC CGL 2026 Recruitment Notification",
            "dept": "SSC",
            "status": "live",
            "vacancies": 100,
            "apply_url": "https://ssc.gov.in/notice.pdf",
        }
    ]
    assert count_catalog_display_jobs(items) == 1


def test_count_catalog_display_jobs_rejects_shortlist():
    items = [
        {
            "slug": "shortlist-test",
            "title": "LIST OF CANDIDATES SHORTLISTED AND NEXT IN ORDER OF MERIT FOR",
            "dept": "Test Board",
            "status": "live",
            "apply_url": "https://example.gov.in/notice.pdf",
        }
    ]
    assert count_catalog_display_jobs(items) == 0
