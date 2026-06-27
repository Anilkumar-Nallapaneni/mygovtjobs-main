from pydantic import BaseModel, EmailStr, Field


class ContactRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    mobile: str = Field(default="", max_length=20)
    message: str = Field(min_length=10, max_length=4000)
    website: str = Field(default="", max_length=200)
