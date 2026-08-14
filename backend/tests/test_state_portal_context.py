from app.parsers.notification_parser import NotificationParser
from app.scrapers.state_portal_html import StatePortalHtmlScraper, _extract_links


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


def test_skip_common_paths_stays_on_listing_url():
    scraper = StatePortalHtmlScraper(
        "https://www.bharatpetroleum.in/careers/job-openings",
        "all",
        skip_common_paths=True,
    )
    assert scraper.skip_common_paths is True
    assert scraper.portal_url.endswith("/careers/job-openings")
