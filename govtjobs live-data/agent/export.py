"""Write live job data to JSON files (all India, state-wise, PDF index)."""

from __future__ import annotations

import json
import re
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def write_outputs(
    output_dir: Path,
    *,
    websites: list[dict[str, Any]],
    jobs: list[dict[str, Any]],
    run_log: dict[str, Any],
    state_names: dict[str, str],
) -> dict[str, Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    by_state_dir = output_dir / "by-state"
    by_state_dir.mkdir(exist_ok=True)

    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    live_jobs = {
        "generatedAt": now,
        "totalJobs": len(jobs),
        "totalPdfs": sum(len(j.get("pdfUrls") or []) for j in jobs),
        "items": jobs,
    }

    paths: dict[str, Path] = {}
    paths["websites"] = output_dir / "websites.json"
    paths["live_jobs"] = output_dir / "live-jobs.json"
    paths["all_pdfs"] = output_dir / "all-pdfs.json"
    paths["run_log"] = output_dir / "run-log.json"

    paths["websites"].write_text(
        json.dumps({"generatedAt": now, "count": len(websites), "websites": websites}, indent=2),
        encoding="utf-8",
    )
    paths["live_jobs"].write_text(json.dumps(live_jobs, indent=2), encoding="utf-8")
    paths["run_log"].write_text(json.dumps(run_log, indent=2), encoding="utf-8")

    pdf_index: list[dict[str, Any]] = []
    for job in jobs:
        for pdf in job.get("pdfUrls") or []:
            pdf_index.append(
                {
                    "pdfUrl": pdf,
                    "jobTitle": job.get("title"),
                    "jobLink": job.get("link"),
                    "source": job.get("source"),
                    "state": job.get("state"),
                    "stateName": job.get("stateName"),
                }
            )
    paths["all_pdfs"].write_text(
        json.dumps({"generatedAt": now, "count": len(pdf_index), "pdfs": pdf_index}, indent=2),
        encoding="utf-8",
    )

    grouped: dict[str, list[dict]] = defaultdict(list)
    for job in jobs:
        key = job.get("state") or "all"
        grouped[key].append(job)

    for state_code, items in grouped.items():
        name = state_names.get(state_code, state_code)
        fname = "all-india.json" if state_code == "all" else f"{state_code}.json"
        out = by_state_dir / fname
        out.write_text(
            json.dumps(
                {
                    "generatedAt": now,
                    "state": state_code,
                    "stateName": name,
                    "count": len(items),
                    "jobs": items,
                },
                indent=2,
            ),
            encoding="utf-8",
        )
        paths[f"state_{state_code}"] = out

    return paths
