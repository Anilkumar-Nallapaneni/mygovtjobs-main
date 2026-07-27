from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, Field


class JobPostOut(BaseModel):
    post_name: str
    vacancies: int = 0
    pay_level: str | None = None


class JobDateOut(BaseModel):
    event_key: str
    event_date: date


class JobOut(BaseModel):
    id: str
    slug: str
    title: str
    dept: str | None = None
    category: str | None = None
    state_codes: list[str] = Field(default_factory=list)
    vacancies: int | None = None
    qualification: str | None = None
    salary: str | None = None
    age_limit: str | None = None
    last_date: date | None = None
    apply_url: str | None = None
    pdf_url: str | None = None
    status: str = "live"
    is_sponsored: bool = False
    published_at: datetime | None = None
    verified_at: datetime | None = None
    updated_at: datetime | None = None
    document_type: str | None = None
    verification_status: str | None = None
    completeness_score: int | None = None
    publication_confidence: float | None = None
    published_to_site: bool | None = None
    primary_pdf_url: str | None = None
    post_name: str | None = None
    posts: list[JobPostOut] = Field(default_factory=list)
    important_dates: list[JobDateOut] = Field(default_factory=list)
    detail: dict[str, Any] = Field(default_factory=dict)


class JobListResponse(BaseModel):
    items: list[JobOut]
    total: int
    limit: int
    offset: int
    page: int = 1
    total_pages: int = 1
    degraded: bool = False
