"""LGD regression tests use the official snapshot; altered copies are rejection cases."""
import asyncio
import copy
import csv
import hashlib
import importlib.util
import json
import sys
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZipFile

import pytest

ROOT = Path(__file__).resolve().parents[2]
SCRIPT_DIR = ROOT / "scripts/india"
sys.path.insert(0, str(SCRIPT_DIR))
import normalize_lgd_districts as lgd
from lgd_district_import import district_values, execute_plan, plan_district_import, run_database_plan


@pytest.fixture(scope="module")
def snapshot():
    return lgd.normalize_source(lgd.DEFAULT_SOURCE)


def workbook_copy(tmp_path, change):
    target = tmp_path / "lgd.xlsx"
    with ZipFile(lgd.root_path(lgd.DEFAULT_SOURCE)) as source, ZipFile(target, "w") as output:
        for item in source.infolist():
            data = source.read(item.filename)
            if item.filename == "xl/worksheets/sheet1.xml":
                document = ET.fromstring(data)
                change(document)
                data = ET.tostring(document)
            output.writestr(item, data)
    return target


def write_csv(path, rows, fields=lgd.FIELDS, encoding="utf-8"):
    with path.open("w", encoding=encoding, newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


def test_current_official_snapshot_and_immutable_checksum(snapshot):
    rows, metadata, stats = snapshot
    assert len(rows) == 784  # This snapshot only; parser/validator have no fixed district total.
    assert stats["state_ut_count"] == 36
    assert stats["unique_district_lgd_codes"] == 784
    assert {row["state_id"] for row in rows} == lgd.canonical_state_ids()
    assert metadata["sha256"] == "387ce8805f54b68baaeda1dbc40751927e8eb981f2b48548ffeaf833a6881d68"
    assert hashlib.sha256(lgd.root_path(lgd.DEFAULT_SOURCE).read_bytes()).hexdigest() == metadata["sha256"]
    assert rows[0]["district_name"] == "Nicobars"
    assert rows[0]["district_lgd_code"] == "603"
    assert rows[0]["census_2001_code"] == "2"


def test_xlsx_header_detected_after_extra_title_rows(tmp_path):
    def change(document):
        sheet = document.find("m:sheetData", lgd.NS)
        sheet.insert(0, copy.deepcopy(sheet[0]))
    path = workbook_copy(tmp_path, change)
    assert len(lgd.read_lgd_xlsx(path)) == 784


def test_xlsx_header_bom_whitespace(tmp_path):
    def change(document):
        cell = document.find("m:sheetData/m:row[@r='2']/m:c[@r='B2']", lgd.NS)
        cell.set("t", "inlineStr")
        for child in list(cell):
            cell.remove(child)
        inline = ET.SubElement(cell, f"{{{lgd.NS['m']}}}is")
        ET.SubElement(inline, f"{{{lgd.NS['m']}}}t").text = "\ufeff State Code "
    assert len(lgd.read_lgd_xlsx(workbook_copy(tmp_path, change))) == 784


def test_missing_xlsx_column(tmp_path):
    def change(document):
        header = document.find("m:sheetData/m:row[@r='2']", lgd.NS)
        header.remove(header.find("m:c[@r='D2']", lgd.NS))
    with pytest.raises(ValueError, match="District Code"):
        lgd.read_lgd_xlsx(workbook_copy(tmp_path, change))


@pytest.mark.parametrize("keep_header", [False, True])
def test_empty_workbook(tmp_path, keep_header):
    def change(document):
        sheet = document.find("m:sheetData", lgd.NS)
        for row in list(sheet)[2 if keep_header else 1:]:
            sheet.remove(row)
    with pytest.raises(ValueError, match="empty|template/header"):
        lgd.read_lgd_xlsx(workbook_copy(tmp_path, change))


@pytest.mark.parametrize("mutation,match", [
    ("duplicate_code", "Duplicate LGD district code"),
    ("duplicate_district", "Duplicate normalized district"),
    ("unknown_state", "unknown LGD state mapping"),
    ("empty_name", "empty district_name"),
    ("empty_code", "empty district_lgd_code"),
    ("bad_state_id", "invalid canonical state mapping"),
])
def test_record_rejections(snapshot, mutation, match):
    rows = copy.deepcopy(snapshot[0])
    if mutation == "duplicate_code":
        rows[1]["district_lgd_code"] = rows[0]["district_lgd_code"]
    elif mutation == "duplicate_district":
        rows[1]["district_name"] = rows[0]["district_name"]
    elif mutation == "unknown_state":
        rows[0]["state_lgd_code"] = "999"
    elif mutation == "empty_name":
        rows[0]["district_name"] = " "
    elif mutation == "empty_code":
        rows[0]["district_lgd_code"] = ""
    else:
        rows[0]["state_id"] = "ka"
    with pytest.raises(ValueError, match=match):
        lgd.validate_records(rows, lgd.load_state_mapping())


def test_missing_state_coverage(snapshot):
    with pytest.raises(ValueError, match="Incomplete State/UT coverage"):
        lgd.validate_records([row for row in snapshot[0] if row["state_id"] != "ka"], lgd.load_state_mapping())


@pytest.mark.parametrize("mutation", ["duplicate", "missing", "unknown"])
def test_mapping_table_rejections(tmp_path, mutation):
    entries = json.loads(lgd.root_path(lgd.MAPPING_PATH).read_text())
    if mutation == "duplicate":
        entries.append(entries[0])
    elif mutation == "missing":
        entries.pop()
    else:
        entries[0]["state_id"] = "unknown"
    path = tmp_path / "mapping.json"
    path.write_text(json.dumps(entries))
    with pytest.raises(ValueError, match="duplicate|coverage"):
        lgd.load_state_mapping(path)


def test_normalized_bom_and_header_whitespace(snapshot, tmp_path):
    path = tmp_path / "districts.csv"
    rows = [{f" {key} ": value for key, value in row.items()} for row in snapshot[0]]
    write_csv(path, rows, fields=[f" {field} " for field in lgd.FIELDS], encoding="utf-8-sig")
    actual, metadata, stats = lgd.validate_normalized(path, lgd.DEFAULT_SOURCE)
    assert actual == snapshot[0]
    assert metadata == snapshot[1]
    assert stats["valid_records"] == 784


def test_normalized_missing_columns(tmp_path):
    path = tmp_path / "districts.csv"
    path.write_text("state_id,district_name\nka,\n")
    with pytest.raises(ValueError, match="district_lgd_code"):
        lgd.read_normalized_csv(path)


@pytest.mark.parametrize("field", ["district_name", "source_sha256", "verified", "census_2011_code"])
def test_altered_records_or_provenance_fail_source_reconciliation(snapshot, tmp_path, field):
    rows = copy.deepcopy(snapshot[0])
    rows[0][field] = rows[0][field] + "changed"
    path = tmp_path / "altered.csv"
    write_csv(path, rows)
    with pytest.raises(ValueError, match="differs from authoritative XLSX"):
        lgd.validate_normalized(path, lgd.DEFAULT_SOURCE)


def test_relative_csv_path_uses_root(tmp_path, monkeypatch):
    path = tmp_path / "normalized.csv"
    write_csv(path, [])
    monkeypatch.setattr(lgd, "ROOT", tmp_path)
    monkeypatch.chdir(SCRIPT_DIR)
    with pytest.raises(ValueError, match="empty|template/header"):
        lgd.read_normalized_csv(Path("normalized.csv"))


def test_invalid_lgd_input_never_opens_session(tmp_path, monkeypatch):
    spec = importlib.util.spec_from_file_location("lgd_importer_test", SCRIPT_DIR / "import_directory.py")
    importer = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(importer)
    def forbidden():
        pytest.fail("Invalid LGD input must never open SessionLocal")
    monkeypatch.setattr(importer, "SessionLocal", forbidden)
    path = tmp_path / "empty.csv"
    path.write_text("")
    with pytest.raises(ValueError, match="empty"):
        asyncio.run(importer.import_lgd_districts(path))


class Result:
    def __init__(self, value):
        self.value = value
    def scalar_one_or_none(self):
        return self.value
    def scalar_one(self):
        return self.value
    def scalars(self):
        return self
    def mappings(self):
        return self
    def all(self):
        return self.value
    def first(self):
        return self.value


class PlanSession:
    """Simulate database state; prohibit DML in dry-run, observe guarded apply SQL."""
    def __init__(self, existing=None, migration_ready=True, dry=True):
        self.existing = existing or []
        self.migration_ready = migration_ready
        self.dry = dry
        self.statements = []
        self.committed = False
        self.rolled_back = False
    async def execute(self, statement, params=None):
        sql = str(statement).strip()
        self.statements.append((sql, params))
        if sql.startswith("SET TRANSACTION"):
            assert "READ ONLY" in sql
            return Result(None)
        if sql.startswith("SELECT id FROM public.india_sources"):
            return Result("lgd-source-id")
        if sql.startswith("SELECT id FROM public.india_states"):
            return Result(sorted(lgd.canonical_state_ids()))
        if sql.startswith("SELECT to_jsonb(d)"):
            return Result([{"record": item, "source_name": item.get("source_name")} for item in self.existing])
        if sql.startswith("SELECT EXISTS"):
            return Result(self.migration_ready)
        if self.dry:
            pytest.fail(f"Dry-run attempted a write/lock: {sql}")
        if sql.startswith("LOCK TABLE") or "india_lgd_district_snapshots" in sql:
            return Result(None)
        if sql.startswith("UPDATE public.india_districts"):
            existing = next(item for item in self.existing if item["id"] == params["id"])
            existing["lgd_district_code"] = params["lgd_district_code"]
            existing["source_id"] = params["source_id"]
            return Result({"id": params["id"]})
        assert sql.startswith("INSERT INTO public.india_districts")
        assert "ON CONFLICT (lgd_district_code) DO UPDATE" in sql
        assert "WHERE d.source_id=EXCLUDED.source_id" in sql
        item = next((item for item in self.existing if item.get("lgd_district_code") == params["lgd_district_code"]), None)
        if item is None:
            item = {"id": "preserved-district-uuid"}
            self.existing.append(item)
        item.update({**params, "lgd_provenance": json.loads(params["lgd_provenance"]), "source_name": lgd.SOURCE})
        return Result({"id": item["id"]})
    async def commit(self):
        self.committed = True
    async def rollback(self):
        self.rolled_back = True


def test_dry_run_executes_zero_dml_even_before_migration(snapshot):
    session = PlanSession(migration_ready=False)
    report = asyncio.run(run_database_plan(session, snapshot[0], snapshot[1]))
    assert report["prospective_inserts"] == 784
    assert report["prospective_updates"] == report["prospective_unchanged"] == report["database_writes"] == 0
    assert report["migration_043_required"]
    assert session.statements[0][0].endswith("READ ONLY")
    assert session.rolled_back and not session.committed


def test_plan_counts_insert_update_unchanged(snapshot):
    rows = snapshot[0][:3]
    unchanged = {**district_values(rows[0], "lgd-source-id"), "id": "district-1", "source_name": lgd.SOURCE}
    changed = {**district_values(rows[1], "lgd-source-id"), "id": "district-2", "source_name": lgd.SOURCE, "census_2001_code": None}
    plan = plan_district_import(rows, [unchanged, changed], "lgd-source-id")
    assert [plan[key] for key in ("prospective_inserts", "prospective_updates", "prospective_unchanged")] == [1, 1, 1]
    assert not plan["conflicts"]


@pytest.mark.parametrize("conflict", ["other_source", "other_code", "newer_source", "slug_collision"])
def test_plan_blocks_uncontrolled_replacement(snapshot, conflict):
    row = snapshot[0][0]
    existing = {**district_values(row, "lgd-source-id"), "id": "district-1", "source_name": lgd.SOURCE}
    if conflict == "other_source":
        existing["source_name"] = "Independent verified source"
    elif conflict == "other_code":
        existing["lgd_district_code"] = snapshot[0][1]["district_lgd_code"]
    elif conflict == "newer_source":
        existing["lgd_provenance"]["source_download_date"] = "2026-10-08"
    else:
        existing["name"] = snapshot[0][1]["district_name"]
        existing["lgd_district_code"] = snapshot[0][1]["district_lgd_code"]
    plan = plan_district_import([row], [existing], "lgd-source-id")
    assert len(plan["conflicts"]) == 1
    session = PlanSession(dry=False)
    with pytest.raises(ValueError, match="conflicts"):
        asyncio.run(execute_plan(session, plan, [row], snapshot[1]))
    assert not session.statements


def test_apply_upsert_preserves_identity_and_second_run_is_unchanged(snapshot):
    rows = snapshot[0][:1]
    session = PlanSession(dry=False)
    first = asyncio.run(run_database_plan(session, rows, snapshot[1], apply=True))
    assert first["prospective_inserts"] == 1 and session.committed
    district_id = session.existing[0]["id"]
    second = asyncio.run(run_database_plan(session, rows, snapshot[1], apply=True))
    assert second["prospective_unchanged"] == 1 and second["database_writes"] == 0
    assert session.existing[0]["id"] == district_id
    assert len(session.existing) == 1


def test_apply_attaches_unclaimed_pending_uuid(snapshot):
    rows = snapshot[0][:1]
    existing = {"id": "existing-district-uuid", "state_id": rows[0]["state_id"], "name": rows[0]["district_name"],
                "verification_status": "pending", "source_id": None}
    session = PlanSession(existing=[existing], dry=False)
    report = asyncio.run(run_database_plan(session, rows, snapshot[1], apply=True))
    assert report["prospective_updates"] == 1
    assert len(session.existing) == 1
    assert session.existing[0]["id"] == "existing-district-uuid"


def test_apply_requires_additive_migration_before_dml(snapshot):
    session = PlanSession(migration_ready=False, dry=False)
    with pytest.raises(ValueError, match="Migration 043"):
        asyncio.run(run_database_plan(session, snapshot[0], snapshot[1], apply=True))
    assert not session.committed
    assert not any(sql.startswith(("INSERT", "UPDATE", "DELETE")) for sql, _ in session.statements)
