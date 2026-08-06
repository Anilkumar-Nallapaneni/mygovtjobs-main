"""Tests for QA review helpers and state resolve."""

from app.agents.qa_review_agent import improve_title
from app.utils.state_resolve import (
    job_matches_bucket,
    normalize_state_codes,
    resolve_state_codes,
)


def test_improve_title_splits_glued_acronym():
    assert "PNB" in improve_title("PNBRecruitment of Local Bank Officer")
    assert "Recruitment" in improve_title("PNBRecruitment of Local Bank Officer")


def test_improve_title_preserves_clean():
    t = "MPPSC Recruitment 2026 - Apply Online for 06 Posts"
    assert improve_title(t) == t or "MPPSC" in improve_title(t)


def test_resolve_state_codes_from_title():
    codes = resolve_state_codes(title="CMHO Raigarh Recruitment 2026", dept="")
    assert codes == ["cg"]


def test_resolve_state_codes_from_host():
    codes = resolve_state_codes(
        title="Some job",
        apply_url="https://www.mppsc.nic.in/recruitment",
    )
    assert codes == ["mp"]


def test_resolve_state_codes_all_india_empty():
    codes = resolve_state_codes(title="ISRO Scientist Recruitment 2026", dept="ISRO")
    assert codes == []


def test_job_matches_bucket():
    assert job_matches_bucket(["up"], "north")
    assert not job_matches_bucket(["up"], "south")
    assert job_matches_bucket([], "all-india")
    assert not job_matches_bucket(["mh"], "all-india")
    assert job_matches_bucket(["mh"], "all")


def test_normalize_state_codes_filters_invalid():
    assert normalize_state_codes(["UP", "all", "xx", "mh"]) == ["up", "mh"]
