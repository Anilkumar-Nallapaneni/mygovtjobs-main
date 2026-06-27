#!/usr/bin/env python3
"""Re-validate and clean frontend/public/data/live-jobs.json in place."""
import json
import sys
from datetime import date, datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.parsers.notification_parser import NotificationParser  # noqa: E402
from app.services.validation_service import ValidationService  # noqa: E402

LIVE_JSON = ROOT / "frontend" / "public" / "data" / "live-jobs.json"


def main() -> None:
    if not LIVE_JSON.exists():
        print(f"Missing {LIVE_JSON}")
        sys.exit(1)

    payload = json.loads(LIVE_JSON.read_text(encoding="utf-8"))
    items = payload.get("items") or []
    parser = NotificationParser()
    validator = ValidationService()

    kept = []
    dropped = 0
    for row in items:
        source = (row.get("detail") or {}).get("source") or ""
        detail = row.get("detail") or {}
        raw = {
            "title": row.get("title"),
            "link": row.get("apply_url") or detail.get("notification_url"),
            "applyUrl": row.get("apply_url"),
            "pdfUrls": [row["pdf_url"]] if row.get("pdf_url") else detail.get("pdf_urls") or [],
            "dept": row.get("dept"),
            "state": row.get("state_codes"),
            "source": source,
            "sourceName": row.get("dept"),
            "published": detail.get("published"),
            "summary": detail.get("summary"),
            "vacancies": row.get("vacancies"),
            "last_date": row.get("last_date"),
            "category": row.get("category"),
        }
        normalized = parser.parse(raw, source_code=source or None)
        valid, reasons = validator.validate(normalized)
        if not valid:
            dropped += 1
            continue
        last = normalized.get("last_date")
        if last and str(last) < date.today().isoformat():
            row_status = "expired"
        else:
            row_status = row.get("status") or "live"
        new_vac = int(normalized.get("vacancies") or 0)
        kept.append(
            {
                **row,
                "title": normalized["title"],
                "dept": normalized["dept"],
                "vacancies": new_vac,
                "last_date": last or row.get("last_date"),
                "status": row_status,
            }
        )

    payload["generatedAt"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    payload["items"] = kept
    LIVE_JSON.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Cleaned live-jobs.json: kept={len(kept)} dropped={dropped} (was {len(items)})")


if __name__ == "__main__":
    main()
