#!/usr/bin/env python3
"""Re-read every official job PDF and set correct posted + last dates.

From repo root:
  npm run backfill:dates              # first 100 jobs with PDFs
  npm run backfill:dates:all          # all jobs with PDFs
  npm run backfill:dates -- --duplicates-only --limit 50
  npm run backfill:dates -- --status draft --missing-last-date --quality-only --require-url --limit 750 --no-export
"""
import argparse
import asyncio
import re
import sys
from datetime import date, datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


def _log(message: str) -> None:
    try:
        print(message, flush=True)
    except UnicodeEncodeError:
        print(message.encode("ascii", "replace").decode("ascii"), flush=True)


from sqlalchemy import select

from app.database.session import SessionLocal
from app.models.job import Job
from app.parsers.notification_parser import NotificationParser
from app.parsers.pdf_dates import to_published_datetime
from app.parsers.pdf_enrich import merge_pdf_fields
from app.services.job_child_service import sync_job_children
from app.services.job_persist_service import JobPersistService, _parse_date
from app.services.pdf_candidate import validate_extracted_dates
from app.services.noise_filter import (
    is_junk_job_title,
    is_result_archive_listing,
    sanitize_json_for_postgres,
)
from app.services.publish_gate import india_today
from app.scrapers.pdf_discover import ensure_pdf_urls

COMMIT_EVERY = 15


def _has_pdf(job: Job) -> bool:
    if job.primary_pdf_url and ".pdf" in str(job.primary_pdf_url).lower():
        return True
    detail = job.detail or {}
    urls = list(detail.get("pdf_urls") or [])
    if job.apply_url and ".pdf" in str(job.apply_url).lower():
        return True
    return any(".pdf" in str(u).lower() for u in urls) or bool(detail.get("pdf_url"))


def _has_apply_or_pdf(job: Job) -> bool:
    if job.apply_url:
        return True
    return _has_pdf(job)


_SKIP_NON_APPLY_TITLE = re.compile(
    r"list of candidates|provisionally (?:qualified|eligible|in-?eligible)|"
    r"short[\s-]?listed|\bresult\b|\badmit card\b|answer key|score ?card|merit list|"
    r"examination program|postponement|postpone|symposium|bids are invited|"
    r"call for nominations|certificate course|hackathon|announcement of opportunity|"
    r"research areas|awards for the year|successful launch|press note|"
    r"offline admission|ineligible candidates|eligible candidates for the post",
    re.I,
)
_RECRUIT_HINT = re.compile(
    r"recruit|vacanc|walk[\s\-]?in|apprentice|engagement|notification|"
    r"advt\.?\s*no|bharti|apply\s+online|\d+\s+posts?",
    re.I,
)
_ONLINE_APPLY_HINT = re.compile(
    r"apply\s+online|last\s*date|closing\s*date|"
    r"extension of (?:online\s+)?(?:application|registration|last)|"
    r"from\s+\d{1,2}.+\s+to\s+\d",
    re.I,
)
_WALKIN_HINT = re.compile(r"walk[\s\-]?in", re.I)
_SKIP_DOC_TYPES = {
    "RESULT",
    "ADMIT_CARD",
    "FORM",
    "EXAM_NOTICE",
    "GENERAL_NOTICE",
    "RECRUITMENT_RULES",
}


def _is_quality_recruitment(job: Job) -> bool:
    """Skip portal chrome / tenders / results; keep real-ish recruitment titles."""
    title = job.title or ""
    url = job.apply_url or getattr(job, "source_url", None) or ""
    doc = (job.document_type or "").strip().upper()
    if doc in _SKIP_DOC_TYPES:
        return False
    if is_junk_job_title(title, url):
        return False
    if is_result_archive_listing(title, url):
        return False
    if _SKIP_NON_APPLY_TITLE.search(title):
        return False
    if not _RECRUIT_HINT.search(title):
        return False
    return True


def _duplicate_dates(job: Job) -> bool:
    if not job.last_date or not job.published_at:
        return False
    try:
        return job.published_at.date() == job.last_date
    except Exception:
        return False


def _job_pdf_urls(job: Job) -> list[str]:
    detail = dict(job.detail or {})
    pdf_urls = list(detail.get("pdf_urls") or [])
    if detail.get("pdf_url"):
        pdf_urls.insert(0, detail["pdf_url"])
    if job.primary_pdf_url:
        pdf_urls.insert(0, job.primary_pdf_url)
    if job.apply_url and ".pdf" in str(job.apply_url).lower():
        pdf_urls.insert(0, job.apply_url)
    return pdf_urls


async def backfill_one(session, job: Job, parser: NotificationParser) -> dict:
    """Return {changed, posted, last, pdf_pub, pdf_last, note}."""
    detail = dict(job.detail or {})
    pdf_urls = await ensure_pdf_urls(
        _job_pdf_urls(job),
        job.apply_url if ".pdf" not in str(job.apply_url or "").lower() else None,
    )
    if not pdf_urls:
        return {"changed": False, "note": "no-pdf"}

    pdf_fields = await merge_pdf_fields(pdf_urls)
    norm = parser.parse(
        {
            "title": job.title,
            "link": job.apply_url,
            "pdfUrls": pdf_urls,
            "source": detail.get("source"),
        },
        pdf_fields=pdf_fields,
    )
    nd = norm.get("detail") or {}

    pdf_pub = pdf_fields.get("published_date")
    pdf_last = pdf_fields.get("last_date")
    norm_pub = norm.get("published_at")
    norm_last = norm.get("last_date")

    new_last = _parse_date(pdf_last or norm_last)
    pub_src = pdf_pub or (norm_pub.isoformat() if isinstance(norm_pub, datetime) else norm_pub)
    new_pub = norm_pub if isinstance(norm_pub, datetime) else to_published_datetime(pub_src)

    today = india_today()
    last_d = new_last.date() if isinstance(new_last, datetime) else new_last
    pub_d = new_pub.date() if isinstance(new_pub, datetime) else None
    date_errs = validate_extracted_dates(
        pub_d,
        last_d if isinstance(last_d, date) else None,
        today=today,
        summary=str(pdf_fields.get("summary") or ""),
    )
    err_blob = " ".join(date_errs)
    if new_pub and ("implausibly old" in err_blob or "in the future" in err_blob):
        new_pub = None
        pub_d = None
    if last_d and (
        "implausibly distant" in err_blob
        or "before publication" in err_blob
        or last_d < today
    ):
        new_last = None
        last_d = None

    changed = False
    dates_changed = False

    if new_last and new_last != job.last_date:
        job.last_date = new_last
        changed = True
        dates_changed = True

    if new_pub:
        pub_day = new_pub.date()
        if not job.last_date or pub_day != job.last_date:
            if not job.published_at or job.published_at.date() != pub_day:
                job.published_at = (
                    new_pub if new_pub.tzinfo else new_pub.replace(tzinfo=timezone.utc)
                )
                changed = True
                dates_changed = True
            if nd.get("published"):
                detail["published"] = nd["published"]

    if pdf_fields.get("content_sections"):
        detail["content_sections"] = pdf_fields["content_sections"]
        changed = True
    if pdf_fields.get("summary"):
        detail["summary"] = str(pdf_fields["summary"])[:12_000]
        changed = True

    if changed:
        job.detail = sanitize_json_for_postgres(detail)
    if detail.get("content_sections"):
        if await sync_job_children(session, job):
            changed = True

    note = "ok"
    if not pdf_pub and not pdf_last and not new_pub and not new_last:
        note = "pdf-no-dates"
    elif _duplicate_dates(job):
        note = "still-duplicate"
    elif dates_changed:
        note = "dates-fixed"

    return {
        "changed": changed,
        "dates_changed": dates_changed,
        "posted": job.published_at.date().isoformat() if job.published_at else None,
        "last": job.last_date.isoformat() if job.last_date else None,
        "pdf_pub": pdf_pub,
        "pdf_last": pdf_last,
        "note": note,
    }


async def main() -> None:
    argp = argparse.ArgumentParser()
    argp.add_argument("--limit", type=int, default=100, help="Max jobs (0 = all targets)")
    argp.add_argument(
        "--duplicates-only",
        action="store_true",
        help="Only jobs where published_at date equals last_date",
    )
    argp.add_argument(
        "--status",
        type=str,
        default="",
        help="Comma-separated statuses to include (e.g. draft). Empty = all.",
    )
    argp.add_argument(
        "--missing-last-date",
        action="store_true",
        help="Only jobs with last_date IS NULL",
    )
    argp.add_argument(
        "--require-url",
        action="store_true",
        help="Require apply_url or a PDF URL (still need PDF for date extract)",
    )
    argp.add_argument(
        "--quality-only",
        action="store_true",
        help="Skip junk/tender/portal-nav titles",
    )
    argp.add_argument(
        "--allow-discover",
        action="store_true",
        help="Include jobs without known PDF (discover via apply page). Default: PDF only.",
    )
    argp.add_argument("--export", action="store_true", default=True)
    argp.add_argument("--no-export", dest="export", action="store_false")
    args = argp.parse_args()

    statuses = {s.strip().lower() for s in args.status.split(",") if s.strip()}

    parser = NotificationParser()
    updated = 0
    date_fixed = 0
    still_dup = 0
    no_dates = 0
    no_pdf = 0
    scanned = 0

    async with SessionLocal() as session:
        rows = (
            await session.execute(select(Job).order_by(Job.published_at.desc().nullslast()))
        ).scalars().all()

        if args.duplicates_only:
            targets = [j for j in rows if _duplicate_dates(j) and _has_pdf(j)]
        else:
            targets = list(rows)
            if statuses:
                targets = [j for j in targets if (j.status or "").lower() in statuses]
            if args.missing_last_date:
                targets = [j for j in targets if j.last_date is None]
            if args.require_url:
                targets = [j for j in targets if _has_apply_or_pdf(j)]
            if args.quality_only:
                targets = [j for j in targets if _is_quality_recruitment(j)]
            # Prefer known PDFs; optional discover for apply-page-only rows
            if args.allow_discover:
                with_pdf = [j for j in targets if _has_pdf(j)]
                without = [j for j in targets if not _has_pdf(j)]
                targets = with_pdf + without
            else:
                targets = [j for j in targets if _has_pdf(j)]

        targets.sort(
            key=lambda j: (
                0 if _ONLINE_APPLY_HINT.search(j.title or "") else 1,
                1 if _WALKIN_HINT.search(j.title or "") else 0,
                0 if (j.document_type or "").upper() == "RECRUITMENT" else 1,
            )
        )

        cap = args.limit if args.limit else len(targets)
        target_ids = [str(j.id) for j in targets[:cap]]
        total = len(target_ids)
        _log(
            f"PDF date backfill — targets: {len(targets)}, processing: {total}"
            f" status={sorted(statuses) or 'all'} missing_last={args.missing_last_date}"
            f" quality={args.quality_only}"
        )

        for job_id in target_ids:
            scanned += 1
            job = await session.get(Job, job_id)
            if not job:
                _log(f"[{scanned}/{total}] missing id={job_id}")
                continue
            title = (job.title or "")[:58]
            _log(f"[{scanned}/{total}] {title}")
            try:
                result = await backfill_one(session, job, parser)
                if result.get("note") == "no-pdf":
                    no_pdf += 1
                    _log("  · no PDF discovered")
                elif result.get("dates_changed"):
                    date_fixed += 1
                    _log(f"  ✓ posted {result['posted']} | last {result['last']}")
                elif result.get("note") == "still-duplicate":
                    still_dup += 1
                    _log(
                        f"  = still same ({result['posted']}) — pdf: "
                        f"pub={result['pdf_pub']} last={result['pdf_last']}"
                    )
                elif result.get("note") == "pdf-no-dates":
                    no_dates += 1
                    _log("  ? PDF read but no dates found")
                if result.get("changed"):
                    updated += 1
            except Exception as exc:
                await session.rollback()
                _log(f"  skip: {exc}")

            if scanned % COMMIT_EVERY == 0:
                try:
                    await session.commit()
                except Exception as exc:
                    await session.rollback()
                    _log(f"  commit failed: {exc}")
                _log(f"  — committed ({date_fixed} date fixes so far)")

        try:
            await session.commit()
        except Exception as exc:
            await session.rollback()
            _log(f"final commit failed: {exc}")

        if args.export:
            count = await JobPersistService().export_live_jobs_json(session)
            _log(f"Re-exported {count} jobs -> live-jobs.json")

    _log(
        f"Done: scanned={scanned} date_fixed={date_fixed} still_duplicate={still_dup} "
        f"pdf_no_dates={no_dates} no_pdf={no_pdf} rows_touched={updated}"
    )


if __name__ == "__main__":
    asyncio.run(main())
