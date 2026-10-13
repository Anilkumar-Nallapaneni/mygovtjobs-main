from app.agents.watchdog_agent import demotion_target


def test_past_deadline_demotes_to_expired():
    assert demotion_target(["deadline expired"]) == "expired"
    assert demotion_target(["missing official links", "deadline expired"]) == "expired"


def test_other_failures_return_to_draft():
    assert demotion_target(["missing last_date"]) == "draft"
    assert demotion_target(["document_type=TENDER"]) == "draft"
