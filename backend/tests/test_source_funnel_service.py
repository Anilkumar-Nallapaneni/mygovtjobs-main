from app.services.source_funnel_service import rejection_bucket, summarize_rows


def test_rejection_bucket_prefers_actionable_missing_field():
    assert rejection_bucket(["Missing fields: qualification, salary"]) == "missing_qualification"
    assert rejection_bucket(["No usable primary PDF (best_score=-10)"]) == "missing_pdf"


def test_source_funnel_counts_only_approved_live_rows_as_published():
    summary = summarize_rows([
        {"status": "live", "published_to_site": True, "vacancies": 12, "review_reasons": []},
        {"status": "draft", "published_to_site": False, "vacancies": 9, "review_reasons": ["Missing last_date"]},
        {"status": "live", "published_to_site": False, "vacancies": 4, "review_reasons": ["unverified"]},
    ])
    assert summary["stored"] == 3
    assert summary["published"] == 1
    assert summary["vacancies"] == 12
    assert summary["yield_percent"] == 33.33
    assert summary["rejection_reasons"] == {"missing_deadline": 1, "low_quality": 1}
