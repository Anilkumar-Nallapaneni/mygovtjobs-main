"""Daily sync once-per-day guard — scheduled slot vs early manual runs."""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import pytest

from app.services.daily_sync_service import DailySyncService

IST = ZoneInfo("Asia/Kolkata")


@pytest.fixture
def sync_state_path(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    path = tmp_path / "daily-sync-state.json"
    monkeypatch.setenv("DAILY_SYNC_STATE_PATH", str(path))
    from app.config import get_settings

    get_settings.cache_clear()
    return path


def _write_state(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload), encoding="utf-8")


def test_early_run_does_not_block_scheduled_slot(sync_state_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """Completion at 01:51 IST must not block the 08:00 IST scheduled run."""
    today = DailySyncService.today_ist()
    _write_state(
        sync_state_path,
        {
            "status": "completed",
            "completedAtIst": datetime(today.year, today.month, today.day, 1, 51, tzinfo=IST).isoformat(),
            "lastCompletedDateIst": today.isoformat(),
        },
    )
    monkeypatch.setattr(
        DailySyncService,
        "today_ist",
        staticmethod(lambda: today),
    )
    sync = DailySyncService()
    assert sync.already_ran_today_ist() is False
    ok, _ = sync.can_start(force=False)
    assert ok is True


def test_post_slot_run_blocks_same_day(sync_state_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    today = DailySyncService.today_ist()
    _write_state(
        sync_state_path,
        {
            "status": "completed",
            "completedAtIst": datetime(today.year, today.month, today.day, 9, 0, tzinfo=IST).isoformat(),
            "lastCompletedDateIst": today.isoformat(),
        },
    )
    monkeypatch.setattr(
        DailySyncService,
        "today_ist",
        staticmethod(lambda: today),
    )
    sync = DailySyncService()
    assert sync.already_ran_today_ist() is True
    ok, reason = sync.can_start(force=False)
    assert ok is False
    assert "already completed" in reason.lower()
