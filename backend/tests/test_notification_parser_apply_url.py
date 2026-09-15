from app.parsers.notification_parser import NotificationParser
from app.utils.official_hosts import looks_like_notification_document


def test_parser_never_sets_pdf_as_apply_url():
    parser = NotificationParser()
    out = parser.parse(
        {
            "title": "NPCIL Executive Trainee 2026",
            "link": "https://www.npcil.nic.in/writereaddata/Orders/notice.pdf",
            "pdfUrls": ["https://www.npcil.nic.in/writereaddata/Orders/notice.pdf"],
            "source": "npcil",
        },
        pdf_fields={
            "summary": "Official NPCIL recruitment notification text goes here.",
            "apply_urls": ["https://www.npcil.nic.in/career/"],
        },
    )
    assert out["apply_url"] == "https://www.npcil.nic.in/career/"
    assert looks_like_notification_document(out["detail"]["pdf_url"])


def test_parser_leaves_apply_url_empty_when_only_pdf_exists():
    parser = NotificationParser()
    out = parser.parse(
        {
            "title": "Department Circular PDF only",
            "link": "https://dept.gov.in/uploads/circular.pdf",
            "pdfUrls": ["https://dept.gov.in/uploads/circular.pdf"],
            "source": "dept",
        },
        pdf_fields={"summary": "A circular with no online apply portal listed."},
    )
    assert out["apply_url"] is None
    assert out["detail"]["pdf_url"].endswith(".pdf")


def test_parser_keeps_scraper_last_date_and_source_url():
    parser = NotificationParser()
    out = parser.parse(
        {
            "title": "IBPS CRP-RRBs-XV Recruitment of Officers",
            "link": "https://ibpsreg.ibps.in/rrbxvaug26/",
            "lastDate": "2026-09-21",
            "source_url": "https://www.ibps.in/wp-content/uploads/CRP-RRBs-XV-notification.pdf",
            "source": "ibps",
            "dept": "Institute of Banking Personnel Selection (IBPS)",
        }
    )
    assert out["last_date"] == "2026-09-21"
    assert out["source_url"] == (
        "https://www.ibps.in/wp-content/uploads/CRP-RRBs-XV-notification.pdf"
    )
