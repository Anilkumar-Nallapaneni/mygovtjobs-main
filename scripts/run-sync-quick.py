#!/usr/bin/env python3
"""Lightweight production refresh — RSS feeds + official archives (no full scrape)."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NPM = "npm.cmd" if sys.platform == "win32" else "npm"


def run_npm(script: str, *extra: str) -> int:
    cmd = [NPM, "run", script]
    if extra:
        cmd.extend(["--", *extra])
    suffix = f" -- {' '.join(extra)}" if extra else ""
    print(f"\n=== npm run {script}{suffix} ===", flush=True)
    return subprocess.run(cmd, cwd=ROOT, check=False).returncode


def main() -> int:
    feed_args = [a for a in sys.argv[1:] if a.startswith("--")]
    code = run_npm("fetch:official:feeds", *feed_args)
    code = code or run_npm("build:official-archives")
    if code != 0:
        print(f"sync:quick finished with exit code {code}", flush=True)
    else:
        print("sync:quick complete", flush=True)
    return code


if __name__ == "__main__":
    raise SystemExit(main())
