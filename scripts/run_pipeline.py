#!/usr/bin/env python3
"""Canonical pipeline entry point.

This orchestrator intentionally reuses the repository's proven scripts. Operators
should call only this file; legacy scripts remain implementation details.
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

@dataclass(frozen=True)
class Step:
    name: str
    command: list[str]
    required: bool = True


def node_script(path: str, *args: str) -> list[str]:
    return ["node", "scripts/run-python.mjs", path, *args]


def plan(mode: str) -> list[Step]:
    if mode == "daily":
        return [
            Step("production sync", node_script("scripts/run-sync-production.py")),
            Step("strict snapshot verification", ["node", "scripts/verify-live-jobs-snapshot.mjs", "--strict"]),
            Step("vacancy totals", ["node", "scripts/check-vacancy-totals.mjs"]),
            Step("alert delivery", node_script("scripts/run-alert-delivery.py"), required=False),
        ]
    if mode == "weekly":
        return [
            Step("PDF enrichment", node_script("scripts/run-pdf-reader-agent.py", "--limit", "400", "--concurrency", "4")),
            Step("job detail enrichment", node_script("scripts/run-job-detail-agent.py", "--limit", "400", "--concurrency", "2")),
            Step("official source audit", ["npx", "tsx", "scripts/audit-official-sites.mjs", "--strict"]),
            Step("detail coverage", ["node", "scripts/audit-live-detail-coverage.mjs"]),
        ]
    if mode == "verify":
        return [
            Step("environment", ["node", "scripts/check-env-alignment.mjs"]),
            Step("database", node_script("scripts/test-backend-db.py")),
            Step("Supabase connection", ["node", "scripts/test-supabase-connection.mjs"]),
            Step("job quality", ["node", "scripts/audit-job-quality.mjs", "--strict"]),
            Step("snapshot", ["node", "scripts/verify-live-jobs-snapshot.mjs", "--strict"]),
        ]
    raise ValueError(f"Unsupported mode: {mode}")


def run_step(step: Step, env: dict[str, str]) -> dict[str, object]:
    started = time.monotonic()
    print(f"\n=== {step.name} ===", flush=True)
    result = subprocess.run(step.command, cwd=ROOT, env=env, text=True)
    duration = round(time.monotonic() - started, 2)
    return {"name": step.name, "required": step.required, "returncode": result.returncode, "duration_seconds": duration}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=("daily", "weekly", "verify"), required=True)
    parser.add_argument("--continue-on-error", action="store_true")
    args = parser.parse_args()

    env = os.environ.copy()
    env.setdefault("PIPELINE_MODE", args.mode)
    env.setdefault("SYNC_TRIGGER_TYPE", "canonical_pipeline")

    summary: dict[str, object] = {"mode": args.mode, "started_at_epoch": int(time.time()), "steps": []}
    exit_code = 0
    for step in plan(args.mode):
        item = run_step(step, env)
        summary["steps"].append(item)
        if item["returncode"] != 0 and step.required:
            exit_code = int(item["returncode"])
            if not args.continue_on_error:
                break

    summary["finished_at_epoch"] = int(time.time())
    summary["status"] = "succeeded" if exit_code == 0 else "failed"
    out = ROOT / "docs" / "audits" / f"pipeline-{args.mode}-latest.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(f"\nPipeline summary: {out}")
    return exit_code

if __name__ == "__main__":
    raise SystemExit(main())
