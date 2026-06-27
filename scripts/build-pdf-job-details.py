#!/usr/bin/env python3
"""Build per-job detail JSON from official PDFs for static detail pages.

DEPRECATED — prefer the unified agent pipeline (DB + Supabase Storage):
  npm run pdf:read:live && npm run job:details
  npm run weekly:enrich:ci

This script reads live-jobs.json only (no DB). Kept for offline/static fallback.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.config import get_settings  # noqa: E402
from app.parsers.pdf_parser import parse_pdf_url  # noqa: E402
from app.utils.job_details_storage import upload_job_detail_json  # noqa: E402

LIVE_JSON = ROOT / "frontend" / "public" / "data" / "live-jobs.json"
OUT_DIR = ROOT / "frontend" / "public" / "data" / "job-details"

PDF_PATH_RE = re.compile(
    r"\.pdf(\?|#|/|$)|/pdf/|/writereaddata/|/documents/|/attachments/|/uploads/|"
    r"notification.*\.pdf|advt.*\.pdf",
    re.I,
)
PDF_VIEWER_RE = re.compile(r"ViewPdf\.aspx|ViewFile\.aspx|viewpdf\.aspx|viewfile\.aspx|getfile\.aspx", re.I)
BLOCKED_HOST_RE = re.compile(
    r"(?:^|\.)(?:freejobalert|sarkariresult|sarkarijob|sarkarinaukri|governmentjob|"
    r"indgovtjobs|rojgarresult|jobriya|fresherslive|naukri|indeed|shine|timesjobs|"
    r"foundit|monster)\.",
    re.I,
)


def _looks_like_notification_document(url: str) -> bool:
    u = str(url or "").strip()
    if not u:
        return False
    if PDF_VIEWER_RE.search(u):
        return True
    if PDF_PATH_RE.search(u):
        return True
    if re.search(r"[?&](?:file|doc|document)=", u, re.I) and re.search(r"\.pdf", u, re.I):
        return True
    return False


def _is_blocked_aggregator_url(url: str) -> bool:
    try:
        from urllib.parse import urlparse

        host = (urlparse(str(url)).hostname or "").lower()
    except Exception:
        return False
    return bool(host and BLOCKED_HOST_RE.search(host))


def _push_url(candidates: list[str], value: object) -> None:
    if isinstance(value, str) and value.strip():
        candidates.append(value.strip())


def _push_url_list(candidates: list[str], value: object) -> None:
    if isinstance(value, list):
        for item in value:
            _push_url(candidates, item)


def _pdf_urls(job: dict) -> list[str]:
    """Collect every candidate PDF/document URL attached to a job row."""
    detail = job.get("detail") if isinstance(job.get("detail"), dict) else {}
    candidates: list[str] = []

    for key in ("pdf_url", "pdfUrl", "apply_url", "applyUrl"):
        _push_url(candidates, job.get(key))
    for key in ("pdf_url", "pdfUrl", "notification_url", "notificationUrl", "link"):
        _push_url(candidates, detail.get(key))

    for key in ("pdf_urls", "pdfUrls"):
        _push_url_list(candidates, job.get(key))
        _push_url_list(candidates, detail.get(key))

    for section in detail.get("content_sections") or []:
        if not isinstance(section, dict):
            continue
        for link in section.get("links") or []:
            if isinstance(link, dict):
                _push_url(candidates, link.get("url"))

    seen: set[str] = set()
    urls: list[str] = []
    for candidate in candidates:
        if candidate in seen:
            continue
        seen.add(candidate)
        if _is_blocked_aggregator_url(candidate):
            continue
        if _looks_like_notification_document(candidate):
            urls.append(candidate)
    return urls


def _copy_sections(fields: dict, *, pdf_url: str, pdf_index: int, total_pdfs: int) -> list[dict]:
    sections = fields.get("content_sections")
    if not isinstance(sections, list):
        return []

    copied: list[dict] = []
    for section in sections:
        if not isinstance(section, dict):
            continue
        out = dict(section)
        if total_pdfs > 1:
            heading = str(out.get("heading") or "Notification").strip()
            out["heading"] = f"PDF {pdf_index}: {heading}"
        out["source_pdf_url"] = pdf_url
        copied.append(out)
    return copied


def _join_summaries(parsed_pdfs: list[dict]) -> str:
    summaries: list[str] = []
    for fields in parsed_pdfs:
        summary = str(fields.get("summary") or "").strip()
        if summary:
            summaries.append(summary)
    return "\n\n".join(summaries)


async def enrich_job(job: dict) -> dict | None:
    urls = _pdf_urls(job)
    if not urls:
        return None

    parsed_pdfs: list[dict] = []
    content_sections: list[dict] = []
    for idx, url in enumerate(urls, 1):
        fields = await parse_pdf_url(url)
        if fields.get("content_sections") or fields.get("summary"):
            parsed_pdfs.append(fields)
            content_sections.extend(_copy_sections(fields, pdf_url=url, pdf_index=idx, total_pdfs=len(urls)))

    if not parsed_pdfs:
        return None

    primary_fields = parsed_pdfs[0]
    out = dict(job)
    detail = dict(out.get("detail") or {})
    summary = _join_summaries(parsed_pdfs)
    if summary:
        detail["summary"] = summary
    if content_sections:
        detail["content_sections"] = content_sections
    detail["pdf_url"] = urls[0]
    detail["pdf_urls"] = urls
    detail["pdfUrls"] = urls
    out["detail"] = detail
    out["pdf_url"] = out.get("pdf_url") or urls[0]

    if primary_fields.get("qualification") and not out.get("qualification"):
        out["qualification"] = primary_fields["qualification"]
    if primary_fields.get("salary") and not out.get("salary"):
        out["salary"] = primary_fields["salary"]
    if primary_fields.get("age_limit") and not out.get("age_limit"):
        out["age_limit"] = primary_fields["age_limit"]
    if primary_fields.get("vacancies") and not out.get("vacancies"):
        out["vacancies"] = primary_fields["vacancies"]
    return out


async def _process_one(
    i: int,
    total: int,
    job: dict,
    *,
    live_mtime: float,
    skip_existing: bool,
    upload_storage: bool,
) -> tuple[str, bool]:
    slug = job.get("slug") or job.get("id")
    if not slug:
        return "empty-slug", False
    path = OUT_DIR / f"{slug}.json"
    if skip_existing and path.is_file() and path.stat().st_mtime >= live_mtime:
        print(f"[{i}/{total}] skip {slug} (detail file up to date)", flush=True)
        return slug, False
    try:
        enriched = await enrich_job(job)
        if not enriched:
            print(f"[{i}/{total}] skip {slug} (no PDF parse)", flush=True)
            return slug, False
        path.write_text(json.dumps(enriched, ensure_ascii=False, indent=2), encoding="utf-8")
        if upload_storage:
            ok = upload_job_detail_json(str(slug), enriched)
            if not ok:
                print(f"[{i}/{total}] warn {slug}: storage upload failed", flush=True)
        detail = enriched.get("detail") or {}
        sections = len(detail.get("content_sections") or [])
        pdf_count = len(detail.get("pdf_urls") or [])
        print(f"[{i}/{total}] {slug}: {sections} sections from {pdf_count} PDFs", flush=True)
        return slug, True
    except Exception as exc:
        print(f"[{i}/{total}] fail {slug}: {exc}", flush=True)
        return slug, False


async def main() -> int:
    print(
        "DEPRECATED: use npm run pdf:read:live && npm run job:details "
        "(or npm run weekly:enrich:ci in CI).\n",
        flush=True,
    )
    parser = argparse.ArgumentParser(description="Build static PDF-enriched job detail files")
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Max jobs to process from start of live-jobs.json (newest first; 0 = all)",
    )
    parser.add_argument("--slug", type=str, default="", help="Process one slug only")
    parser.add_argument(
        "--skip-existing",
        action="store_true",
        help="Skip slugs whose detail JSON is newer than live-jobs.json",
    )
    parser.add_argument(
        "--concurrency",
        type=int,
        default=1,
        help="Parallel PDF fetches (4–6 recommended in CI)",
    )
    parser.add_argument(
        "--upload-storage",
        action="store_true",
        help="Upload each detail JSON to Supabase Storage (needs SUPABASE_URL + service role key)",
    )
    args = parser.parse_args()
    upload_storage = args.upload_storage or bool(get_settings().supabase_service_role_key)

    if not LIVE_JSON.is_file():
        print(f"Missing {LIVE_JSON}", flush=True)
        return 1

    items = json.loads(LIVE_JSON.read_text(encoding="utf-8")).get("items") or []
    if args.slug:
        items = [j for j in items if j.get("slug") == args.slug]
    if args.limit > 0:
        items = items[: args.limit]

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    live_mtime = LIVE_JSON.stat().st_mtime
    total = len(items)
    concurrency = max(1, args.concurrency)
    sem = asyncio.Semaphore(concurrency)

    async def run_indexed(i: int, job: dict) -> tuple[str, bool]:
        async with sem:
            return await _process_one(
                i,
                total,
                job,
                live_mtime=live_mtime,
                skip_existing=args.skip_existing,
                upload_storage=upload_storage,
            )

    results = await asyncio.gather(*(run_indexed(i, job) for i, job in enumerate(items, 1)))
    written = sum(1 for _, ok in results if ok)
    skipped = total - written

    print(
        f"\nDone. Wrote {written} detail files to {OUT_DIR} "
        f"(skipped/failed {skipped}, concurrency={concurrency}).",
        flush=True,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
