"""Source-level publication funnel for catalog-growth decisions."""
from __future__ import annotations

import json
from collections import Counter
from pathlib import Path
from typing import Any, Iterable
from urllib.parse import urlparse

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.utils.repo_paths import resolve_repo_path


REJECTION_BUCKETS: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("missing_deadline", ("missing last_date", "missing deadline", "last date")),
    ("missing_pdf", ("missing pdf", "no usable primary pdf", "no positive primary pdf")),
    ("missing_vacancies", ("missing vacancies", "vacancy")),
    ("missing_qualification", ("missing qualification", "qualification")),
    ("missing_official_link", ("missing link", "missing apply", "official link", "non_official_link")),
    ("non_recruitment", ("non-recruitment", "classifier:", "document_type", "tender", "result_archive")),
    ("expired", ("deadline expired", "expired")),
    ("low_quality", ("completeness", "confidence", "unverified", "publish gate")),
)


def rejection_bucket(reasons: Iterable[object]) -> str:
    blob = " ".join(str(reason).lower() for reason in reasons)
    for bucket, needles in REJECTION_BUCKETS:
        if any(needle in blob for needle in needles):
            return bucket
    return "other"


def summarize_rows(rows: Iterable[dict[str, Any]]) -> dict[str, Any]:
    rows = list(rows)
    published = []
    rejected = []
    for row in rows:
        target = published if row.get("status") == "live" and row.get("published_to_site") is True else rejected
        target.append(row)
    reasons = Counter(rejection_bucket(row.get("review_reasons") or []) for row in rejected)
    return {
        "stored": len(rows),
        "published": len(published),
        "rejected_or_draft": len(rejected),
        "vacancies": sum(int(row.get("vacancies") or 0) for row in published),
        "yield_percent": round((len(published) / len(rows) * 100), 2) if rows else 0.0,
        "rejection_reasons": dict(reasons.most_common()),
    }


def _hostname(value: str | None) -> str:
    if not value:
        return ""
    host = (urlparse(value).hostname or "").lower()
    return host.removeprefix("www.")


def _load_priority_sources() -> list[dict[str, Any]]:
    registry = json.loads(resolve_repo_path("scripts", "scraper_registry.json").read_text(encoding="utf-8"))
    priority = json.loads(resolve_repo_path("scripts", "priority-sources.json").read_text(encoding="utf-8"))
    wanted = set(priority["sources"])
    by_code = {str(row.get("code")): row for row in registry.get("scrapers", [])}
    missing = sorted(wanted - by_code.keys())
    if missing:
        raise ValueError(f"Priority source codes missing from registry: {', '.join(missing)}")
    result = []
    for code in priority["sources"]:
        row = by_code[code]
        domains = {
            _hostname(row.get(key))
            for key in ("portal_url", "homepage_url", "recruitment_url", "feed_url")
        }
        result.append({"code": code, "name": row.get("name") or code, "domains": sorted(d for d in domains if d)})
    return result


class SourceFunnelService:
    async def report(self, session: AsyncSession) -> dict[str, Any]:
        job_rows = (await session.execute(text("""
            SELECT source_domain, source_type, detail, status, published_to_site,
                   vacancies, review_reasons
            FROM jobs
        """))).mappings().all()
        health_rows = (await session.execute(text("""
            SELECT source_code, discovered_count, accepted_count, rejected_count,
                   active_job_count, parser_success_rate, health_status, last_error,
                   last_checked_at, last_success_at
            FROM source_health
        """))).mappings().all()
        health = {str(row["source_code"]): dict(row) for row in health_rows}
        output = []
        for source in _load_priority_sources():
            domains = source["domains"]
            matched = [
                dict(row) for row in job_rows
                if str(row.get("source_type") or "").lower() == source["code"]
                or str((row.get("detail") or {}).get("source") or "").lower() == source["code"]
                or any(
                    str(row.get("source_domain") or "").lower().removeprefix("www.") == domain
                    or str(row.get("source_domain") or "").lower().endswith(f".{domain}")
                    for domain in domains
                )
            ]
            output.append({**source, **summarize_rows(matched), "health": health.get(source["code"], {})})
        output.sort(key=lambda item: (item["published"], item["stored"]), reverse=True)
        totals = summarize_rows([dict(row) for row in job_rows])
        return {"priority_source_count": len(output), "totals": totals, "sources": output}
