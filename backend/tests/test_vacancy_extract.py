"""Vacancy count resolution — years must not inflate totals."""

from app.utils.vacancy_extract import (
    extract_vacancies,
    is_non_vacancy_document,
    is_probable_year,
    resolve_vacancies,
    sanitize_vacancies,
)


def test_non_vacancy_docs_zeroed():
    assert is_non_vacancy_document("Cat 29 Result against CEN 07-2024")
    assert sanitize_vacancies(190902, "Cat 29 Result against CEN 07-2024") == 0
    assert (
        sanitize_vacancies(
            188204,
            "LIST OF CANDIDATES SHORTLISTED FOR DOCUMENT VERIFICATION",
        )
        == 0
    )
    assert sanitize_vacancies(104903, "C1Exam Group 05 - Level 7-RRB-20-Publish_Report") == 0
    assert sanitize_vacancies(7, "7 Vacancy circular for posts of Deputy Director") == 7
    assert resolve_vacancies(190902, "Cat%2029%20Result%20against%20CEN", "") == 0


def test_vacancy_circular_date_not_counted():
    title = "Engagement of Legal Consultants on Contract Basis"
    summary = "Cf Dated: 03.06.2026 VACANCY CIRCULAR Subject: Engagement of Legal Consultants"
    assert extract_vacancies(summary, title=title) == 0
    assert resolve_vacancies(2026, title, summary) == 0
    assert sanitize_vacancies(2026, title, summary) == 0


def test_year_in_advertisement_not_counted():
    title = "Notice: 05 Posts of Assistant Legal Adviser, Ministry of Finance"
    summary = "Advertisement No. 06/2025 Vacancy No. 25050622224"
    assert resolve_vacancies(2025, title, summary) == 5


def test_cen_year_in_db_zeroed_without_posts_in_title():
    title = "CEN -07/2024 -- MINISTERIAL AND ISOLATED CATEGORIES"
    assert resolve_vacancies(2026, title, "") == 0


def test_is_probable_year_false_when_year_not_in_text():
    assert is_probable_year(2026, "CEN -07/2024 recruitment") is False


def test_real_post_count_kept():
    title = "Recruitment for 120 posts of Constable"
    assert extract_vacancies(title, title=title) == 120
    assert resolve_vacancies(120, title, "") == 120


def test_pincode_before_posts_label_not_counted():
    body = (
        "Venue: ESIC Model Hospital, Sector 9A, Gurugram, Haryana - 122001\n"
        "Posts :\n"
        "1) Full-Time Contractual Specialist - 14\n"
        "2) Senior Residents (03 Years) – 34\n"
    )
    assert extract_vacancies(body, title="ESIC Gurugram walk-in") == 48
    assert resolve_vacancies(122001, "ESIC Gurugram walk-in", body) == 48
    assert resolve_vacancies(122001, "ESIC Gurugram walk-in", body, posts_sum=48) == 48


def test_posts_sum_out_of_range_sanitized():
    title = "Recruitment for 120 posts of Constable"
    assert resolve_vacancies(0, title, "", posts_sum=500_000) == 0
    assert resolve_vacancies(0, "Advt 06/2025 recruitment", "", posts_sum=2025) == 0


def test_parenthetical_and_word_post_counts():
    title = "Filling up of two (02) posts of Upper Division Clerk (UDC) on deputation basis"
    assert extract_vacancies(title, title=title) == 2
    assert resolve_vacancies(0, title, "") == 2
    assert extract_vacancies("Walk-in for twelve posts", title="Walk-in") == 0  # twelve not mapped
    assert extract_vacancies("Engagement of three posts of Consultant", title="Engagement") == 3


def test_rrb_cen_total_after_pay_level_row():
    body = """
    Total Vacancies
    (All RRBs)
    Various Posts of Junior Engineer and Depot Material Superintendent
    Level 6
    35,400
    See Annexure-A
    18-33 years
    3993
    RRB-wise & Railway Zone/PU-wise detailed distribution of vacancies is given in Annexure-B.
    """
    assert extract_vacancies(body, title="RRB CEN 04/2026") == 3993


def test_open_cen_title_keeps_vacancies_despite_result_of_cbt_in_body():
    title = "RRB Recruitment CEN 04/2026 — 3993 posts of Junior Engineer, DMS and CMA"
    body = "The result of the CBT will be published on RRB websites. Document verification follows."
    assert extract_vacancies(title, title=title) == 3993
    assert resolve_vacancies(3993, title, body) == 3993

