"""AI Employees orchestrator — state-wise QA → publish → watchdog.

This is the full automated workforce:
  1. QaReviewAgent (one pass; outcomes tagged by state bucket)
  2. Promote passing drafts via promote-publish-gate
  3. Optional WatchdogAgent on live catalog
"""

from __future__ import annotations

import json
import logging
import subprocess
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.agents.qa_review_agent import QaReviewAgent
from app.agents.watchdog_agent import WatchdogAgent
from app.utils.state_resolve import STATE_BUCKETS

logger = logging.getLogger(__name__)

DEFAULT_BUCKETS = tuple(STATE_BUCKETS.keys())


def _repo_root() -> Path:
    here = Path(__file__).resolve()
    for base in (here.parents[2], here.parents[3]):
        if (base / "package.json").is_file():
            return base
    return here.parents[3]


async def run_ai_employees(
    *,
    apply: bool = False,
    publish: bool = False,
    watchdog: bool = False,
    export: bool = False,
    buckets: list[str] | None = None,
    limit: int = 0,
    use_llm: bool | None = None,
) -> dict[str, Any]:
    selected = set(buckets or list(DEFAULT_BUCKETS))
    report: dict[str, Any] = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "apply": apply,
        "publish": publish,
        "watchdog": watchdog,
        "buckets": {},
        "totals": {
            "scanned": 0,
            "approved": 0,
            "needs_fix": 0,
            "rejected": 0,
            "rowsUpdated": 0,
        },
    }

    agent = QaReviewAgent(use_llm=use_llm)
    # Single pass over catalog; each decision carries its state bucket tag.
    stats = await agent.run(
        limit=0,
        apply=apply,
        bucket="all",
        include_live=True,
        include_draft=True,
    )

    by_bucket: dict[str, dict[str, int]] = defaultdict(
        lambda: {"scanned": 0, "approved": 0, "needs_fix": 0, "rejected": 0}
    )
    for key, decision_name in (
        ("approved", "approved"),
        ("needs_fix", "needs_fix"),
        ("rejected", "rejected"),
        ("skipped", "skipped"),
    ):
        for entry in stats.get(key) or []:
            b = str(entry.get("bucket") or "all-india")
            if selected and b not in selected and "all" not in selected:
                # Still count in totals if we scanned everything; filter report buckets.
                pass
            by_bucket[b]["scanned"] += 1
            if decision_name in by_bucket[b]:
                by_bucket[b][decision_name] += 1

    for name in DEFAULT_BUCKETS:
        if name in selected:
            report["buckets"][name] = by_bucket.get(
                name, {"scanned": 0, "approved": 0, "needs_fix": 0, "rejected": 0}
            )

    report["totals"]["scanned"] = stats.get("scanned", 0)
    report["totals"]["approved"] = len(stats.get("approved") or [])
    report["totals"]["needs_fix"] = len(stats.get("needs_fix") or [])
    report["totals"]["rejected"] = len(stats.get("rejected") or [])
    report["totals"]["rowsUpdated"] = stats.get("rowsUpdated", 0)
    report["qaReportPath"] = stats.get("reportPath")

    if publish:
        cmd = [sys.executable, str(_repo_root() / "scripts" / "promote-publish-gate.py")]
        if apply:
            cmd.append("--apply")
        if export and apply:
            cmd.append("--export")
        if limit > 0:
            cmd.extend(["--limit", str(limit)])
        logger.info("Running publisher: %s", " ".join(cmd))
        proc = subprocess.run(cmd, cwd=_repo_root(), capture_output=True, text=True)
        report["publishResult"] = {
            "returncode": proc.returncode,
            "stdout": (proc.stdout or "")[-2000:],
            "stderr": (proc.stderr or "")[-1000:],
        }

    if watchdog:
        wd = await WatchdogAgent().run(apply=apply, export=export and apply, limit=limit)
        report["watchdogResult"] = {
            "scanned": wd.get("scanned", 0),
            "ok": wd.get("ok", 0),
            "demoted": len(wd.get("demoted") or []),
            "rowsUpdated": wd.get("rowsUpdated", 0),
        }

    out = _repo_root() / "scripts" / "ai-employees-report.json"
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
    report["reportPath"] = str(out)
    return report
