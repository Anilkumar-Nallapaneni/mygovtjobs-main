#!/usr/bin/env python3
"""Lossless LGD district extraction. Reads OOXML with the Python standard library.

Never saves or edits the source workbook. All normalized rows retain its names,
external identifiers and checksum; state IDs come only from the explicit map.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import posixpath
import re
from datetime import date
from decimal import Decimal, InvalidOperation
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SOURCE = Path("data/india/raw/lgd/2026-10-07/All_Districtof_India_2026-10-07_17-55-02.xlsx")
DEFAULT_CSV = Path("data/india/normalized/lgd-districts.csv")
MAPPING_PATH = Path("data/india/lgd-state-mapping.json")
SHEET_NAME = "allDistrictofIndia"
SOURCE = "Local Government Directory (LGD)"
PROVIDER = "Ministry of Panchayati Raj, Government of India"
SOURCE_URL = "https://lgdirectory.gov.in/"
HEADERS = {
    "State Code": "state_lgd_code",
    "State Name (In English)": "state_name",
    "District Code": "district_lgd_code",
    "District Name(In English)": "district_name",
    "Census 2001 Code": "census_2001_code",
    "Census 2011 Code": "census_2011_code",
}
FIELDS = ["state_id", *HEADERS.values(), "source", "source_provider",
          "source_download_date", "source_filename", "source_sha256", "verified"]
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"


def root_path(path: Path) -> Path:
    return path if path.is_absolute() else ROOT / path


def clean(value: str) -> str:
    return value.lstrip("\ufeff").strip()


def canonical_state_ids() -> set[str]:
    content = (ROOT / "frontend/src/data/states.ts").read_text(encoding="utf-8-sig")
    ids = re.findall(r'\{\s*id:\s*"([a-z]+)"', content)
    ids = [value for value in ids if value != "ne"]
    if len(ids) != 36 or len(set(ids)) != 36:
        raise ValueError("Canonical state master must contain 36 unique States/UTs")
    return set(ids)


def load_state_mapping(path: Path = MAPPING_PATH) -> dict[str, dict]:
    entries = json.loads(root_path(path).read_text(encoding="utf-8-sig"))
    mapping = {}
    ids = set()
    names = set()
    for entry in entries:
        code, name, state_id = (entry[key] for key in ("state_lgd_code", "state_name", "state_id"))
        if not code or not name or code in mapping or state_id in ids or name in names:
            raise ValueError("Empty or duplicate LGD state mapping")
        mapping[code] = entry
        ids.add(state_id)
        names.add(name)
    canonical = canonical_state_ids()
    if ids != canonical:
        raise ValueError(f"State mapping coverage mismatch: missing={sorted(canonical - ids)}, unknown={sorted(ids - canonical)}")
    return mapping


def _integer_code(value: str, numeric: bool) -> str:
    """Decode Excel numeric integers; leave text identifiers (including zeros) intact."""
    if not numeric or not value:
        return value
    try:
        number = Decimal(value)
        if not number.is_finite() or number != number.to_integral_value() or number < 0:
            raise ValueError(f"Invalid numeric LGD/Census code: {value}")
        return str(int(number))
    except InvalidOperation as exc:
        raise ValueError(f"Invalid numeric LGD/Census code: {value}") from exc


def read_lgd_xlsx(path: Path) -> list[dict[str, str]]:
    path = root_path(path)
    with ZipFile(path) as archive:
        workbook = ET.fromstring(archive.read("xl/workbook.xml"))
        sheet = next((item for item in workbook.findall("m:sheets/m:sheet", NS)
                      if item.get("name") == SHEET_NAME), None)
        if sheet is None:
            raise ValueError(f"Missing LGD worksheet: {SHEET_NAME}")
        relationships = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        relation = next((item for item in relationships
                         if item.get("Id") == sheet.get(f"{{{REL_NS}}}id")), None)
        if relation is None or relation.get("TargetMode") == "External":
            raise ValueError("Invalid LGD worksheet relationship")
        target = relation.get("Target", "")
        target = posixpath.normpath(target.lstrip("/") if target.startswith("/") else "xl/" + target)
        if not target.startswith("xl/"):
            raise ValueError("Invalid LGD worksheet path")
        shared = []
        if "xl/sharedStrings.xml" in archive.namelist():
            shared = ["".join(item.itertext()) for item in
                      ET.fromstring(archive.read("xl/sharedStrings.xml")).findall("m:si", NS)]
        document = ET.fromstring(archive.read(target))
        header = None
        records = []
        for xml_row in document.findall("m:sheetData/m:row", NS):
            cells = {}
            for cell in xml_row.findall("m:c", NS):
                column = re.sub(r"\d", "", cell.get("r", ""))
                if cell.find("m:f", NS) is not None:
                    raise ValueError("Formula cells are not authoritative LGD values")
                value = cell.find("m:v", NS)
                raw = value.text or "" if value is not None else ""
                cell_type = cell.get("t", "n")
                if cell_type == "s":
                    raw = shared[int(raw)]
                elif cell_type == "inlineStr":
                    raw = "".join(cell.find("m:is", NS).itertext())
                elif cell_type not in {"n", "str"}:
                    raise ValueError(f"Unsupported LGD cell type: {cell_type}")
                cells[column] = (raw, cell_type == "n")
            if not any(clean(value) for value, _ in cells.values()):
                continue
            if header is None:
                labels = {column: clean(value) for column, (value, _) in cells.items()}
                # A title is not a header. A partial real header fails explicitly.
                if not set(labels.values()) & (set(HEADERS) | {"S.No."}):
                    continue
                missing = (set(HEADERS) | {"S.No."}) - set(labels.values())
                if missing:
                    raise ValueError(f"Missing required XLSX columns: {', '.join(sorted(missing))}")
                if len(labels.values()) != len(set(labels.values())):
                    raise ValueError("Duplicate XLSX header columns")
                header = {column: HEADERS[label] for column, label in labels.items() if label in HEADERS}
                continue
            record = {}
            for column, field in header.items():
                raw, numeric = cells.get(column, ("", False))
                # Preserve source names verbatim; whitespace is only normalized in headers.
                record[field] = _integer_code(raw, numeric) if field.endswith("code") else raw
            records.append(record)
    if header is None or not records:
        raise ValueError("LGD workbook is empty or template/header only")
    return records


def validate_records(records: list[dict], mapping: dict[str, dict]) -> dict:
    if not records:
        raise ValueError("LGD dataset is empty or template/header only")
    codes, districts, slugs, states = set(), set(), set(), set()
    for number, row in enumerate(records, 1):
        for field in ("state_lgd_code", "state_name", "district_lgd_code", "district_name"):
            if not clean(row.get(field, "")):
                raise ValueError(f"Row {number}: empty {field}")
        entry = mapping.get(row["state_lgd_code"])
        if entry is None or entry["state_name"] != row["state_name"]:
            raise ValueError(f"Row {number}: unknown LGD state mapping {row['state_lgd_code']} / {row['state_name']}")
        if "state_id" in row and row["state_id"] != entry["state_id"]:
            raise ValueError(f"Row {number}: invalid canonical state mapping")
        code = row["district_lgd_code"]
        if not code.isascii() or not code.isdigit() or int(code) <= 0:
            raise ValueError(f"Row {number}: invalid LGD district code {code}")
        if code in codes:
            raise ValueError(f"Duplicate LGD district code: {code}")
        district = (entry["state_id"], clean(row["district_name"]).casefold())
        if district in districts:
            raise ValueError(f"Duplicate normalized district: {district}")
        slug = (entry["state_id"], re.sub(r"[^a-z0-9]+", "-", row["district_name"].lower()).strip("-"))
        if not slug[1] or slug in slugs:
            raise ValueError(f"District slug collision: {slug}")
        codes.add(code)
        districts.add(district)
        slugs.add(slug)
        states.add(entry["state_id"])
    if states != canonical_state_ids():
        raise ValueError(f"Incomplete State/UT coverage: missing={sorted(canonical_state_ids() - states)}")
    return {"source_records": len(records), "valid_records": len(records), "rejected_records": 0,
            "unique_district_lgd_codes": len(codes), "state_ut_count": len(states),
            "unknown_states": [], "duplicate_lgd_codes": [], "duplicate_normalized_districts": []}


def normalize_source(path: Path, download_date: str | None = None) -> tuple[list[dict], dict, dict]:
    path = root_path(path)
    download_date = download_date or path.parent.name
    date.fromisoformat(download_date)
    before = hashlib.sha256(path.read_bytes()).hexdigest()
    mapping = load_state_mapping()
    records = read_lgd_xlsx(path)
    stats = validate_records(records, mapping)
    if hashlib.sha256(path.read_bytes()).hexdigest() != before:
        raise ValueError("Source workbook changed while reading")
    metadata = {"provider": PROVIDER, "dataset": "Local Government Directory (LGD) - Districts",
                "download_date": download_date, "source_type": "official LGD XLSX download",
                "source_url": SOURCE_URL, "original_filename": path.name, "sha256": before,
                "record_count": len(records), "state_ut_count": stats["state_ut_count"], "worksheet": SHEET_NAME}
    metadata_path = path.with_suffix(".metadata.json")
    if metadata_path.exists() and json.loads(metadata_path.read_text(encoding="utf-8")) != metadata:
        raise ValueError("Immutable source metadata mismatch")
    rows = [{"state_id": mapping[row["state_lgd_code"]]["state_id"], **row,
             "source": SOURCE, "source_provider": PROVIDER, "source_download_date": download_date,
             "source_filename": path.name, "source_sha256": before, "verified": "true"} for row in records]
    return rows, metadata, stats


def read_normalized_csv(path: Path) -> list[dict]:
    with root_path(path).open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        if not reader.fieldnames:
            raise ValueError("Normalized CSV is empty")
        reader.fieldnames = [clean(field) for field in reader.fieldnames]
        if len(reader.fieldnames) != len(set(reader.fieldnames)):
            raise ValueError("Duplicate normalized CSV columns")
        missing = set(FIELDS) - set(reader.fieldnames)
        if missing:
            raise ValueError(f"Missing required normalized columns: {', '.join(sorted(missing))}")
        rows = list(reader)
    if not rows:
        raise ValueError("Normalized CSV is empty or template/header only")
    if any(None in row or any(value is None for value in row.values()) for row in rows):
        raise ValueError("Malformed normalized CSV row")
    return rows


def validate_normalized(path: Path, source_path: Path, download_date: str | None = None):
    rows = read_normalized_csv(path)
    expected, metadata, _ = normalize_source(source_path, download_date)
    stats = validate_records(rows, load_state_mapping())
    actual_by_code = {row["district_lgd_code"]: {field: row[field] for field in FIELDS} for row in rows}
    expected_by_code = {row["district_lgd_code"]: row for row in expected}
    if actual_by_code != expected_by_code:
        raise ValueError("Normalized CSV differs from authoritative XLSX: fabricated, missing or altered records/provenance")
    return rows, metadata, stats


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-file", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--output", type=Path, default=DEFAULT_CSV)
    parser.add_argument("--download-date")
    args = parser.parse_args()
    rows, metadata, stats = normalize_source(args.source_file, args.download_date)
    source = root_path(args.source_file).resolve()
    output = root_path(args.output).resolve()
    if output == source or (ROOT / "data/india/raw").resolve() in output.parents:
        raise ValueError("Normalized output must not overwrite an immutable raw source")
    changes = {"previous_snapshot": None}
    if output.exists():
        previous = read_normalized_csv(output)
        old = {row["district_lgd_code"] for row in previous}
        new = {row["district_lgd_code"] for row in rows}
        changes = {"previous_record_count": len(previous), "record_count_delta": len(rows) - len(previous),
                   "added_codes": sorted(new - old), "removed_codes": sorted(old - new)}
    metadata_path = source.with_suffix(".metadata.json")
    if metadata_path.exists():
        if json.loads(metadata_path.read_text(encoding="utf-8")) != metadata:
            raise ValueError("Immutable source metadata mismatch")
    else:
        metadata_path.write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(rows)
    validate_normalized(output, args.source_file, args.download_date)
    print(json.dumps({**stats, "sha256": metadata["sha256"], "normalized_csv": str(output),
                      "metadata": str(metadata_path), "snapshot_changes": changes}, indent=2))


if __name__ == "__main__":
    main()
