from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_static_grade_hides_keys_until_submit():
    response = client.post(
        "/api/education/grade-static",
        json={"testId": "jee-phys-1", "answers": [{"questionId": 1, "selectedIndex": 0}]},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["score"] == 4
    assert body["maxScore"] == 40
    first = body["questions"][0]
    assert first["questionId"] == 1
    assert first["isCorrect"] is True
    assert first["explanation"]


def test_static_grade_unknown_test():
    response = client.post("/api/education/grade-static", json={"testId": "missing", "answers": []})
    assert response.status_code == 404
