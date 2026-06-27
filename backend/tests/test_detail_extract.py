from datetime import date

from app.parsers.detail_extract import extract_from_content_sections, extract_post_name_from_title


def test_extract_vacancy_and_date_rows():
    sections = [
        {
            "heading": "Vacancy Details",
            "tables": [
                [
                    {"Post Name": "Junior Engineer", "Total Posts": "12"},
                    {"Post Name": "Assistant Engineer", "Total Posts": "5"},
                ]
            ],
        },
        {
            "heading": "Important Dates",
            "tables": [
                [
                    {"event": "Last Date", "date": "15-08-2026"},
                    {"event": "Exam Date", "date": "2026-09-01"},
                ]
            ],
        },
    ]
    posts, dates, post_name = extract_from_content_sections(sections)
    assert len(posts) == 2
    assert posts[0]["post_name"] == "Junior Engineer"
    assert posts[0]["vacancies"] == 12
    assert len(dates) == 2
    assert dates[0]["event_key"] == "Last Date"
    assert dates[0]["event_date"] == date(2026, 8, 15)
    assert post_name == "Junior Engineer, Assistant Engineer"


def test_extract_post_name_from_title():
    assert extract_post_name_from_title("Notification for the post of ALP against CEN 01/2024") == "ALP"
