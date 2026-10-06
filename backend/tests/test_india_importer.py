"""Validate importer input without connecting to the database."""
import asyncio
import importlib.util
from pathlib import Path

import pytest


@pytest.fixture
def importer():
    path = Path(__file__).resolve().parents[2] / "scripts" / "india" / "import_directory.py"
    spec = importlib.util.spec_from_file_location("india_importer", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.mark.parametrize("content", ["", "state_id,name,source_record_id,source_url\n"])
def test_empty_dataset_never_opens_database(importer, tmp_path, monkeypatch, content):
    csv_path = tmp_path / "districts.csv"
    csv_path.write_text(content, encoding="utf-8")

    def forbidden_session():
        pytest.fail("Empty CSV must be rejected before a database session opens")

    monkeypatch.setattr(importer, "SessionLocal", forbidden_session)
    with pytest.raises(ValueError, match="empty|template/header"):
        asyncio.run(importer.import_rows("districts", csv_path, False, "LGD"))


def test_relative_csv_path_uses_repository_root(importer, tmp_path, monkeypatch):
    data_dir = tmp_path / "data" / "india"
    data_dir.mkdir(parents=True)
    (data_dir / "districts.csv").write_text("state_id,name\nka,Example District\n", encoding="utf-8-sig")
    monkeypatch.setattr(importer, "ROOT", tmp_path)
    monkeypatch.chdir(data_dir)
    rows = importer.read_csv_rows("districts", Path("data/india/districts.csv"))
    assert rows == [{"state_id": "ka", "name": "Example District"}]


def test_missing_required_columns_are_rejected(importer, tmp_path):
    csv_path = tmp_path / "places.csv"
    csv_path.write_text("state_id,name\nka,Example Place\n", encoding="utf-8")
    with pytest.raises(ValueError, match="category"):
        importer.read_csv_rows("places", csv_path)
