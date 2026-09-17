"""Load the shared public-job policy used by Python and TypeScript."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

_SHARED_PATH = Path(__file__).resolve().parents[3] / "shared" / "public-job-policy.json"


@lru_cache(maxsize=1)
def public_job_policy() -> dict:
    return json.loads(_SHARED_PATH.read_text(encoding="utf-8"))


def public_document_type() -> str:
    return str(public_job_policy().get("documentType") or "RECRUITMENT").upper()


def public_verification_statuses() -> tuple[str, ...]:
    raw = public_job_policy().get("verificationStatuses") or ["VERIFIED", "PARTIALLY_VERIFIED"]
    return tuple(str(status).upper() for status in raw)


def public_min_completeness() -> int:
    return int(public_job_policy().get("minimumCompleteness") or 70)


def public_min_confidence() -> float:
    return float(public_job_policy().get("minimumConfidence") or 90)
