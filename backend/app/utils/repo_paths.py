"""Resolve monorepo file paths in local dev (repo root) and Docker (/app)."""

from pathlib import Path


def resolve_repo_path(*parts: str) -> Path:
    """Return the first existing path under repo root or /app."""
    here = Path(__file__).resolve()
    for base in (here.parents[2], here.parents[3]):
        candidate = base.joinpath(*parts)
        if candidate.exists():
            return candidate
    return here.parents[2].joinpath(*parts)
