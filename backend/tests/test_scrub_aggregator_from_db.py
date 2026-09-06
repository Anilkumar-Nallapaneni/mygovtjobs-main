"""Focused tests for the DB/catalog scrubber helpers."""

from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path


def _load_scrubber():
    path = Path(__file__).resolve().parents[2] / "scripts" / "scrub-aggregator-from-db.py"
    spec = spec_from_file_location("scrub_aggregator_from_db", path)
    assert spec and spec.loader
    module = module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_corrupt_official_apply_url_can_be_replaced_from_pdf():
    scrubber = _load_scrubber()
    detail = {
        "notification_url": "https://mppsc.mp.gov.in/uploads/advertisement/example.pdf",
        "pdf_urls": ["https://mppsc.mp.gov.in/uploads/advertisement/example.pdf"],
    }

    assert scrubber._bad_apply_url("http://www.mppsc.mp.gov.in/^")
    assert scrubber._bad_apply_url("http://www.mppsc.mp.gov.ln/")
    assert (
        scrubber._replacement_apply_url(detail, None, None)
        == "https://mppsc.mp.gov.in/uploads/advertisement/example.pdf"
    )
