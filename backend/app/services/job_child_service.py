"""Sync job_posts / job_dates child rows from enriched detail."""

from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.job import Job
from app.models.job_related import JobDate, JobPost
from app.parsers.detail_extract import extract_from_content_sections, extract_post_name_from_title
from app.services.noise_filter import sanitize_json_for_postgres


async def sync_job_children(session: AsyncSession, job: Job) -> bool:
    """Parse content_sections → job_posts, job_dates; set detail.post_name. Returns True if mutated."""
    detail = dict(job.detail or {})
    sections = detail.get("content_sections") or []
    posts, dates, post_name = extract_from_content_sections(sections)

    if not post_name:
        post_name = extract_post_name_from_title(job.title or "")
    if not post_name and len(posts) == 1:
        post_name = posts[0].get("post_name")

    changed = False
    if post_name and detail.get("post_name") != post_name:
        detail["post_name"] = post_name
        changed = True

    if posts or dates:
        await session.execute(delete(JobPost).where(JobPost.job_id == job.id))
        await session.execute(delete(JobDate).where(JobDate.job_id == job.id))

        for row in posts:
            session.add(
                JobPost(
                    job_id=job.id,
                    post_name=row["post_name"],
                    vacancies=int(row.get("vacancies") or 0),
                    pay_level=row.get("pay_level"),
                )
            )
        for row in dates:
            session.add(
                JobDate(
                    job_id=job.id,
                    event_key=row["event_key"],
                    event_date=row["event_date"],
                )
            )
        changed = True

    if changed:
        job.detail = sanitize_json_for_postgres(detail)
    return changed
