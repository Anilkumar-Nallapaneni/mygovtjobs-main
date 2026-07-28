import importlib.util
from pathlib import Path

from app.services.publish_gate import ValidationResult


SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "audit-live-jobs.py"
SPEC = importlib.util.spec_from_file_location("audit_live_jobs", SCRIPT)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def test_recommended_action_expires_past_deadline():
    result = ValidationResult(valid=False, errors=["Past deadline"], confidence=90)
    assert MODULE.recommended_action({}, result, "200", "200") == "mark_expired"


def test_recommended_action_keeps_approved_high_confidence_row():
    result = ValidationResult(valid=True, confidence=95)
    row = {"status": "live", "published_to_site": True}
    assert MODULE.recommended_action(row, result, "200", "200") == "keep_active"
