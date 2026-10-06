from app.routes.india import CATEGORIES, _state_id


def test_india_categories_cover_explorer():
    expected = {
        "agriculture", "industries", "companies", "tourism", "temples",
        "hotels", "hospitals", "transport", "jobs", "education", "schemes", "gk"
    }
    assert expected.issubset(CATEGORIES)


def test_state_id_normalization():
    assert _state_id(" KA ") == "ka"
