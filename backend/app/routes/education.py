from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.static_mock_grade import grade_static_mock

router = APIRouter()


class StaticAnswer(BaseModel):
    questionId: int = Field(ge=1, le=500)
    selectedIndex: int | None = Field(default=None, ge=0, le=20)


class StaticGradeRequest(BaseModel):
    testId: str = Field(min_length=1, max_length=80)
    answers: list[StaticAnswer] = Field(default_factory=list, max_length=100)


@router.post("/grade-static")
def grade_static(body: StaticGradeRequest):
    result = grade_static_mock(
        body.testId,
        [answer.model_dump() for answer in body.answers],
    )
    if result is None:
        raise HTTPException(status_code=404, detail="Unknown practice test")
    return result
