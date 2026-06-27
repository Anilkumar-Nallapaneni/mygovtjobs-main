from datetime import date

from app.parsers.pdf_dates import (
    extract_dates_from_text,
    resolve_primary_dates,
    to_iso_date,
)


def test_extract_dates_from_range_in_pdf_text():
    text = """
    Online applications are invited from 01-06-2026 to 21-06-2026.
    Last date for submission of online application: 21-06-2026
    """
    out = extract_dates_from_text(text)
    assert out["published_date"] == "2026-06-01"
    assert out["last_date"] == "2026-06-21"


def test_extract_dated_as_published():
    text = "Notification dated 10.05.2026 regarding recruitment of Assistant Professor."
    out = extract_dates_from_text(text)
    assert out["published_date"] == "2026-05-10"


def test_resolve_primary_dates_from_sections():
    rows = [
        {"event_key": "Notification Date", "event_date": date(2026, 6, 1)},
        {"event_key": "Last Date", "event_date": date(2026, 6, 21)},
    ]
    published, last = resolve_primary_dates(rows)
    assert published == date(2026, 6, 1)
    assert last == date(2026, 6, 21)


def test_extract_vnsgu_notice_dates():
    text = """
    Eligible candidates are required to apply online on or before 21/06/2026 up to 11:59 p.m.
    Date : 27/05/2026
    """
    out = extract_dates_from_text(text)
    assert out["published_date"] == "2026-05-27"
    assert out["last_date"] == "2026-06-21"


def test_extract_dfpd_notice_dates():
    text = """
    Dated: l8 .05.2026
    Applications may be sent within a period of 90 days from the date of publication
    of this advertisement in the Employment News.
    """
    out = extract_dates_from_text(text)
    assert out["published_date"] == "2026-05-18"
    assert out["last_date"] == "2026-08-16"
