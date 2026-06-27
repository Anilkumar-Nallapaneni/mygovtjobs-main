"""Persist normalized ingest rows to Postgres and JSON snapshot for the UI."""

import json
import re
from datetime import date, datetime, timezone
from pathlib import Path

from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.job import Job
from app.scrapers.date_utils import parse_published
from app.services.dedupe_service import content_hash, title_fingerprint
from app.services.noise_filter import clean_job_title, sanitize_json_for_postgres, strip_postgres_control_chars
from app.utils.catalog_job_count import count_catalog_display_jobs
from app.utils.slim_detail import slim_detail_for_db
from app.utils.live_jobs_export import slim_job_for_json_export, slim_job_for_list_json_export

_slug_re = re.compile(r"[^a-z0-9]+")


def slugify(title: str, digest: str) -> str:
    base = _slug_re.sub("-", (title or "job").lower()).strip("-")[:80] or "job"
    return f"{base}-{digest[:8]}"


def _resolve_state_codes(normalized: dict) -> list[str]:
    """Nationwide listings use [] in DB; single-state PSC uses e.g. ['ap']."""
    explicit = normalized.get("state_codes")
    if explicit is not None:
        codes = [str(c).lower()[:8] for c in explicit if c and str(c).lower() not in ("all", "all india")]
        return codes
    state_raw = str(normalized.get("state") or "").strip().lower()
    if not state_raw or state_raw in ("all", "all india"):
        source = str((normalized.get("detail") or {}).get("source") or normalized.get("source") or "")
        if source.startswith("psc-"):
            code = source[4:8]
            if code and code not in ("all", "india"):
                return [code]
        return []
    return [state_raw[:8]]


def _parse_date(value) -> date | None:
    if not value:
        return None
    if isinstance(value, date):
        return value
    text = str(value).strip()
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%d.%m.%Y", "%d %b %Y", "%d %B %Y"):
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    return None


def _resolve_published_at(normalized: dict) -> datetime | None:
    """Parse a real publish timestamp from ingest; None when unknown."""
    pub = normalized.get("published_at")
    if pub is None:
        detail = normalized.get("detail") or {}
        pub = detail.get("published")
    return parse_published(pub)


def _upsert_published_at(normalized: dict) -> datetime:
    """Published timestamp stored on insert and conflict update."""
    return _resolve_published_at(normalized) or datetime.now(timezone.utc)


class JobPersistService:
    async def upsert_normalized(self, session: AsyncSession, normalized: dict, *, commit: bool = True) -> Job | None:
        title = clean_job_title(normalized.get("title"))
        if not title:
            return None

        apply_url = strip_postgres_control_chars(normalized.get("apply_url")) or None
        last_date = _parse_date(normalized.get("last_date"))
        digest = normalized.get("content_hash") or content_hash(
            title=title, apply_url=apply_url, last_date=str(last_date or "")
        )
        slug = normalized.get("slug") or slugify(title, digest)
        state_codes = _resolve_state_codes(normalized)

        today = date.today()
        if last_date and last_date < today:
            job_status = "expired"
        else:
            job_status = normalized.get("status") or "live"

        published_at = _upsert_published_at(normalized)

        detail_blob = dict(normalized.get("detail") or {})
        post_name = strip_postgres_control_chars(normalized.get("post_name")) or None
        if post_name:
            detail_blob["post_name"] = post_name

        row = {
            "slug": slug,
            "title": title,
            "dept": strip_postgres_control_chars(normalized.get("dept")) or None,
            "category": strip_postgres_control_chars(normalized.get("category")) or None,
            "state_codes": state_codes,
            "vacancies": int(normalized.get("vacancies") or 0),
            "qualification": strip_postgres_control_chars(normalized.get("qualification")) or None,
            "salary": strip_postgres_control_chars(normalized.get("salary")) or None,
            "age_limit": strip_postgres_control_chars(normalized.get("age_limit")) or None,
            "last_date": last_date,
            "apply_url": apply_url,
            "status": job_status,
            "published_at": published_at,
            "normalized_at": datetime.now(timezone.utc),
            "content_hash": digest,
            "title_fingerprint": title_fingerprint(title),
            "detail": sanitize_json_for_postgres(slim_detail_for_db(detail_blob, status=job_status)),
        }

        stmt = (
            insert(Job)
            .values(**row)
            .on_conflict_do_update(
                index_elements=[Job.content_hash],
                set_={
                    "title": row["title"],
                    "dept": row["dept"],
                    "category": row["category"],
                    "state_codes": row["state_codes"],
                    "vacancies": row["vacancies"],
                    "last_date": row["last_date"],
                    "apply_url": row["apply_url"],
                    "published_at": row["published_at"],
                    "normalized_at": row["normalized_at"],
                    "detail": row["detail"],
                    "status": row["status"],
                    "title_fingerprint": row["title_fingerprint"],
                },
            )
            .returning(Job)
        )
        result = await session.execute(stmt)
        if commit:
            await session.commit()
        return result.scalar_one_or_none()

    async def export_live_jobs_json(self, session: AsyncSession) -> int:
        from app.services.job_service import JobService

        service = JobService()
        items = []
        offset = 0
        page_size = 1000
        total = None
        while total is None or offset < total:
            page, total = await service.list_jobs(limit=page_size, offset=offset, session=session)
            if not page:
                break
            items.extend(page)
            offset += len(page)

        slim_items = [slim_job_for_json_export(item) for item in items]
        list_items = [slim_job_for_list_json_export(item) for item in items]
        catalog_count = count_catalog_display_jobs(slim_items)

        daily_block: dict = {}
        try:
            from app.services.daily_sync_service import DailySyncService

            state = DailySyncService()._read()
            if state.get("status") == "completed":
                daily_block = {
                    "completedAt": state.get("completedAt"),
                    "completedAtIst": state.get("completedAtIst"),
                    "dateIst": state.get("lastCompletedDateIst"),
                    "nextRunAtIst": state.get("nextRunAtIst"),
                    "jobCount": catalog_count,
                    "sourcesScraped": state.get("sourcesScraped"),
                    "scheduledLabel": "8:00 AM IST daily",
                }
        except Exception:
            pass

        payload = {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "dailySync": daily_block or None,
            "items": slim_items,
        }
        path = Path(get_settings().live_jobs_json_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

        list_path = path.with_name("live-jobs-list.json")
        list_payload = {
            "generatedAt": payload["generatedAt"],
            "dailySync": payload["dailySync"],
            "items": list_items,
        }
        list_path.write_text(
            json.dumps(list_payload, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )
        return catalog_count

    def patch_live_jobs_daily_sync(self, block: dict) -> None:
        """Update dailySync in live-jobs.json after mark_completed (export runs while still 'running')."""
        if not block:
            return
        path = Path(get_settings().live_jobs_json_path)
        if not path.exists():
            return
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
            payload["dailySync"] = block
            path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        except Exception:
            pass
