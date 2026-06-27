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
    vacancies: int = 0
    qualification: str | None = None
    salary: str | None = None
    age_limit: str | None = None
    last_date: date | None = None
    apply_url: str | None = None
    pdf_url: str | None = None
    status: str = "live"
    is_sponsored: bool = False
    published_at: datetime | None = None
    post_name: str | None = None
    posts: list[JobPostOut] = Field(default_factory=list)
    important_dates: list[JobDateOut] = Field(default_factory=list)
    detail: dict[str, Any] = Field(default_factory=dict)


class JobListResponse(BaseModel):
    items: list[JobOut]
    total: int
    limit: int
    offset: int
    degraded: bool = False
