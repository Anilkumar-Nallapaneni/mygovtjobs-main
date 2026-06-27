from pathlib import Path

from app.utils.repo_paths import resolve_repo_path


def test_resolve_repo_path_finds_scraper_registry():
    path = resolve_repo_path("scripts", "scraper_registry.json")
    assert path.is_file(), path


def test_resolve_repo_path_finds_notification_template():
    path = resolve_repo_path("scripts", "parser_templates", "default_notification.json")
    assert path.is_file(), path


def test_resolve_repo_path_docker_layout(tmp_path, monkeypatch):
    """Simulate /app layout used by backend/Dockerfile."""
    scripts = tmp_path / "scripts" / "parser_templates"
    scripts.mkdir(parents=True)
    template = scripts / "default_notification.json"
    template.write_text("{}", encoding="utf-8")

    fake_utils = tmp_path / "app" / "utils" / "repo_paths.py"
    fake_utils.parent.mkdir(parents=True)
    fake_utils.write_text(
        (Path(__file__).resolve().parents[1] / "app" / "utils" / "repo_paths.py").read_text(encoding="utf-8")
    )

    import importlib.util

    spec = importlib.util.spec_from_file_location("repo_paths_docker", fake_utils)
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(mod)

    resolved = mod.resolve_repo_path("scripts", "parser_templates", "default_notification.json")
    assert resolved == template
