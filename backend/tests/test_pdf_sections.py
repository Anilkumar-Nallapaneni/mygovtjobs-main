import re

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


def test_text_to_content_sections_splits_collapsed_summary():
    text = (
        "Staff Selection Commission. IMPORTANT DATES Last date 15-08-2026. "
        "ELIGIBILITY Graduate degree required. AGE LIMIT 18-27 years. "
        "APPLICATION FEE General Rs. 100. SELECTION PROCESS Written exam. "
        "HOW TO APPLY Apply online on the official portal before closing date."
    )
    sections = text_to_content_sections(text)
    headings = " ".join(s["heading"] for s in sections).lower()
    assert "important dates" in headings or "eligibility" in headings or "how to apply" in headings
    assert len(sections) >= 2


def test_faq_answers_are_not_overview_kv_cards():
    text = """
    ISRO CENTRALISED RECRUITMENT BOARD
    Online applications are invited for Scientist/Engineer SC posts.

    AGE LIMIT
    28 years as on 17-08-2026

    FREQUENTLY ASKED QUESTIONS AND ANSWERS
    1. I wish to apply for the post. Can you send the link?
    Answer: Link for applying online is available in the CAREERS portal.
    2. Where do I find the Registration Number?
    Answer: Once application is successfully submitted the registration number will be displayed.
    3. My University name does not appear?
    Answer: You may select other Universities option available in the drop down menu.
    4. Why is make payment missing for women candidates?
    Answer: All Women candidates are exempted from payment of Application Fee.
    """
    sections = text_to_content_sections(text)
    answer_labels = [
        row.get("label")
        for sec in sections
        for table in sec.get("tables") or []
        for row in table
        if str(row.get("label") or "").lower() == "answer"
    ]
    assert answer_labels == []
    assert any(re.search(r"faq", s["heading"], re.I) for s in sections)


def test_paper_code_colon_does_not_split_kv():
    text = """
    ELIGIBILITY
    GATE Qualification : Valid GATE score in Computer Science & Information Technology [Paper Code : CS]
    Age Limit : 28 years as on 17-08-2026
    Apply Mode : Online
    """
    sections = text_to_content_sections(text)
    labels = [
        row.get("label", "")
        for sec in sections
        for table in sec.get("tables") or []
        for row in table
    ]
    assert not any(lab.rstrip().endswith("Paper Code") or lab.rstrip().endswith("[Paper Code") for lab in labels)
    values = [
        str(row.get("value") or "")
        for sec in sections
        for table in sec.get("tables") or []
        for row in table
    ]
    assert not any(re.fullmatch(r"CS\]?", v) for v in values)
