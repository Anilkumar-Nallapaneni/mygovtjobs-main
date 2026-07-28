from app.services.job_review_service import review_fingerprint


def test_review_fingerprint_is_stable_across_key_order():
    left = review_fingerprint({"title": "UPSC Recruitment", "source": {"code": "upsc"}})
    right = review_fingerprint({"source": {"code": "upsc"}, "title": "UPSC Recruitment"})
    assert left == right


def test_review_fingerprint_changes_with_source_record():
    first = review_fingerprint({"title": "UPSC Recruitment", "source_url": "https://upsc.gov.in/1"})
    second = review_fingerprint({"title": "UPSC Recruitment", "source_url": "https://upsc.gov.in/2"})
    assert first != second
