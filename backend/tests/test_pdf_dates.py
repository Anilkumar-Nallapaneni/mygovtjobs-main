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


def test_extract_walk_in_over_project_end():
    text = """
    Walk-in interview on 16-06-2026.
    Project duration upto 31-03-2027.
    """
    out = extract_dates_from_text(text)
    assert out["last_date"] == "2026-06-16"


def test_prefer_apply_date_chooses_nearer():
    from app.parsers.pdf_dates import prefer_apply_date

    assert prefer_apply_date("2027-03-31", "2026-06-16", today=date(2026, 8, 4)) == "2026-06-16"
    assert prefer_apply_date("2026-08-20", "2026-08-15", today=date(2026, 8, 4)) == "2026-08-20"


def test_extract_month_name_last_dates():
    text = """
    Applications are invited for the post of Assistant.
    Last date for submission of online application: 30th June, 2026
    """
    out = extract_dates_from_text(text)
    assert out["last_date"] == "2026-06-30"

    text2 = "Eligible candidates may apply online on or before 21 August 2026."
    out2 = extract_dates_from_text(text2)
    assert out2["last_date"] == "2026-08-21"


def test_extract_month_name_from_to_window():
    text = (
        "Online Applications are invited for Direct Recruitment to various posts "
        "from 25th July, 2026 to 14th September, 2026."
    )
    out = extract_dates_from_text(text)
    assert out["published_date"] == "2026-07-25"
    assert out["last_date"] == "2026-09-14"


def test_extract_last_date_is_month_name():
    text = "Last date for submission of online application is 21 September 2026."
    out = extract_dates_from_text(text)
    assert out["last_date"] == "2026-09-21"


def test_extract_cen_table_closing_date_with_words_between():
    text = """
    GOVERNMENT OF INDIA MINISTRY OF RAILWAYS
    CENTRALIZED EMPLOYMENT NOTIFICATION CEN NO. 04/2026
    Date of Indicative Notice in Employment News. 25.07.2026
    Opening date of Online application. 14.08.2026
    Closing date for Submission of Online Application.
    13.09.2026 (23:59 hours)
    Last Date for Application fee payment for the submitted applications.
    15.09.2026
    Dates for Modification window for corrections in application form with payment of
    modification fee (Please Note: Details filled in Create an Account form and Chosen
    RRB cannot be modified).
    16.09.2026 to 25.09.2026
    """
    out = extract_dates_from_text(text)
    assert out["last_date"] == "2026-09-13"
    assert out["published_date"] == "2026-08-14"


def test_extract_iocl_end_date_of_online_application():
    text = (
        "The end date of online application for this recruitment is 03.09.2026. "
        "Candidates must submit the form before the closing time."
    )
    out = extract_dates_from_text(text)
    assert out["last_date"] == "2026-09-03"


def test_extract_dated_and_walk_in_month_names():
    text = """
    SAINIK SCHOOL GOALPARA (ASSAM)
    Following Vacancies are available in school for the Academic Session 2026 – 27.
    ADVT NO. SSG/02/2026 DATED 20 MAY 2026
    Date of Walk-in-Interview
    Football Coach 02 (Male-1,Female-1)
    18 Jun 2026
    """
    out = extract_dates_from_text(text)
    assert out["published_date"] == "2026-05-20"
    assert out["last_date"] == "2026-06-18"


def test_validate_rejects_ancient_published():
    from app.services.pdf_candidate import validate_extracted_dates

    errs = validate_extracted_dates(date(1995, 6, 27), date(2027, 3, 31), today=date(2026, 8, 4))
    assert any("implausibly old" in e for e in errs)
