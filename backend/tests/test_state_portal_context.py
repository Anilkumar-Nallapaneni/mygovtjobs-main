from app.parsers.notification_parser import NotificationParser
from app.scrapers.state_portal_html import _extract_links


def test_portal_row_context_supplies_deadline_and_vacancies():
    html = """
    <table><tr>
      <td>Recruitment of Junior Engineers</td>
      <td>125 posts</td>
      <td>Closing Date: 30-09-2026</td>
      <td><a href="/docs/je-notification.pdf">Official notification</a></td>
    </tr></table>
    """
    item = _extract_links(html, "https://example.gov.in/recruitment", max_items=5)[0]
    normalized = NotificationParser().parse(
        {
            "title": item["title"],
            "link": item["link"],
            "pdfUrls": item["pdfUrls"],
            "summary": item["parentText"],
            "source": "example",
        },
        source_code="example",
    )

    assert normalized["last_date"] == "2026-09-30"
    assert normalized["vacancies"] == 125
