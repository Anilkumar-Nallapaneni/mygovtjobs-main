import hashlib
import re
import unicodedata


def _normalize_title(title: str) -> str:
    t = unicodedata.normalize("NFKD", title or "")
    t = re.sub(r"[^\w\s]", " ", t.lower())
    return re.sub(r"\s+", " ", t).strip()


def content_hash(*, title: str, apply_url: str | None, last_date: str | None) -> str:
    url = (apply_url or "").strip().lower()
    last = str(last_date or "").strip()
    # PDF / document URLs are stable; portal link text often is not (e.g. "English(676 KB)").
    if url and (".pdf" in url or "/documents/" in url):
        canonical = f"{url}|{last}"
    else:
        canonical = "|".join([_normalize_title(title), url, last])
    return hashlib.sha256(canonical.encode()).hexdigest()


def title_fingerprint(title: str) -> str:
    """Stable hash for near-duplicate title clustering."""
    normalized = _normalize_title(title)
    if not normalized:
        return ""
    return hashlib.sha256(normalized.encode()).hexdigest()[:32]
