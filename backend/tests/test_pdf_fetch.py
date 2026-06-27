from app.parsers.pdf_fetch import _is_pdf_bytes, extract_text_from_pdf_bytes


def test_is_pdf_bytes_rejects_html():
    assert not _is_pdf_bytes(b"<!DOCTYPE html><html></html>")
    assert _is_pdf_bytes(b"%PDF-1.4\n%fake")


def test_extract_text_from_pdf_bytes_empty_on_html():
    assert extract_text_from_pdf_bytes(b"<html>not a pdf</html>") == ""


def test_extract_text_from_real_pdf_roundtrip():
    import fitz

    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((72, 72), "RECRUITMENT NOTIFICATION\nTotal Vacancies: 120 posts")
    data = doc.tobytes()
    doc.close()

    assert _is_pdf_bytes(data)
    text = extract_text_from_pdf_bytes(data, ocr_enabled=False)
    assert "RECRUITMENT" in text
    assert "120" in text
