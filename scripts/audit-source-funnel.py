"""Export priority-source publication yield and rejection reasons."""
from __future__ import annotations

import asyncio
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.database.session import SessionLocal
from app.services.source_funnel_service import SourceFunnelService
from app.utils.repo_paths import resolve_repo_path


async def main() -> None:
    async with SessionLocal() as session:
        report = await SourceFunnelService().report(session)
    report["generated_at"] = datetime.now(timezone.utc).isoformat()
    target = ROOT / "docs" / "audits" / "source-funnel-latest.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(report, indent=2, default=str), encoding="utf-8")
    totals = report["totals"]
    print(
        f"priority sources={report['priority_source_count']} "
        f"database jobs={totals['stored']} published={totals['published']} "
        f"yield={totals['yield_percent']}%"
    )
    for source in report["sources"]:
        print(
            f"{source['code']:<18} stored={source['stored']:<5} "
            f"published={source['published']:<4} yield={source['yield_percent']:>6}% "
            f"reasons={source['rejection_reasons']}"
        )
    print(f"Wrote {target}")


if __name__ == "__main__":
    asyncio.run(main())
