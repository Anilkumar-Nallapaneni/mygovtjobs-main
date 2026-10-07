#!/usr/bin/env python3
"""Validate normalized LGD records against the immutable official XLSX."""
import argparse
import json
from pathlib import Path

from normalize_lgd_districts import DEFAULT_CSV, DEFAULT_SOURCE, validate_normalized


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV)
    parser.add_argument("--source-file", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--download-date")
    args = parser.parse_args()
    _, metadata, stats = validate_normalized(args.csv, args.source_file, args.download_date)
    print(json.dumps({"status": "PASS", **stats, "sha256": metadata["sha256"],
                      "source_reconciliation": "Every normalized record matches the official XLSX"}, indent=2))


if __name__ == "__main__":
    main()
