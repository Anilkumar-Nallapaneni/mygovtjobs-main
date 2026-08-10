from app.parsers.notification_parser import NotificationParser


def test_title_dated_maps_to_published_date():
    parser = NotificationParser()
    fields = parser._extract_dates_from_title("VNSGU Recruitment dated 21-06-2026")
    assert fields.get("published_date") == "2026-06-21"
    assert fields.get("last_date") is None


def test_title_range_splits_posted_and_last():
    parser = NotificationParser()
    fields = parser._extract_dates_from_title("Apply Online from 01-06-2026 to 21-06-2026")
    assert fields.get("published_date") == "2026-06-01"
    assert fields.get("last_date") == "2026-06-21"


def test_title_last_date_label_numeric():
    parser = NotificationParser()
    fields = parser._extract_dates_from_title("SSC CGL Recruitment 2026 Last Date 30-08-2026")
    assert fields.get("last_date") == "2026-08-30"
    assert fields.get("published_date") is None


def test_title_closing_date_month_name():
    parser = NotificationParser()
    fields = parser._extract_dates_from_title(
        "UPSC CDS Recruitment Closing Date: 30th June 2026"
    )
    assert fields.get("last_date") == "2026-06-30"


def test_title_registration_extended_sets_last_date():
    parser = NotificationParser()
    fields = parser._extract_dates_from_title(
        "IBPS PO CRP XV Recruitment Online Registration extended till 15-09-2026"
    )
    assert fields.get("last_date") == "2026-09-15"
