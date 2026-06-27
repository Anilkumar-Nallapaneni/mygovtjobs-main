from app.parsers.pdf_sections import text_to_content_sections


def test_text_to_content_sections_splits_headings():
    text = """
    RECRUITMENT NOTIFICATION

    IMPORTANT DATES
    Last date to apply: 15-07-2026
    Exam date: 01-08-2026

    ELIGIBILITY
    - Graduate in any discipline
    - Age 18 to 30 years

    HOW TO APPLY
    Apply online at https://example.gov.in/apply.pdf
    """
    sections = text_to_content_sections(text, pdf_url="https://example.gov.in/notice.pdf")
    headings = [s["heading"] for s in sections]
    assert "Introduction" in headings or "Notification" in headings
    assert any("Important Dates" in h or "important dates" in h.lower() for h in headings)
    assert any("Eligibility" in h for h in headings)
    assert any("How To Apply" in h or "how to apply" in h.lower() for h in headings)


def test_text_to_content_sections_extracts_fee_table():
    text = """
    APPLICATION FEE
    General: Rs. 500/-
    SC/ST: Nil
    OBC: Rs. 250/-
    """
    sections = text_to_content_sections(text)
    fee_section = next((s for s in sections if "fee" in s["heading"].lower()), sections[0])
    assert fee_section["tables"]
    labels = {row["label"] for table in fee_section["tables"] for row in table if "label" in row}
    assert "General" in labels
    assert "Sc/St" in labels or "SC/ST" in str(labels)


def test_text_to_content_sections_extracts_vacancy_matrix():
    text = """
    VACANCY DETAILS
    Post Name          Vacancies    Pay Scale
    Clerk              120          Level-4
    Assistant          45           Level-6
    """
    sections = text_to_content_sections(text)
    vac_section = next((s for s in sections if "vacanc" in s["heading"].lower()), sections[0])
    assert vac_section["tables"]
    first_table = vac_section["tables"][0]
    assert any("Clerk" in str(row.values()) for row in first_table)
