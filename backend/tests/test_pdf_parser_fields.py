"""Unit tests for PDF field extraction from notification text."""

from app.parsers.pdf_parser import extract_fields, is_weak_field


def test_is_weak_field_placeholders():
    assert is_weak_field("")
    assert is_weak_field("—")
    assert is_weak_field("Not specified")
    assert is_weak_field("See notification")
    assert not is_weak_field("Graduate")
    assert not is_weak_field("Rs. 25000")


def test_extract_qualification_salary_and_address():
    text = """
    GOVERNMENT OF INDIA
    Essential Qualification: Graduate from a recognized University
    Pay Scale: Rs. 35400 - 112400 (Level-6)
    Age Limit: 18-27 years
    Office Address: CGO Complex, Lodhi Road, New Delhi
    Pin Code: 110003
    Last Date: 15-08-2026
    Total 42 posts
    """
    fields = extract_fields(text)
    assert "Graduate" in fields["qualification"]
    assert "35400" in fields["salary"]
    assert fields["streetAddress"].startswith("CGO Complex")
    assert fields["postalCode"] == "110003"
    assert fields["vacancies"] == 42
    assert fields.get("last_date")


def test_extract_inline_salary_without_label():
    fields = extract_fields("Remuneration will be Rs. 23350 per month consolidated.")
    assert fields["salary"] == "Rs. 23350"


def test_rejects_bare_city_as_street_address():
    fields = extract_fields("Address: New Delhi\nPin Code: 110001")
    assert "streetAddress" not in fields
    assert fields.get("postalCode") == "110001"


def test_extracts_indian_letterhead_address_and_city_pin():
    text = (
        "H.P. POWER TRANSMISSION CORPORATION LTD.\n"
        "Himfed Bhawan, Panjari (Below old MLA Quarters) SHIMLA-171005.\n"
        "Phones: 0177-2831283\n"
        "Pay Scale: Rs. 13000 Per Month\n"
    )
    fields = extract_fields(text)
    assert fields.get("postalCode") == "171005"
    assert "Himfed Bhawan" in (fields.get("streetAddress") or "")
    assert fields.get("salary") == "Rs. 13000 Per Month"
