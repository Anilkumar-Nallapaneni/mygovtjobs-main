from pathlib import Path

from app.agents.ingest_agent import REGISTRY_PATH, _resolve_registry_path


def test_registry_path_exists_in_monorepo():
    assert REGISTRY_PATH.is_file()
    assert REGISTRY_PATH.name == "scraper_registry.json"


def test_registry_resolver_checks_app_and_repo_roots():
    path = _resolve_registry_path()
    assert path.parts[-2:] == ("scripts", "scraper_registry.json")
    assert Path(path).is_file()
