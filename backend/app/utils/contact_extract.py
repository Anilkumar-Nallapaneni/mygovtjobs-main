"""Pull official helpdesk emails (and grievance portals) from notification text."""

from __future__ import annotations

import re
from typing import Any

from app.utils.official_hosts import is_official_recruitment_host

_EMAIL_RE = re.compile(r"\b([A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,})\b", re.I)
_OBFUSCATED_AT = re.compile(r"\s*(?:\[|\()?\s*at\s*(?:\]|\))?\s*", re.I)
_OBFUSCATED_DOT = re.compile(r"\s*(?:\[|\()?\s*dot\s*(?:\]|\))?\s*", re.I)
_TRAIL_PUNCT = re.compile(r"[),.;:>\]]+$")
_JUNK_LOCAL = re.compile(
    r"^(?:noreply|no-?reply|donotreply|do-?not-reply|mailer-daemon|webmaster|admin|root)$",
    re.I,
)
_PREFERRED_LOCAL = re.compile(
    r"helpdesk|help-?desk|helpline|grievance|quer(?:y|ies)|facilitation|"
    r"recruit|career|vacancy|ssc|ibps|upsc|rrb|contact",
    re.I,
)
_CONSUMER_HOST = re.compile(
    r"(?:^|\.)(?:gmail|googlemail|yahoo|ymail|hotmail|outlook|live|rediff|rediffmail|"
    r"protonmail|icloud|aol)\.",
    re.I,
)
_HELPDESK_URL_RE = re.compile(
    r"https?://[^\s<>\"']*(?:cgrs|grievance|helpdesk|helpline|facilitation|pgportal)[^\s<>\"']*",
    re.I,
)


def _normalize_obfuscated(text: str) -> str:
    """Turn helpdesk[at]ssc[dot]gov[dot]in into a real address before matching."""
    blob = _OBFUSCATED_AT.sub("@", text)
    return _OBFUSCATED_DOT.sub(".", blob)


def _clean_email(raw: str) -> str | None:
    email = _TRAIL_PUNCT.sub("", (raw or "").strip().lower())
    if email.count("@") != 1:
        return None
    local, _, host = email.partition("@")
    if not local or not host or "." not in host:
        return None
    if local.startswith(".") or host.startswith(".") or ".." in email:
        return None
    if _JUNK_LOCAL.match(local):
        return None
    if _CONSUMER_HOST.search(host + "."):
        return None
    if host in {"gov.in", "nic.in", "ac.in", "edu.in", "res.in"}:
        return f"{local}@{host}"
    if not is_official_recruitment_host(f"https://{host}/"):
        return None
    return f"{local}@{host}"


def _score_email(email: str) -> int:
    local = email.split("@", 1)[0]
    host = email.split("@", 1)[1]
    score = 0
    if _PREFERRED_LOCAL.search(local):
        score += 40
    if host.endswith(".gov.in") or host.endswith(".nic.in"):
        score += 8
    if "helpdesk" in local or "grievance" in local:
        score += 10
    return score


def extract_official_contacts(text: str) -> dict[str, Any]:
    """Return helpdesk_emails (best first) and optional helpdesk_url from notice text."""
    if not text or not str(text).strip():
        return {}
    blob = _normalize_obfuscated(str(text))
    found: list[str] = []
    seen: set[str] = set()
    for match in _EMAIL_RE.finditer(blob):
        email = _clean_email(match.group(1))
        if not email or email in seen:
            continue
        seen.add(email)
        found.append(email)
    found.sort(key=_score_email, reverse=True)
    out: dict[str, Any] = {}
    if found:
        out["helpdesk_emails"] = found[:5]
        out["helpdesk_email"] = found[0]

    for match in _HELPDESK_URL_RE.finditer(blob):
        url = _TRAIL_PUNCT.sub("", match.group(0))
        if is_official_recruitment_host(url):
            out["helpdesk_url"] = url
            break
    return out
