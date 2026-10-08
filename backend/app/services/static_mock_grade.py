"""Grade bundled practice tests without shipping the answer key to the browser."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

_KEYS_PATH = Path(__file__).resolve().parents[1] / "data" / "static_mock_keys.json"
_MARKS = 4


@lru_cache(maxsize=1)
def _keys() -> dict[str, list[dict]]:
    payload = json.loads(_KEYS_PATH.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise RuntimeError("static mock keys must be an object")
    return payload


def grade_static_mock(test_id: str, answers: list[dict]) -> dict | None:
    questions = _keys().get(test_id)
    if not questions:
        return None
    selected = {
        int(item["questionId"]): item.get("selectedIndex")
        for item in answers
        if item.get("questionId") is not None
    }
    graded = []
    score = 0
    for question in questions:
        question_id = int(question["id"])
        correct = int(question["correctAnswer"])
        choice = selected.get(question_id)
        choice_index = int(choice) if isinstance(choice, int) else None
        is_correct = choice_index == correct
        if is_correct:
            score += _MARKS
        graded.append(
            {
                "questionId": question_id,
                "correctIndex": correct,
                "explanation": question.get("explanation") or "",
                "selectedIndex": choice_index,
                "isCorrect": is_correct,
            }
        )
    return {
        "score": score,
        "maxScore": len(questions) * _MARKS,
        "questions": graded,
    }
