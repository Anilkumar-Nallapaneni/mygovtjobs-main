#!/usr/bin/env python3
"""Audit every database row that is live or marked for public publication."""

from __future__ import annotations

import argparse
import asyncio
import csv
import sys
from collections import Counter
from pathlib import Path
from typing import Any

import httpx
from sqlalchemy import text

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.database.session import SessionLocal  # noqa: E402
from app.services.publish_gate import (  # noqa: E402
    AUTO_PUBLISH_MIN_CONFIDENCE,
    ValidationResult,
    validate_job_for_publication,
)
from app.services.job_persist_service import JobPersistService  # noqa: E402
from app.services.job_review_service import JobReviewService  # noqa: E402

DEFAULT_OUTPUT = ROOT / "docs" / "audits" / "live-jobs-audit.csv"
USER_AGENT = "MyGovtJobs-PublicationAudit/1.0 (+https://www.livegovtjobs.com)"


def _detail(row: dict[str, Any]) -> dict[str, Any]:
    return row.get("detail") if isinstance(row.get("detail"), dict) else {}


def source_url_of(row: dict[str, Any]) -> str | None:
    detail = _detail(row)
    value = (
        row.get("source_url")
        or detail.get("source_url")
        or detail.get("notification_url")
        or detail.get("pdf_url")
        or row.get("apply_url")
    )
    return str(value).strip() if value else None


async def probe_url(client: httpx.AsyncClient, url: str | None) -> str:
    if not url:
        return "missing"
    try:
        response = await client.head(url, follow_redirects=True)
        if response.status_code in (403, 405) or response.status_code >= 500:
            response = await client.get(url, follow_redirects=True)
        return str(response.status_code)
    except Exception as exc:
        return f"error:{type(exc).__name__}"


def recommended_action(
    row: dict[str, Any],
    validation: ValidationResult,
    source_status: str,
    apply_status: str,
) -> str:
    if "Past deadline" in validation.errors:
        return "mark_expired"
    if any(
        reason in validation.errors
        for reason in (
            "Source domain is not approved",
            "Document is not classified as recruitment",
            "Tender or procurement notice",
            "Unrelated or low-quality notice",
            "Duplicate record",
        )
    ):
        return "reject"
    broken = any(
        status.startswith("error:") or (status.isdigit() and int(status) >= 400)
        for status in (source_status, apply_status)
        if status != "not_checked"
    )
    if broken or validation.errors:
        return "needs_review"
    if validation.confidence < 75:
        return "quarantine"
    if validation.confidence < AUTO_PUBLISH_MIN_CONFIDENCE:
        return "manual_review"
    if row.get("published_to_site") is not True or str(row.get("status")) != "live":
        return "approve_after_review"
    return "keep_active"


async def load_candidates() -> list[dict[str, Any]]:
    async with SessionLocal() as session:
        result = await session.execute(
            text(
                """
                SELECT id, slug, title, dept, category, state_codes, vacancies,
                       qualification, salary, age_limit, last_date, apply_url,
                       status, published_at, content_hash, title_fingerprint,
                       detail, document_type, verification_status,
                       completeness_score, published_to_site, primary_pdf_url,
                       source_url, source_domain, confidence_score
                FROM jobs
                WHERE status = 'live' OR published_to_site IS TRUE
                ORDER BY published_at DESC NULLS LAST, updated_at DESC NULLS LAST
                """
            )
        )
        return [dict(row) for row in result.mappings().all()]


async def apply_recommendations(
    rows: list[dict[str, Any]],
    audited: list[dict[str, Any]],
    validations: list[ValidationResult],
) -> int:
    changed = 0
    async with SessionLocal() as session:
        for row, audit, validation in zip(rows, audited, validations, strict=True):
            action = audit["recommended_action"]
            if action == "keep_active":
                source_status = str(audit["source_url_status"])
                if source_status.isdigit() and 200 <= int(source_status) < 400:
                    await session.execute(
                        text(
                            """
                            UPDATE jobs
                            SET verified_at = now(),
                                link_last_checked_at = now(),
                                link_last_http_status = :http_status,
                                link_consecutive_failures = 0,
                                updated_at = now()
                            WHERE id = :id
                            """
                        ),
                        {"id": row["id"], "http_status": int(source_status)},
                    )
                continue
            if action == "mark_expired":
                status = "expired"
                verification = "NEEDS_REVIEW"
            elif action == "reject":
                status = "draft"
                verification = "REJECTED"
            else:
                status = "draft"
                verification = "NEEDS_REVIEW"

            await session.execute(
                text(
                    """
                    UPDATE jobs
                    SET status = :status,
                        verification_status = :verification,
                        published_to_site = FALSE,
                        updated_at = now()
                    WHERE id = :id
                    """
                ),
                {"id": row["id"], "status": status, "verification": verification},
            )
            review_validation = ValidationResult(
                valid=False,
                errors=validation.errors or [f"Live audit action: {action}"],
                warnings=[*validation.warnings, f"Link audit: source={audit['source_url_status']}, apply={audit['apply_url_status']}"],
                confidence=validation.confidence,
            )
            await JobReviewService().enqueue(
                session,
                raw_payload=row,
                normalized_payload=row,
                validation=review_validation,
                source_url=source_url_of(row),
                fingerprint=str(row.get("content_hash") or "") or None,
            )
            changed += 1

        if changed:
            await JobPersistService().export_live_jobs_json(session)
        await session.commit()
    return changed


async def run(output: Path, *, check_links: bool, concurrency: int, apply: bool) -> int:
    rows = await load_candidates()
    title_counts = Counter(str(row.get("title_fingerprint") or "") for row in rows)
    semaphore = asyncio.Semaphore(max(1, concurrency))

    async with httpx.AsyncClient(
        timeout=15,
        follow_redirects=True,
        headers={"User-Agent": USER_AGENT},
    ) as client:
        async def audit_one(row: dict[str, Any]) -> tuple[dict[str, Any], ValidationResult]:
            fingerprint = str(row.get("title_fingerprint") or "")
            row["is_duplicate"] = bool(fingerprint and title_counts[fingerprint] > 1)
            source_url = source_url_of(row)
            if check_links:
                async with semaphore:
                    source_status, apply_status = await asyncio.gather(
                        probe_url(client, source_url),
                        probe_url(client, str(row.get("apply_url") or "").strip() or None),
                    )
            else:
                source_status = apply_status = "not_checked"
            validation = validate_job_for_publication(row)
            audit = {
                "job_id": row.get("id"),
                "slug": row.get("slug"),
                "title": row.get("title"),
                "organization": row.get("dept"),
                "closing_date": row.get("last_date"),
                "status": row.get("status"),
                "published_to_site": row.get("published_to_site"),
                "source_url": source_url,
                "source_url_status": source_status,
                "apply_url": row.get("apply_url"),
                "apply_url_status": apply_status,
                "contains_html": "Title contains HTML markup" in validation.errors,
                "is_duplicate": row["is_duplicate"],
                "validation_errors": " | ".join(validation.errors),
                "validation_warnings": " | ".join(validation.warnings),
                "confidence": f"{validation.confidence:.0f}",
                "recommended_action": recommended_action(
                    row, validation, source_status, apply_status
                ),
            }
            return audit, validation

        pairs = await asyncio.gather(*(audit_one(row) for row in rows))
        audited = [pair[0] for pair in pairs]
        validations = [pair[1] for pair in pairs]

    output.parent.mkdir(parents=True, exist_ok=True)
    columns = [
        "job_id", "slug", "title", "organization", "closing_date", "status",
        "published_to_site", "source_url", "source_url_status", "apply_url",
        "apply_url_status", "contains_html", "is_duplicate", "validation_errors",
        "validation_warnings", "confidence", "recommended_action",
    ]
    with output.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=columns)
        writer.writeheader()
        writer.writerows(audited)

    actions = Counter(row["recommended_action"] for row in audited)
    print(f"Audited {len(audited)} live/public candidate(s) -> {output}")
    print("Actions: " + ", ".join(f"{key}={value}" for key, value in sorted(actions.items())))
    if apply:
        changed = await apply_recommendations(rows, audited, validations)
        print(f"Applied {changed} demotion(s); refreshed verification metadata for passing rows.")
        return 0
    return 1 if any(key != "keep_active" for key in actions) else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--skip-links", action="store_true", help="Skip live HTTP probes")
    parser.add_argument("--concurrency", type=int, default=6)
    parser.add_argument("--apply", action="store_true", help="Demote non-passing rows and re-export")
    args = parser.parse_args()
    return asyncio.run(
        run(
            args.output.resolve(),
            check_links=not args.skip_links,
            concurrency=args.concurrency,
            apply=args.apply,
        )
    )


if __name__ == "__main__":
    raise SystemExit(main())
