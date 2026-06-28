"""Daily 8:00 AM IST sync lock — one official refresh per calendar day."""

from __future__ import annotations

import json
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

from app.config import get_settings

IST = ZoneInfo("Asia/Kolkata")


def _state_path() -> Path:
    settings = get_settings()
    raw = getattr(settings, "daily_sync_state_path", None) or str(
        Path(settings.live_jobs_json_path).resolve().parent / "daily-sync-state.json"
    )
    return Path(raw)


class DailySyncService:
    """Tracks the once-per-day India govt jobs ingest (IngestAgent pipeline)."""

    def __init__(self) -> None:
        self._path = _state_path()

    def _read(self) -> dict[str, Any]:
        if not self._path.exists():
            return {}
        try:
            return json.loads(self._path.read_text(encoding="utf-8"))
        except Exception:
            return {}

    def _write(self, payload: dict[str, Any]) -> None:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    @staticmethod
    def now_ist() -> datetime:
        return datetime.now(IST)

    @staticmethod
    def today_ist() -> date:
        return DailySyncService.now_ist().date()

    @staticmethod
    def next_run_ist(from_dt: datetime | None = None) -> datetime:
        base = from_dt or DailySyncService.now_ist()
        settings = get_settings()
        hour = int(getattr(settings, "daily_sync_hour_ist", 8) or 8)
        minute = int(getattr(settings, "daily_sync_minute_ist", 0) or 0)
        candidate = base.replace(hour=hour, minute=minute, second=0, microsecond=0)
        if base >= candidate:
            candidate += timedelta(days=1)
        return candidate

    def last_completed_date_ist(self) -> date | None:
        raw = self._read().get("lastCompletedDateIst")
        if not raw:
            return None
        try:
            return date.fromisoformat(str(raw))
        except ValueError:
            return None

    def _scheduled_slot_today_ist(self, *, on_date: date | None = None) -> datetime:
        """Today's configured run time in IST (e.g. 08:00)."""
        settings = get_settings()
        hour = int(getattr(settings, "daily_sync_hour_ist", 8) or 8)
        minute = int(getattr(settings, "daily_sync_minute_ist", 0) or 0)
        day = on_date or self.today_ist()
        return datetime(day.year, day.month, day.day, hour, minute, tzinfo=IST)

    def _completed_at_ist(self) -> datetime | None:
        raw = self._read().get("completedAtIst") or self._read().get("completedAt")
        if not raw:
            return None
        try:
            dt = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
            if dt.tzinfo is None:
                return dt.replace(tzinfo=IST)
            return dt.astimezone(IST)
        except ValueError:
            return None

    def already_ran_today_ist(self) -> bool:
        """True only after today's scheduled slot (e.g. 8:00 AM IST) has completed.

        Early manual runs before the slot do not block the scheduled daily run.
        """
        completed_dt = self._completed_at_ist()
        if completed_dt is not None:
            if completed_dt.date() < self.today_ist():
                return False
            if completed_dt.date() > self.today_ist():
                return True
            return completed_dt >= self._scheduled_slot_today_ist()
        # Legacy state files without timestamps — fall back to date-only.
        completed = self.last_completed_date_ist()
        return completed is not None and completed >= self.today_ist()

    def is_running(self) -> bool:
        state = self._read()
        if state.get("status") != "running":
            return False
        started = state.get("startedAt")
        if not started:
            return False
        try:
            started_dt = datetime.fromisoformat(str(started).replace("Z", "+00:00"))
            if started_dt.tzinfo is None:
                started_dt = started_dt.replace(tzinfo=timezone.utc)
            age = datetime.now(timezone.utc) - started_dt.astimezone(timezone.utc)
            return age < timedelta(hours=4)
        except Exception:
            return False

    def can_start(self, *, force: bool = False) -> tuple[bool, str]:
        if force:
            # Clear stale lock from a killed terminal so export state is not stuck on "running".
            if self.is_running():
                self._write({**self._read(), "status": "failed", "error": "superseded by --force"})
            return True, "forced"
        if self.is_running():
            return False, "Daily sync is already in progress."
        if self.already_ran_today_ist():
            nxt = self.next_run_ist()
            return False, f"Daily sync already completed for today (IST). Next run: {nxt.isoformat()}."
        return True, "ok"

    def mark_started(self) -> dict[str, Any]:
        """Mark sync in progress while keeping last-run stats for admin/UI until completion."""
        now = datetime.now(timezone.utc)
        prior = self._read()
        payload = {
            **prior,
            "status": "running",
            "startedAt": now.isoformat(),
            "startedAtIst": self.now_ist().isoformat(),
            "dateIst": self.today_ist().isoformat(),
        }
        for stale in ("failedAt", "failedAtIst", "error"):
            payload.pop(stale, None)
        self._write(payload)
        return payload

    def mark_completed(self, *, job_count: int = 0, sources_scraped: int = 0, notes: str = "") -> dict[str, Any]:
        now = datetime.now(timezone.utc)
        nxt = self.next_run_ist()
        payload = {
            "status": "completed",
            "completedAt": now.isoformat(),
            "completedAtIst": self.now_ist().isoformat(),
            "lastCompletedDateIst": self.today_ist().isoformat(),
            "nextRunAtIst": nxt.isoformat(),
            "jobCount": int(job_count),
            "sourcesScraped": int(sources_scraped),
            "notes": notes or "IngestAgent: official India govt portals + RSS",
        }
        self._write(payload)
        return payload

    def mark_failed(self, error: str) -> dict[str, Any]:
        now = datetime.now(timezone.utc)
        payload = {
            **self._read(),
            "status": "failed",
            "failedAt": now.isoformat(),
            "failedAtIst": self.now_ist().isoformat(),
            "error": str(error)[:2000],
            "nextRunAtIst": self.next_run_ist().isoformat(),
        }
        self._write(payload)
        return payload

    def public_status(self) -> dict[str, Any]:
        state = self._read()
        ran_today = self.already_ran_today_ist()
        nxt = self.next_run_ist()
        settings = get_settings()
        return {
            "timezone": "Asia/Kolkata",
            "scheduledHourIst": int(getattr(settings, "daily_sync_hour_ist", 8) or 8),
            "scheduledMinuteIst": int(getattr(settings, "daily_sync_minute_ist", 0) or 0),
            "enforceOncePerDay": bool(getattr(settings, "daily_sync_enforce_once", True)),
            "ranTodayIst": ran_today,
            "canRunNow": not ran_today and not self.is_running(),
            "isRunning": self.is_running(),
            "status": state.get("status") or ("completed" if ran_today else "idle"),
            "lastCompletedAt": state.get("completedAt"),
            "lastCompletedAtIst": state.get("completedAtIst"),
            "lastCompletedDateIst": state.get("lastCompletedDateIst"),
            "nextRunAtIst": state.get("nextRunAtIst") or nxt.isoformat(),
            "jobCount": state.get("jobCount"),
            "sourcesScraped": state.get("sourcesScraped"),
            "error": state.get("error"),
        }

    def daily_sync_json_block(self, *, job_count: int, sources_scraped: int) -> dict[str, Any]:
        st = self.mark_completed(job_count=job_count, sources_scraped=sources_scraped)
        return {
            "completedAt": st.get("completedAt"),
            "completedAtIst": st.get("completedAtIst"),
            "dateIst": st.get("lastCompletedDateIst"),
            "nextRunAtIst": st.get("nextRunAtIst"),
            "jobCount": job_count,
            "sourcesScraped": sources_scraped,
            "scheduledLabel": "8:00 AM IST daily",
        }
