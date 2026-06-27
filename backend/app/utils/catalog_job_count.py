"""Count catalog jobs using the frontend display pipeline (single source of truth)."""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[3]
_SCRIPT = _REPO_ROOT / "scripts" / "count-catalog-jobs.mjs"


def count_catalog_display_jobs(items: list[dict]) -> int:
    """Match useLiveJobs → processLiveJobPayload → filterDisplayJobs length."""
    if not items:
        return 0
    tmp_path: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            suffix=".json",
            delete=False,
        ) as handle:
            json.dump({"items": items}, handle, ensure_ascii=False)
            tmp_path = Path(handle.name)

        tsx_cli = _REPO_ROOT / "node_modules" / "tsx" / "dist" / "cli.mjs"
        if not tsx_cli.is_file():
            raise FileNotFoundError(
                f"tsx not installed ({tsx_cli}); run npm ci at repo root"
            )

        proc = subprocess.run(
            ["node", str(tsx_cli), str(_SCRIPT), str(tmp_path)],
            cwd=_REPO_ROOT,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=180,
            check=True,
        )
        return int((proc.stdout or "").strip() or "0")
    except Exception as exc:
        print(f"[catalog_job_count] pipeline count failed: {exc}", file=sys.stderr)
        raise
    finally:
        if tmp_path is not None:
            tmp_path.unlink(missing_ok=True)
