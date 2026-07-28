from datetime import date, datetime
from uuid import uuid4

from sqlalchemy import Boolean, Date, DateTime, Float, Integer, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, TSVECTOR, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Source(Base):
    __tablename__ = "sources"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    code: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(String(32), nullable=False)
    feed_url: Mapped[str | None] = mapped_column(Text)
    portal_url: Mapped[str | None] = mapped_column(Text)
    state_code: Mapped[str | None] = mapped_column(String(8))
    is_active: Mapped[bool] = mapped_column(default=True)
    last_run_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_error: Mapped[str | None] = mapped_column(Text)


class RawIngest(Base):
    __tablename__ = "raw_ingest"
    __table_args__ = (UniqueConstraint("source_id", "external_id", name="raw_ingest_source_external_key"),)

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    source_id: Mapped[str] = mapped_column(UUID(as_uuid=False), nullable=False)
    external_id: Mapped[str] = mapped_column(String(64), nullable=False)
    raw_json: Mapped[dict] = mapped_column(JSONB, nullable=False)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    slug: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    dept: Mapped[str | None] = mapped_column(String(255))
    category: Mapped[str | None] = mapped_column(String(64))
    # DB column is TEXT[] (see supabase_setup.sql) — must match or @> filters fail
    state_codes: Mapped[list[str] | None] = mapped_column(ARRAY(Text))
    vacancies: Mapped[int | None] = mapped_column(Integer, nullable=True)
    qualification: Mapped[str | None] = mapped_column(Text)
    salary: Mapped[str | None] = mapped_column(String(128))
    age_limit: Mapped[str | None] = mapped_column(String(128))
    last_date: Mapped[date | None] = mapped_column(Date)
    apply_url: Mapped[str | None] = mapped_column(Text)
    pdf_storage_path: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(32), default="draft")
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    normalized_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    content_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    detail: Mapped[dict | None] = mapped_column(JSONB, default=dict)
    search_vector: Mapped[str | None] = mapped_column(TSVECTOR, nullable=True)
    title_fingerprint: Mapped[str | None] = mapped_column(String(32), nullable=True)
    is_sponsored: Mapped[bool] = mapped_column(default=False)
    document_type: Mapped[str | None] = mapped_column(String(32), default="UNKNOWN")
    verification_status: Mapped[str] = mapped_column(String(32), default="UNVERIFIED")
    completeness_score: Mapped[int] = mapped_column(Integer, default=0)
    published_to_site: Mapped[bool] = mapped_column(Boolean, default=False)
    extraction_confidence: Mapped[float | None] = mapped_column(Numeric(4, 3))
    primary_pdf_url: Mapped[str | None] = mapped_column(Text)
    source_evidence: Mapped[dict | None] = mapped_column(JSONB, default=dict)
    review_reasons: Mapped[list | None] = mapped_column(JSONB, default=list)
    source_url: Mapped[str | None] = mapped_column(Text)
    source_domain: Mapped[str | None] = mapped_column(String(255))
    source_type: Mapped[str | None] = mapped_column(String(64))
    scraped_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_http_status: Mapped[int | None] = mapped_column(Integer)
    parser_version: Mapped[str | None] = mapped_column(String(64))
    confidence_score: Mapped[float | None] = mapped_column(Float)
    publication_confidence: Mapped[float] = mapped_column(Numeric(5, 2), default=0)
    link_last_checked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    link_last_http_status: Mapped[int | None] = mapped_column(Integer)
    link_consecutive_failures: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class JobReviewQueue(Base):
    __tablename__ = "job_review_queue"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    fingerprint: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    source_url: Mapped[str | None] = mapped_column(Text)
    raw_payload: Mapped[dict] = mapped_column(JSONB, nullable=False)
    normalized_payload: Mapped[dict | None] = mapped_column(JSONB)
    validation_errors: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    validation_warnings: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    confidence: Mapped[float] = mapped_column(Numeric(5, 2), default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="pending", nullable=False)
    created_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    reviewed_by: Mapped[str | None] = mapped_column(UUID(as_uuid=False))
    review_notes: Mapped[str | None] = mapped_column(Text)


class SourceHealth(Base):
    __tablename__ = "source_health"

    source_code: Mapped[str] = mapped_column(String(64), primary_key=True)
    homepage_url: Mapped[str] = mapped_column(Text, default="")
    recruitment_url: Mapped[str | None] = mapped_column(Text)
    last_checked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    homepage_status: Mapped[int | None] = mapped_column(Integer)
    recruitment_status: Mapped[int | None] = mapped_column(Integer)
    response_time_ms: Mapped[int | None] = mapped_column(Integer)
    discovered_count: Mapped[int] = mapped_column(Integer, default=0)
    accepted_count: Mapped[int] = mapped_column(Integer, default=0)
    rejected_count: Mapped[int] = mapped_column(Integer, default=0)
    pdf_success_count: Mapped[int] = mapped_column(Integer, default=0)
    pdf_failure_count: Mapped[int] = mapped_column(Integer, default=0)
    parser_status: Mapped[str | None] = mapped_column(String(64))
    health_status: Mapped[str] = mapped_column(String(32), default="UNKNOWN")
    last_error: Mapped[str | None] = mapped_column(Text)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
