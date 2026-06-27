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
