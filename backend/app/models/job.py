from datetime import date, datetime
from uuid import uuid4

from sqlalchemy import Date, DateTime, Integer, String, Text, UniqueConstraint, func
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
    state_codes: Mapped[list[str] | None] = mapped_column(ARRAY(String(8)))
    vacancies: Mapped[int] = mapped_column(Integer, default=0)
    qualification: Mapped[str | None] = mapped_column(Text)
    salary: Mapped[str | None] = mapped_column(String(128))
    age_limit: Mapped[str | None] = mapped_column(String(128))
    last_date: Mapped[date | None] = mapped_column(Date)
    apply_url: Mapped[str | None] = mapped_column(Text)
    pdf_storage_path: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(32), default="live")
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    normalized_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    content_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    detail: Mapped[dict | None] = mapped_column(JSONB, default=dict)
    search_vector: Mapped[str | None] = mapped_column(TSVECTOR, nullable=True)
    title_fingerprint: Mapped[str | None] = mapped_column(String(32), nullable=True)
    is_sponsored: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
