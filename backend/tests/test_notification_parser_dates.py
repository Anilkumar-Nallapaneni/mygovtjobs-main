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


def test_title_month_name_apply_window():
    parser = NotificationParser()
    fields = parser._extract_dates_from_title(
        "UPSC - Online Applications are invited for Direct Recruitment by selection "
        "through website to various posts from 25th July, 2026 to 14th August, 2026"
    )
    assert fields.get("published_date") == "2026-07-25"
    assert fields.get("last_date") == "2026-08-14"


def test_title_last_date_is_month_name():
    parser = NotificationParser()
    fields = parser._extract_dates_from_title(
        "Last date for submission of online application is 21 September 2026"
    )
    assert fields.get("last_date") == "2026-09-21"


def test_title_walk_in_dated_month_is_last_date():
    parser = NotificationParser()
    fields = parser._extract_dates_from_title(
        "Walk-in Interview for Engagement of Consultants (Doctors) advt. dated 18/AUG/2026"
    )
    assert fields.get("last_date") == "2026-08-18"
    assert fields.get("published_date") is None


def test_title_registration_from_month_without_to_is_published_only():
    parser = NotificationParser()
    fields = parser._extract_dates_from_title(
        "SBI Recruitment of Junior Associates (Customer Support & Sales)Registration From07-Aug-2026"
    )
    assert fields.get("published_date") == "2026-08-07"
    assert fields.get("last_date") is None


def test_title_closing_date_extension_iso():
    parser = NotificationParser()
    fields = parser._extract_dates_from_title("(Group-D) Closing Date Extension 2026-09-30")
    assert fields.get("last_date") == "2026-09-30"
