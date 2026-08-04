"""Minimal tests for SSC JSON API scraper helpers."""

from app.scrapers.ssc_api import _attachment_url, _is_recruitment_headline


def test_attachment_url_normalizes_windows_path():
    url = _attachment_url(r"uploads\masterData\NoticeBoards\IV_NOTICE.pdf")
    assert url == "https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/IV_NOTICE.pdf"


def test_recruitment_headline_keeps_exam_notices():
    assert _is_recruitment_headline("Notice of Combined Graduate Level Examination, 2026")


def test_recruitment_headline_skips_identity_verification():
    assert not _is_recruitment_headline(
        "Identity Verification (IV) for the candidates shortlisted in FRTA of Stenographer"
    )


def test_recruitment_headline_skips_pure_answer_key():
    assert not _is_recruitment_headline("Final Answer Key for Tier-I")
