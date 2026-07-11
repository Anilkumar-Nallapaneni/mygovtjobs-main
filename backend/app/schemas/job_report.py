from pydantic import BaseModel, EmailStr, Field


class JobReportCreate(BaseModel):
    job_id: str = Field(min_length=8, max_length=64)
    reason: str = Field(min_length=3, max_length=64)
    description: str = Field(default="", max_length=2000)
    reporter_email: EmailStr | None = None
