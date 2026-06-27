#!/usr/bin/env python3
"""Remove third-party aggregator jobs/URLs and export official-only live-jobs.json."""
import asyncio
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from sqlalchemy import select

from app.config import get_settings
from app.database.session import SessionLocal
from app.models.job import Job
from app.utils.official_hosts import is_blocked_aggregator_host, is_official_recruitment_host, pick_best_official_url
from app.utils.sanitize_detail import sanitize_job_detail

LIVE_JSON = ROOT / "frontend" / "public" / "data" / "live-jobs.json"
_BLOCKED_SUBSTR = (
    "free" "job" "alert",
    "sarkariresult",
    "sarkarijob",
    "sarkarinaukri",
    "governmentjob",
    "indgovtjobs",
    "rojgarresult",
    "jobriya",
    "fresherslive",
)
_LEGACY_DISCOVERY_SOURCES = frozenset(
    {"discovery-listings", "".join(("discovery-", "free", "job", "alert"))}
)
_NOISE_TITLE_PATTERNS = (
    re.compile(r"^\s*(?:home|app|page\s*\d+|read\s*more)\s*$", re.I),
    re.compile(r"\bexternal\s+link\b", re.I),
    re.compile(r"\bwcag\b", re.I),
    re.compile(r"\bcopyright\b", re.I),
    re.compile(r"\btoll\s*free\b", re.I),
    re.compile(r"\bwaitlist\b", re.I),
    re.compile(r"\bmarks\s+secured\b", re.I),
    re.compile(r"\bresult(?:s)?\b", re.I),
    re.compile(r"\bstudy\s+material\b", re.I),
    re.compile(r"\bwithdrawn\s+products?\b", re.I),
)
_NOISE_DEPT_PATTERNS = (
    re.compile(r"^\s*www\.", re.I),
    re.compile(r"\.gov\.in\s*$", re.I),
)


def _looks_like_noise_title(value: str | None) -> bool:
    text = str(value or "").strip()
    if not text:
        return True
    if len(text) <= 4:
        return True
    if re.fullmatch(r"page\s*\d+", text, flags=re.I):
        return True
    return any(pattern.search(text) for pattern in _NOISE_TITLE_PATTERNS)


def _looks_like_noise_dept(value: str | None) -> bool:
    text = str(value or "").strip()
    if not text:
        return False
    return any(pattern.search(text) for pattern in _NOISE_DEPT_PATTERNS)


def _url_blocked(url: str | None) -> bool:
    if not url:
        return False
    low = url.lower()
    return any(b in low for b in _BLOCKED_SUBSTR) or is_blocked_aggregator_host(url)


def _text_blocked(*values: str | None) -> bool:
    return any(isinstance(v, str) and any(b in v.lower() for b in _BLOCKED_SUBSTR) for v in values)


def _detail_blocked(detail: dict) -> bool:
    for key in ("discovery_ref", "discovered_via", "notification_url", "source_url"):
        if _url_blocked(detail.get(key) if isinstance(detail.get(key), str) else None):
            return True
    for key in ("pdf_urls", "pdfUrls"):
        vals = detail.get(key) or []
        if isinstance(vals, list) and any(_url_blocked(v) for v in vals if isinstance(v, str)):
            return True
    src = str(detail.get("source") or "")
    if src in _LEGACY_DISCOVERY_SOURCES:
        return True
    return False


def _should_delete_job(job: Job) -> bool:
    if _looks_like_noise_title(job.title):
        return True
    if _looks_like_noise_dept(job.dept) and _looks_like_noise_title(job.title):
        return True
    if _text_blocked(job.title, job.dept):
        return True
    detail = dict(job.detail or {})
    if _detail_blocked(detail):
        return True
    return _url_blocked(job.apply_url)


async def scrub_db() -> tuple[int, int, int]:
    deleted = fixed = expired = 0
    async with SessionLocal() as session:
        rows = (await session.execute(select(Job))).scalars().all()
        to_delete: list[Job] = []
        for job in rows:
            if _should_delete_job(job):
                to_delete.append(job)
                continue

            detail = sanitize_job_detail(dict(job.detail or {}))
            detail.pop("discovery_ref", None)
            detail.pop("discovered_via", None)

            apply = job.apply_url
            changed = detail != (job.detail or {})

            if _url_blocked(apply) or (apply and not is_official_recruitment_host(apply)):
                pdfs = detail.get("pdf_urls") or detail.get("pdfUrls") or []
                official = pick_best_official_url([p for p in pdfs if isinstance(p, str)])
                if official:
                    job.apply_url = official
                    fixed += 1
                    changed = True
                else:
                    to_delete.append(job)
                    continue

            if changed:
                job.detail = detail

        for job in to_delete:
            await session.delete(job)
            deleted += 1

        await session.commit()
    return deleted, fixed, expired


def scrub_live_json() -> int:
    if not LIVE_JSON.exists():
        return 0
    payload = json.loads(LIVE_JSON.read_text(encoding="utf-8"))
    items = payload.get("items") or []
    kept = []
    dropped = 0
    for row in items:
        if _looks_like_noise_title(row.get("title")):
            dropped += 1
            continue
        if _looks_like_noise_dept(row.get("dept")) and _looks_like_noise_title(row.get("title")):
            dropped += 1
            continue
        if _text_blocked(row.get("title"), row.get("dept")):
            dropped += 1
            continue
        apply = row.get("apply_url")
        detail = sanitize_job_detail(row.get("detail") or {})
        if _detail_blocked(detail):
            dropped += 1
            continue
        if _url_blocked(apply):
            pdfs = detail.get("pdf_urls") or detail.get("pdfUrls") or []
            official = pick_best_official_url([p for p in pdfs if isinstance(p, str)])
            if official:
                row["apply_url"] = official
            else:
                dropped += 1
                continue
        row["detail"] = detail
        kept.append(row)
    payload["items"] = kept
    LIVE_JSON.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return dropped


async def export_json() -> int:
    from app.services.job_persist_service import JobPersistService

    async with SessionLocal() as session:
        return await JobPersistService().export_live_jobs_json(session)


async def main() -> None:
    deleted, fixed, _expired = await scrub_db()
    dropped = scrub_live_json()
    exported = await export_json()
    print(f"DB: deleted_aggregator={deleted} fixed_apply={fixed}")
    print(f"live-jobs.json: dropped={dropped}")
    print(f"Re-exported {exported} jobs -> {get_settings().live_jobs_json_path}")


if __name__ == "__main__":
    asyncio.run(main())
