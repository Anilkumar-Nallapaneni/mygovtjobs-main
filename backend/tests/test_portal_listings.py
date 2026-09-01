"""Portal listing scrapers — RRB CEN table, BSF/BHEL filters, SSC events."""

from app.scrapers.portal_listings import classify_lifecycle_row, parse_rrb_cen_html, parse_rrb_open_cen_html
from app.scrapers.ssc_api import _is_event_headline, _is_recruitment_headline
from app.utils.official_hosts import is_official_recruitment_host

RRB_HTML = """
<table class="lq-rrb-notice-table">
  <tr><th>Date</th><th>CEN No.</th><th>Title</th><th>Posts</th><th>Current Status</th></tr>
  <tr onClick="window.location.href='cen.php?prmt=TkRjPQ=='">
    <td>14-07-2026</td><td>CEN 03/2026</td><td>Section Controller</td>
    <td>Section Controller</td><td>New</td>
  </tr>
  <tr onClick="window.location.href='cen.php?prmt=TkRBPQ=='">
    <td>21-10-2025</td><td>CEN 06/2025</td><td>NTPC Graduate</td>
    <td>Station Master</td><td>Result of CBT-I published.</td>
  </tr>
  <tr>
    <td>12-08-2024</td><td>CEN 04/2024</td><td>Paramedical</td>
    <td>Nursing</td><td>Panels published.</td>
  </tr>
</table>
"""


def test_rrb_cen_keeps_open_notices_and_skips_closed_panels():
    jobs = parse_rrb_cen_html(
        RRB_HTML,
        "https://www.rrbbbs.gov.in/notifications.php",
        kind="jobs",
        max_items=20,
        lookback_days=800,
        source_code="rrb-bbs",
    )
    titles = " ".join(row["title"] for row in jobs)
    assert "03/2026" in titles
    assert "04/2024" not in titles
    assert jobs[0]["link"] == "https://www.rrbbbs.gov.in/cen.php?prmt=TkRjPQ=="
    assert jobs[0]["category"] == "railways"


def test_rrb_cen_events_keep_result_status():
    events = parse_rrb_cen_html(
        RRB_HTML,
        "https://www.rrbbbs.gov.in/notifications.php",
        kind="events",
        max_items=20,
        lookback_days=800,
        source_code="rrb-bbs",
    )
    assert len(events) == 1
    assert "06/2025" in events[0]["title"]


def test_ssc_event_headline_inverse_of_jobs():
    assert _is_event_headline("Final Answer Key for Tier-I")
    assert not _is_recruitment_headline("Final Answer Key for Tier-I")
    assert _is_recruitment_headline("Notice of Combined Graduate Level Examination, 2026")
    assert not _is_event_headline("Notice of Combined Graduate Level Examination, 2026")


def test_iocl_and_bhel_hosts_are_official():
    assert is_official_recruitment_host("https://iocl.com/admin/img/UploadedFiles/LatestJobOpening/Files/ad.pdf")
    assert is_official_recruitment_host("https://careers.bhel.in/index.jsp")
    assert is_official_recruitment_host("https://www.bhel.com/career-bhel")


def test_classify_lifecycle_row_admit_and_result():
    assert classify_lifecycle_row("BSF Admit Card 2026") == "admit_card"
    assert classify_lifecycle_row("RRB JE Result declared") == "result"
    assert classify_lifecycle_row("IOCL Engineer Recruitment 2026") is None


def test_rrb_open_cen_html_keeps_detailed_notice_skips_faq():
    html = """
    <a href="https://www.rrbthiruvananthapuram.gov.in/assets/pdf/Detailed_CEN_04_2026.pdf">
      Detailed Centralised Employment Notice No 04/2026
    </a>
    <a href="https://www.rrbthiruvananthapuram.gov.in/assets/pdf/FAQ_CEN_04_2026.pdf">FAQ</a>
    <a href="https://www.rrbthiruvananthapuram.gov.in/assets/pdf/CEN_04_2026_Corrigendum1.pdf">Corrigendum</a>
    """
    rows = parse_rrb_open_cen_html(html, "https://www.rrbthiruvananthapuram.gov.in/")
    assert len(rows) == 1
    assert rows[0]["cen"] == "CEN 04/2026"
    assert rows[0]["pdf"].endswith("Detailed_CEN_04_2026.pdf")
    assert "Junior Engineer" in rows[0]["title"]
    assert "Recruitment" in rows[0]["title"]
    assert "Recruitment" in rows[0]["title"]
