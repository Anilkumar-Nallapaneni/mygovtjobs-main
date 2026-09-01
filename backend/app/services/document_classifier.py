"""Classify discovered documents before they are published as jobs."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

from app.services.noise_filter import is_tender_or_procurement
from app.utils.vacancy_extract import is_non_vacancy_document

DOCUMENT_TYPES = (
    "RECRUITMENT",
    "POSSIBLE_RECRUITMENT",
    "RESULT",
    "ADMIT_CARD",
    "ANSWER_KEY",
    "CORRIGENDUM",
    "EXAM_NOTICE",
    "RECRUITMENT_RULES",
    "FORM",
    "TENDER",
    "GENERAL_NOTICE",
    "OTHER_NOTICE",
    "UNKNOWN",
)

RECRUITMENT_TERMS = (
    "recruitment",
    "vacancy",
    "vacancies",
    "applications are invited",
    "apply online",
    "advertisement",
    "engagement of",
    "appointment of",
    "walk-in interview",
    "walk in interview",
    "bharti",
    "advt",
    "notice of",
    "re-opening of window",
    "window for submission of online application",
    "window for online application",
    "centralised employment notice",
    "centralized employment notice",
    "cen no",
)

BLOCKED_TERMS = (
    "final result",
    "result notice",
    "marks",
    "cut-off",
    "cut off",
    "answer key",
    "admit card",
    "hall ticket",
    "recruitment rules",
    "tender",
    "expression of interest",
    "notice inviting tender",
    "press release",
    "press note",
    "speech",
    "annual report",
)

# Ordered patterns for fine-grained document_type (used by persist / filters).
_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("ADMIT_CARD", re.compile(r"\b(?:admit\s*card|hall\s*ticket|call\s*letter)\b", re.I)),
    ("ANSWER_KEY", re.compile(r"\banswer\s*keys?\b", re.I)),
    (
        "RESULT",
        re.compile(
            r"\b(?:final\s+result|result\s+(?:notice|of|for|against)|merit\s*list|"
            r"select(?:ed|ion)\s+list|cut[\s-]?off|provisionally\s*(?:in-?)?eligible|"
            r"list\s+of\s+(?:selected|shortlisted)\s+candidates)\b",
            re.I,
        ),
    ),
    ("CORRIGENDUM", re.compile(r"\bcorrigendum|addendum\b", re.I)),
    (
        "RECRUITMENT_RULES",
        # Do NOT treat bare "gazette notification" as rules — many open recruitments
        # are published as gazette notifications and must stay RECRUITMENT.
        re.compile(r"\brecruitment\s+rules?\b|\bservice\s+rules?\b", re.I),
    ),
    (
        "FORM",
        re.compile(
            r"\b(?:declaration\s+form|obc\s+declaration|"
            r"caste\s+certificate\s+format|affidavit\s+format)\b",
            re.I,
        ),
    ),
    (
        "EXAM_NOTICE",
        re.compile(
            r"\b(?:exam(?:ination)?\s+(?:schedule|time\s*table|date|notice)|"
            r"tentative\s+exam|seating\s*plan)\b",
            re.I,
        ),
    ),
    (
        "GENERAL_NOTICE",
        re.compile(
            r"\b(?:press\s+(?:note|release)|public\s+notice|circular\s*:|"
            r"hackathon|awards?\s+and\s+honors?|operational\s+and\s+business)\b",
            re.I,
        ),
    ),
    (
        "RECRUITMENT",
        re.compile(
            r"\b(?:recruitment|vacancy\s+circular|walk[\s-]?in|bharti|"
            r"apply\s+online|advt\.?\s*no|advertisement\s+no|"
            r"engagement\s+of|invites?\s+applications?|"
            r"notice\s+of\b[\s\S]{0,100}\bexamination\b|"
            r"re-?opening\s+of\s+window|"
            r"window\s+for\s+(?:submission\s+of\s+)?(?:online\s+)?application|"
            r"centrali[sz]ed\s+employment\s+notice|"
            r"\bcen\s+(?:no\.?\s*)?\d{2}/\d{4})\b",
            re.I,
        ),
    ),
]


@dataclass
class ClassificationResult:
    content_type: str
    confidence: float
    reasons: list[str] = field(default_factory=list)
    document_type: str = "UNKNOWN"

    @property
    def is_recruitment(self) -> bool:
        return self.content_type == "RECRUITMENT"

    @property
    def should_auto_accept(self) -> bool:
        return self.content_type == "RECRUITMENT" and self.confidence >= 0.85


def _blob(title: str = "", url: str = "", text: str = "", dept: str = "") -> str:
    return " ".join(str(p or "") for p in (title, dept, url, text)).strip()


def classify_document(title: str, body: str = "", *, url: str = "", dept: str = "") -> ClassificationResult:
    """Deterministic gate used before PDF parsing / persist."""
    text = re.sub(r"\s+", " ", f"{title} {body} {url} {dept}").lower()

    if is_tender_or_procurement(title, url):
        return ClassificationResult(
            content_type="OTHER_NOTICE",
            confidence=0.95,
            reasons=["Blocked: tender/procurement"],
            document_type="TENDER",
        )

    blocked = [term for term in BLOCKED_TERMS if term in text]
    recruitment = [term for term in RECRUITMENT_TERMS if term in text]

    # Prefer fine-grained type when blocked terms dominate.
    fine = classify_document_type(title=title, url=url, text=body, dept=dept)

    if blocked and not recruitment:
        return ClassificationResult(
            content_type="OTHER_NOTICE",
            confidence=0.95,
            reasons=[f"Blocked term: {term}" for term in blocked],
            document_type=fine if fine != "RECRUITMENT" else "GENERAL_NOTICE",
        )

    if len(recruitment) >= 2:
        return ClassificationResult(
            content_type="RECRUITMENT",
            confidence=0.90,
            reasons=[f"Recruitment term: {term}" for term in recruitment],
            document_type="RECRUITMENT",
        )

    if fine == "RECRUITMENT" and recruitment:
        return ClassificationResult(
            content_type="RECRUITMENT",
            confidence=0.88,
            reasons=[f"Recruitment pattern + term: {recruitment[0]}"],
            document_type="RECRUITMENT",
        )

    if len(recruitment) == 1:
        return ClassificationResult(
            content_type="POSSIBLE_RECRUITMENT",
            confidence=0.65,
            reasons=[f"Weak recruitment signal: {recruitment[0]}"],
            document_type="UNKNOWN" if fine == "RECRUITMENT" else fine,
        )

    if fine not in ("RECRUITMENT", "UNKNOWN"):
        return ClassificationResult(
            content_type="OTHER_NOTICE",
            confidence=0.90,
            reasons=[f"Classified as {fine}"],
            document_type=fine,
        )

    if is_non_vacancy_document(title, body or url):
        return ClassificationResult(
            content_type="OTHER_NOTICE",
            confidence=0.85,
            reasons=["Non-vacancy document heuristics"],
            document_type="GENERAL_NOTICE",
        )

    return ClassificationResult(
        content_type="UNKNOWN",
        confidence=0.25,
        reasons=["No clear recruitment indicators"],
        document_type="UNKNOWN",
    )


def classify_document_type(
    title: str = "",
    url: str = "",
    text: str = "",
    dept: str = "",
) -> str:
    """Return one of DOCUMENT_TYPES for a discovered record (legacy API)."""
    probe = _blob(title, url, text, dept)
    if not probe:
        return "UNKNOWN"

    if is_tender_or_procurement(title, url):
        return "TENDER"

    for doc_type, pattern in _PATTERNS:
        if pattern.search(probe):
            return doc_type

    if is_non_vacancy_document(title, text or url):
        return "GENERAL_NOTICE"

    return "UNKNOWN"


def classify_from_normalized(normalized: dict[str, Any]) -> str:
    detail = normalized.get("detail") if isinstance(normalized.get("detail"), dict) else {}
    summary = str(detail.get("summary") or "")
    pdf_urls = detail.get("pdf_urls") or detail.get("pdfUrls") or []
    url_bits = " ".join(
        [
            str(normalized.get("apply_url") or ""),
            str(normalized.get("source_url") or ""),
            *[str(u) for u in pdf_urls if isinstance(u, str)],
        ]
    )
    result = classify_document(
        str(normalized.get("title") or ""),
        summary,
        url=url_bits,
        dept=str(normalized.get("dept") or ""),
    )
    return result.document_type
