from app.parsers.pdf_parser import extract_fields, extract_structured_detail_fields, is_weak_field


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


def test_extract_fee_selection_and_how_to_apply_from_sections():
    text = """
    RECRUITMENT NOTICE

    APPLICATION FEE
    General: Rs. 500/-
    SC: Rs. 250/-
    ST: Rs. 250/-

    SELECTION PROCESS
    1. Written Examination
    2. Document Verification
    3. Interview

    HOW TO APPLY
    1. Register on the official portal
    2. Fill the online application form
    3. Upload required documents
    4. Pay the fee and submit before last date
    """
    fields = extract_fields(text)
    assert fields.get("fee")
    assert any("500" in str(v) for v in fields["fee"].values())
    assert fields.get("selection_process")
    assert any("Written" in s for s in fields["selection_process"])
    assert fields.get("how_to_apply")
    assert any("Register" in s or "portal" in s.lower() for s in fields["how_to_apply"])
    assert fields.get("application_fee")


def test_extract_structured_detail_fields_helper():
    sections = [
        {
            "heading": "Application Fee",
            "paragraphs": [],
            "tables": [[{"label": "General", "value": "Rs. 100"}, {"label": "SC", "value": "Rs. 50"}]],
            "lists": [],
            "links": [],
        }
    ]
    out = extract_structured_detail_fields(sections)
    assert out["fee"]["General"] == "Rs. 100"
    assert "application_fee" in out
