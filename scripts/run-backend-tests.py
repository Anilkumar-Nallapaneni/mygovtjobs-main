#!/usr/bin/env python3
"""Run backend unit tests. Usage: node scripts/run-python.mjs scripts/run-backend-tests.py"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1] / "backend"

raise SystemExit(
    subprocess.call([sys.executable, "-m", "pytest", "tests", "-q"], cwd=BACKEND)
)
