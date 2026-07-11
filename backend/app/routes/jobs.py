from fastapi import APIRouter, HTTPException, Query, Request, Response

from app.schemas.job import JobListResponse
from app.services.job_service import DatabaseUnavailableError, JobService

router = APIRouter()
service = JobService()

_LIST_CACHE_SECONDS = 60


def _list_cache_headers(etag: str) -> dict[str, str]:
    return {
        "ETag": etag,
        "Cache-Control": f"public, max-age={_LIST_CACHE_SECONDS}",
    }


@router.get("", response_model=JobListResponse)
async def list_jobs(
    request: Request,
    response: Response,
    state: str | None = None,
    category: str | None = None,
    q: str | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=1000),
    offset: int | None = Query(None, ge=0),
):
    effective_offset = offset if offset is not None else (page - 1) * limit
    try:
        etag = await service.list_jobs_etag(
            state=state,
            category=category,
            q=q,
            limit=limit,
            offset=effective_offset,
        )
        if request.headers.get("if-none-match") == etag:
            return Response(status_code=304, headers=_list_cache_headers(etag))
        items, total = await service.list_jobs(
            state=state, category=category, q=q, limit=limit, offset=effective_offset
        )
    except DatabaseUnavailableError:
        raise HTTPException(status_code=503, detail="Job database temporarily unavailable")

    total_pages = max(1, (total + limit - 1) // limit) if limit else 1
    response.headers["Cache-Control"] = f"public, max-age={_LIST_CACHE_SECONDS}"
    response.headers["ETag"] = etag
    return JobListResponse(
        items=items,
        total=total,
        limit=limit,
        offset=effective_offset,
        page=page,
        total_pages=total_pages,
        degraded=False,
    )


@router.get("/{slug}")
async def get_job(slug: str, response: Response):
    try:
        job = await service.get_by_slug(slug)
    except DatabaseUnavailableError:
        raise HTTPException(status_code=503, detail="Job database temporarily unavailable")
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    response.headers["Cache-Control"] = f"public, max-age={_LIST_CACHE_SECONDS}"
    return job
