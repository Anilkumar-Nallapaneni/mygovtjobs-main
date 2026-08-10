#!/usr/bin/env python3
"""Re-validate and clean frontend/public/data/live-jobs.json in place.

Drops rows that fail the same gates as verify-live-jobs-snapshot.mjs --strict
(published_to_site, RECRUITMENT, verified, ISO last_date, status=live only,
no HTML titles, publish_gate / can_publish_job).
"""
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.services.live_snapshot_clean import filter_live_snapshot_items  # noqa: E402
from app.services.publish_gate import india_today  # noqa: E402

LIVE_JSON = ROOT / "frontend" / "public" / "data" / "live-jobs.json"


def main() -> None:
    if not LIVE_JSON.exists():
        print(f"Missing {LIVE_JSON}")
        sys.exit(1)

    payload = json.loads(LIVE_JSON.read_text(encoding="utf-8"))
    items = payload.get("items") or []
    if not isinstance(items, list):
        print("live-jobs.json items must be a list")
        sys.exit(1)

    kept, dropped = filter_live_snapshot_items(items, today=india_today())

    payload["generatedAt"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    payload["items"] = kept
    LIVE_JSON.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Cleaned live-jobs.json: kept={len(kept)} dropped={dropped} (was {len(items)})")


if __name__ == "__main__":
    main()
