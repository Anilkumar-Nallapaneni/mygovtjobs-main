"""Minimal tests for SSC JSON API scraper helpers."""

from datetime import datetime, timezone

from app.scrapers.date_utils import parse_published
from app.scrapers.ssc_api import _attachment_url, _is_recruitment_headline, _priority


def test_attachment_url_normalizes_windows_path():
    url = _attachment_url(r"uploads\masterData\NoticeBoards\IV_NOTICE.pdf")
    assert url == "https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/IV_NOTICE.pdf"


def test_recruitment_headline_keeps_exam_notices():
    assert _is_recruitment_headline("Notice of Combined Graduate Level Examination, 2026")
    assert _is_recruitment_headline(
        "Important Notice regarding re-opening of window for submission of online application form for Combined Graduate Level Examination, 2026"
    )
    assert _is_recruitment_headline("Engagement of 05 (Five) Young Professional (General) in SSC(HQ)")


def test_recruitment_headline_skips_vacancy_tables_and_results():
    assert not _is_recruitment_headline(
        "Tentative Vacancies of Constable (GD) in Central Armed Police Forces (CAPFs)"
    )
    assert not _is_recruitment_headline(
        "Final Vacancies of Junior Engineer (Civil, Mechanical and Electrical) Examination, 2025"
    )
    assert not _is_recruitment_headline(
        "Final selection for engagement of Young Professionals (General) in Staff Selection Commission (HQs)"
    )
    assert not _is_recruitment_headline(
        "Identity Verification (IV) for the candidates shortlisted in FRTA of Stenographer"
    )
    assert not _is_recruitment_headline("Final Answer Key for Tier-I")


def test_notice_of_outranks_soft_matches():
    assert _priority("Notice of Combined Graduate Level Examination, 2026") > _priority(
        "Recruitment of Local Bank Officer"
    )


def test_parse_published_iso_with_millis():
    dt = parse_published("2026-05-21T12:51:23.773Z")
    assert dt is not None
    assert dt == datetime(2026, 5, 21, 12, 51, 23, 773000, tzinfo=timezone.utc)
