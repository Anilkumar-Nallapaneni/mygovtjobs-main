"""Job queries — Postgres via SQLAlchemy."""

import hashlib
import logging

from sqlalchemy import Text, func, literal, or_, select
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import SessionLocal
from app.models.job import Job
from app.models.job_related import JobDate, JobPost
from app.parsers.detail_extract import extract_post_name_from_title
from app.schemas.job import JobDateOut, JobOut, JobPostOut
from app.utils.official_hosts import (
    collect_official_pdf_urls,
    is_blocked_aggregator_host,
    is_official_recruitment_host,
    pick_best_official_url,
)
from app.services.job_sql_filters import apply_recruitment_filters
from app.services.noise_filter import (
    is_junk_job_title,
    is_tender_or_procurement,
    looks_like_job_notification,
)

from app.utils.sanitize_detail import sanitize_job_detail

logger = logging.getLogger(__name__)


def _is_recruitment_job(row: Job) -> bool:
    """Python safety net for edge cases SQL regex may miss."""
    doc_type = str(getattr(row, "document_type", None) or "").upper()
    if doc_type and doc_type not in ("RECRUITMENT", "UNKNOWN"):
        return False
    title = row.title or ""
    url = row.apply_url or ""
    if is_tender_or_procurement(title, url):
        return False
    if is_junk_job_title(title, url):
        return False
    if not looks_like_job_notification(title, url):
        return False
    return True


def _escape_like(q: str) -> str:
    return q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _search_ts_query(q: str):
    return func.plainto_tsquery("english", q.strip())


def _apply_search_filter(stmt, q: str | None):
    """Full-text search (migration 006) with ILIKE fallback for null vectors."""
    if not q or not q.strip():
        return stmt, None
    query_text = q.strip()
    ts_query = _search_ts_query(query_text)
    q_escaped = _escape_like(query_text)
    like = f"%{q_escaped}%"
    stmt = stmt.where(
        or_(
            Job.search_vector.op("@@")(ts_query),
            Job.title.ilike(like, escape="\\"),
            Job.dept.ilike(like, escape="\\"),
        )
    )
    return stmt, ts_query


def _list_cache_fingerprint(
    *,
    state: str | None = None,
    category: str | None = None,
    q: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> str:
    parts = [
        state or "",
        category or "",
        (q or "").strip().lower(),
        str(limit),
        str(offset),
    ]
    digest = hashlib.sha256("|".join(parts).encode()).hexdigest()[:16]
    return digest


def _base_list_stmt(*, state=None, category=None, q=None):
    stmt = select(Job).where(Job.status.in_(("live", "expired")))
    if category:
        stmt = stmt.where(Job.category == category)
    if state:
        # Cast to TEXT[] so Postgres @> matches jobs.state_codes (TEXT[]), not VARCHAR[]
        code = (state or "").strip().lower()
        if code:
            stmt = stmt.where(
                or_(
                    Job.state_codes.contains(literal([code], type_=ARRAY(Text))),
                    Job.state_codes == literal([], type_=ARRAY(Text)),
                )
            )
    stmt, _ts_query = _apply_search_filter(stmt, q)
    return apply_recruitment_filters(stmt)


class DatabaseUnavailableError(Exception):
    """Postgres unreachable or query failed unexpectedly."""


def _to_job_out(
    row: Job,
    *,
    posts: list[JobPost] | None = None,
    dates: list[JobDate] | None = None,
) -> JobOut:
    detail = sanitize_job_detail(row.detail or {})
    apply_url = row.apply_url
    if not apply_url or is_blocked_aggregator_host(apply_url) or not is_official_recruitment_host(apply_url or ""):
        pdf_urls = detail.get("pdf_urls") or detail.get("pdfUrls") or []
        candidates = [u for u in pdf_urls if isinstance(u, str)]
        for key in ("notification_url", "link", "source_url", "pdf_url", "pdfUrl"):
            value = detail.get(key)
            if isinstance(value, str):
                candidates.append(value)
        apply_url = pick_best_official_url(candidates) or (
            None if (row.apply_url and is_blocked_aggregator_host(row.apply_url)) else row.apply_url
        )

    pdf_candidates = collect_official_pdf_urls(detail, apply_url)
    pdf_url = detail.get("pdf_url") or detail.get("pdfUrl") or (pdf_candidates[0] if pdf_candidates else None)
    if not pdf_url:
        urls = detail.get("pdf_urls") or detail.get("pdfUrls") or []
        pdf_url = next((u for u in urls if is_official_recruitment_host(u)), None)
    if pdf_url and not is_official_recruitment_host(str(pdf_url)):
        pdf_url = pdf_candidates[0] if pdf_candidates else None
    if not pdf_url and apply_url and ".pdf" in str(apply_url).lower():
        pdf_url = apply_url
    if pdf_candidates:
        detail = {**detail, "pdfUrls": pdf_candidates}
    post_name = str(detail.get("post_name") or "").strip() or extract_post_name_from_title(row.title or "")
    post_rows = [
        JobPostOut(
            post_name=p.post_name,
            vacancies=p.vacancies or 0,
            pay_level=p.pay_level,
        )
        for p in (posts or [])
    ]
    date_rows = [
        JobDateOut(event_key=d.event_key, event_date=d.event_date)
        for d in (dates or [])
    ]
    return JobOut(
        id=row.id,
        slug=row.slug,
        title=row.title,
        dept=row.dept,
        category=row.category,
        state_codes=list(row.state_codes or []),
        vacancies=row.vacancies if row.vacancies and row.vacancies > 0 else None,
        qualification=row.qualification,
        salary=row.salary,
        age_limit=row.age_limit,
        last_date=row.last_date,
        apply_url=apply_url,
        pdf_url=pdf_url,
        status=row.status or "live",
        is_sponsored=bool(getattr(row, "is_sponsored", False)),
        published_at=row.published_at,
        document_type=getattr(row, "document_type", None),
        verification_status=getattr(row, "verification_status", None),
        completeness_score=getattr(row, "completeness_score", None),
        published_to_site=getattr(row, "published_to_site", None),
        primary_pdf_url=getattr(row, "primary_pdf_url", None) or pdf_url,
        post_name=post_name or None,
        posts=post_rows,
        important_dates=date_rows,
        detail=detail,
    )


class JobService:
    _PAGE_OVERFETCH = 3  # SQL recruitment filters catch bulk noise; small Python safety net

    async def list_jobs(
        self,
        *,
        state=None,
        category=None,
        q=None,
        limit=50,
        offset=0,
        session: AsyncSession | None = None,
    ):
        owns = session is None
        if owns:
            session = SessionLocal()

        try:
            base = _base_list_stmt(state=state, category=category, q=q)
            ts_query = _search_ts_query(q) if q and q.strip() else None
            if ts_query is not None:
                rank = func.ts_rank(Job.search_vector, ts_query)
                ordered = base.order_by(rank.desc().nullslast(), Job.published_at.desc().nullslast())
            else:
                ordered = base.order_by(Job.published_at.desc().nullslast())

            filtered = base.subquery()
            total = (
                await session.execute(select(func.count()).select_from(filtered))
            ).scalar_one()

            fetch_size = limit + self._PAGE_OVERFETCH
            batch = (
                await session.execute(ordered.limit(fetch_size).offset(offset))
            ).scalars().all()

            page: list[JobOut] = []
            for row in batch:
                if not _is_recruitment_job(row):
                    continue
                page.append(_to_job_out(row))
                if len(page) >= limit:
                    break

            return page, int(total or 0)
        except Exception as exc:
            await session.rollback()
            logger.exception("list_jobs failed")
            raise DatabaseUnavailableError from exc
        finally:
            if owns:
                await session.close()

    async def list_jobs_etag(
        self,
        *,
        state: str | None = None,
        category: str | None = None,
        q: str | None = None,
        limit: int = 50,
        offset: int = 0,
        session: AsyncSession | None = None,
    ) -> str:
        """Fingerprint for HTTP caching — includes query filters so clients do not get stale slices."""
        owns = session is None
        if owns:
            session = SessionLocal()
        try:
            base = _base_list_stmt(state=state, category=category, q=q)
            filtered = base.subquery()
            row = (
                await session.execute(
                    select(func.count(), func.max(filtered.c.updated_at)).select_from(filtered)
                )
            ).one()
            count, updated = row[0], row[1]
            stamp = updated.isoformat() if updated else "none"
            fingerprint = _list_cache_fingerprint(
                state=state,
                category=category,
                q=q,
                limit=limit,
                offset=offset,
            )
            return f"jobs-{count}-{stamp}-{fingerprint}"
        except Exception:
            return "jobs-0"
        finally:
            if owns:
                await session.close()

    async def get_by_slug(self, slug: str, session: AsyncSession | None = None) -> JobOut | None:
        owns = session is None
        if owns:
            session = SessionLocal()
        try:
            row = (
                await session.execute(
                    select(Job).where(Job.slug == slug, Job.status.in_(("live", "expired")))
                )
            ).scalar_one_or_none()
            if not row or not _is_recruitment_job(row):
                return None
            posts = (
                await session.execute(select(JobPost).where(JobPost.job_id == row.id).order_by(JobPost.post_name))
            ).scalars().all()
            dates = (
                await session.execute(select(JobDate).where(JobDate.job_id == row.id).order_by(JobDate.event_date))
            ).scalars().all()
            return _to_job_out(row, posts=list(posts), dates=list(dates))
        except Exception as exc:
            logger.exception("get_by_slug failed slug=%s", slug)
            raise DatabaseUnavailableError from exc
        finally:
            if owns:
                await session.close()
