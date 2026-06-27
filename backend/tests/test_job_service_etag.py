from app.services.job_service import _list_cache_fingerprint


def test_list_cache_fingerprint_changes_with_filters():
    base = _list_cache_fingerprint()
    filtered = _list_cache_fingerprint(state="up", category="ssc", q="clerk", limit=25, offset=10)
    assert base != filtered


def test_list_cache_fingerprint_is_stable_for_same_query():
    a = _list_cache_fingerprint(state="mh", category="banking", q="PO", limit=50, offset=0)
    b = _list_cache_fingerprint(state="mh", category="banking", q="PO", limit=50, offset=0)
    assert a == b
