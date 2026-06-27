"""Validation agent — expired jobs, broken links, missing fields, scam filtering."""

import re
from typing import Any
from urllib.parse import urlparse

from app.utils.official_hosts import is_official_recruitment_host
from app.services.noise_filter import (
    clean_job_title,
    is_junk_job_title,
    is_portal_section_link,
    is_result_archive_listing,
    is_tender_or_procurement,
    looks_like_job_notification,
)

_SCAM = re.compile(
    r"whatsapp|telegram\s*group|pay\s*fee\s*to\s*apply|registration\s*fee\s*only|"
    r"guaranteed\s*job|agent\s*required|call\s*\d{10}",
    re.I,
)
_BLOCKED_AGGREGATOR_NAMES = (
    "freejobalert",
    "sarkariresult",
    "sarkarijob",
    "governmentjob",
    "indgovtjobs",
    "rojgarresult",
    "jobriya",
    "fresherslive",
)
_BLOCKED_BRAND_NAMES = (*_BLOCKED_AGGREGATOR_NAMES, "sarkarinaukri")
_BLOCKED_AGGREGATOR_PATTERN = "|".join(re.escape(name) for name in _BLOCKED_AGGREGATOR_NAMES)
_BLOCKED_BRAND_PATTERN = "|".join(re.escape(name) for name in _BLOCKED_BRAND_NAMES)
_BLOCKED_AGGREGATOR = re.compile(r"(?:^|\.)(?:" + _BLOCKED_AGGREGATOR_PATTERN + r")\.", re.I)
_BLOCKED_BRAND_TEXT = re.compile(_BLOCKED_BRAND_PATTERN, re.I)


class ValidationService:
    def validate(self, normalized: dict[str, Any]) -> tuple[bool, list[str]]:
        """Return (is_valid, reasons)."""
        reasons: list[str] = []
        title = clean_job_title(normalized.get("title"))
        apply_url = normalized.get("apply_url") or ""
        if len(title) < 8:
            reasons.append("title_too_short")
        if is_junk_job_title(title, apply_url):
            reasons.append("junk_title")
        if is_tender_or_procurement(title, apply_url):
            reasons.append("tender_or_procurement")
        if not looks_like_job_notification(title, apply_url):
            reasons.append("not_job_notification")
        detail = normalized.get("detail", {})
        summary = detail.get("summary") if isinstance(detail, dict) else ""
        brand_probe = " ".join(str(part or "") for part in (title, normalized.get("dept"), summary))
        if _BLOCKED_BRAND_TEXT.search(brand_probe):
            reasons.append("aggregator_brand")

        if is_portal_section_link(title, apply_url):
            reasons.append("portal_nav_link")
        if is_result_archive_listing(title, apply_url):
            reasons.append("result_archive")

        if _SCAM.search(title) or _SCAM.search(summary or ""):
            reasons.append("scam_pattern")

        if apply_url:
            try:
                host = urlparse(apply_url).hostname or ""
                if host and _BLOCKED_AGGREGATOR.search(host):
                    reasons.append("aggregator_link")
                elif not is_official_recruitment_host(apply_url):
                    if any(x in host for x in ("bit.ly", "t.me", "wa.me", "goo.gl")):
                        reasons.append("suspicious_link")
                    else:
                        reasons.append("non_official_link")
            except Exception:
                reasons.append("invalid_url")

        # Expired listings are kept for archive — status set at persist time

        if not normalized.get("apply_url") and not normalized.get("pdf_urls"):
            reasons.append("missing_link")

        return len(reasons) == 0, reasons
