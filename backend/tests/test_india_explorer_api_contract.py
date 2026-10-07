from app.routes.india import CATEGORIES, _state_id
import asyncio


def test_india_categories_cover_explorer():
    expected = {
        "agriculture", "industries", "companies", "tourism", "temples",
        "hotels", "hospitals", "transport", "jobs", "education", "schemes", "gk"
    }
    assert expected.issubset(CATEGORIES)


def test_state_id_normalization():
    assert _state_id(" KA ") == "ka"


def test_district_jobs_do_not_return_statewide_listings():
    from app.routes.india import state_category
    result = asyncio.run(state_category("ka", "jobs", district_id="district-uuid"))
    assert result["items"] == []
    assert result["total"] == 0
    assert "district-level" in result["message"]
