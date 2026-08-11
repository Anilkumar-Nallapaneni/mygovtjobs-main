"""Contract tests for the canonical operational pipeline."""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location("canonical_pipeline", ROOT / "scripts" / "run_pipeline.py")
assert SPEC and SPEC.loader
PIPELINE = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = PIPELINE
SPEC.loader.exec_module(PIPELINE)


def test_daily_and_production_share_one_idempotent_plan():
    daily = PIPELINE.plan("daily")
    production = PIPELINE.plan("production")
    assert daily == production
    assert len({step.name for step in daily}) == len(daily)
    assert sum(any(part.endswith("run-sync-production.py") for part in step.command) for step in daily) == 1
    assert sum(any(part.endswith("verify-live-jobs-snapshot.mjs") for part in step.command) for step in daily) == 1


def test_all_pipeline_steps_have_explicit_contracts():
    for mode in ("daily", "production", "weekly", "verify"):
        steps = PIPELINE.plan(mode)
        assert steps
        assert all(step.name.strip() and step.command for step in steps)
        assert all(isinstance(step.required, bool) for step in steps)
