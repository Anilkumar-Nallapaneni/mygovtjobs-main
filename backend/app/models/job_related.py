from datetime import date
from uuid import uuid4

from sqlalchemy import Date, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.job import Base


class JobPost(Base):
    __tablename__ = "job_posts"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    job_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    post_name: Mapped[str] = mapped_column(Text, nullable=False)
    vacancies: Mapped[int] = mapped_column(Integer, default=0)
    pay_level: Mapped[str | None] = mapped_column(String(128))
    category_breakdown: Mapped[dict | None] = mapped_column(JSONB, default=dict)


class JobDate(Base):
    __tablename__ = "job_dates"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    job_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    event_key: Mapped[str] = mapped_column(Text, nullable=False)
    event_date: Mapped[date] = mapped_column(Date, nullable=False)
