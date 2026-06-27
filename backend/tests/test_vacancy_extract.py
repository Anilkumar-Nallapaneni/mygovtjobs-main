"""Vacancy count resolution — years must not inflate totals."""

from app.utils.vacancy_extract import extract_vacancies, is_probable_year, resolve_vacancies


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
