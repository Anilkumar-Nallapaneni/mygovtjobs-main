import asyncio
import json
import logging
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import select, text

from app.config import get_settings
from app.database.session import SessionLocal
from app.models.job import Source
from app.parsers.notification_parser import NotificationParser
from app.parsers.pdf_enrich import merge_pdf_fields
from app.scrapers.pdf_discover import ensure_pdf_urls
from app.scrapers.rss_feed import RssFeedScraper
from app.services.dedupe_service import content_hash
from app.services.document_classifier import classify_document
from app.services.job_persist_service import JobPersistService, _resolve_state_codes
from app.services.pdf_candidate import select_primary_pdf
from app.services.raw_ingest_service import RawIngestService
from app.services.source_sync_service import SourceSyncService
from app.services.validation_service import ValidationService

logger = logging.getLogger(__name__)


class UnsupportedScraperError(ValueError):
    """Registry entry has no supported scraper module — do not invent RSS."""


def _resolve_registry_path() -> Path:
    """Monorepo dev (repo/scripts) and Docker (/app/scripts)."""
    here = Path(__file__).resolve()
    for base in (here.parents[2], here.parents[3]):
        candidate = base / "scripts" / "scraper_registry.json"
        if candidate.is_file():
            return candidate
    return here.parents[3] / "scripts" / "scraper_registry.json"


REGISTRY_PATH = _resolve_registry_path()


class IngestAgent:
    """Runs scraper → parser → validation → dedupe → persist pipeline."""

    def __init__(self):
        self.parser = NotificationParser()
        self.validator = ValidationService()
        self.registry = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
        self.persist = JobPersistService()
        self.source_sync = SourceSyncService()
        self.raw_ingest = RawIngestService()

    async def run_source(self, source_code: str) -> dict:
        entry = next((s for s in self.registry.get("scrapers", []) if s.get("code") == source_code), None)
        if not entry or not entry.get("enabled"):
            return {"source": source_code, "fetched": 0, "saved": 0, "skipped": True}

        try:
            scraper = self._scraper_for(entry)
        except UnsupportedScraperError as exc:
            logger.error("unsupported scraper: %s", exc)
            return {
                "source": source_code,
                "fetched": 0,
                "saved": 0,
                "rejected": 0,
                "errors": 1,
                "error": str(exc),
            }
        rows = await scraper.fetch()
        saved = 0
        errors = 0
        rejected = 0
        rejection_reasons: Counter[str] = Counter()
        db_error: str | None = None

        try:
            async with SessionLocal() as session:
                await session.execute(text("SELECT 1"))
                source_id = None
                try:
                    source_id = await self.source_sync.ensure_source(session, entry)
                except Exception as exc:
                    await session.rollback()
                    logger.warning("source metadata skipped source=%s: %s", source_code, exc)

                for raw in rows:
                    try:
                        if source_id:
                            await self.raw_ingest.upsert_raw(session, source_id=source_id, raw=raw)
                        normalized = await self._normalize_raw(
                            raw, entry, source_code, rejection_reasons=rejection_reasons
                        )
                        if normalized is None:
                            rejected += 1
                            continue

                        digest = content_hash(
                            title=normalized.get("title", ""),
                            apply_url=normalized.get("apply_url"),
                            last_date=str(normalized.get("last_date") or ""),
                        )
                        normalized["content_hash"] = digest
                        job = await self.persist.upsert_normalized(session, normalized, commit=False)
                        if job:
                            saved += 1
                            if saved % 100 == 0:
                                await session.commit()
                        else:
                            rejected += 1
                            rejection_reasons["persist_rejected"] += 1
                    except Exception as exc:
                        errors += 1
                        rejection_reasons[f"error:{type(exc).__name__}"] += 1
                        await session.rollback()
                        logger.warning("ingest row failed source=%s: %s", source_code, exc)

                if saved:
                    await session.commit()
                if not get_settings().ingest_skip_per_source_export:
                    try:
                        await self.persist.export_live_jobs_json(session)
                    except Exception as exc:
                        await session.rollback()
                        logger.warning("live jobs json export failed: %s", exc)
                        try:
                            async with SessionLocal() as export_session:
                                await self.persist.export_live_jobs_json(export_session)
                        except Exception as exc2:
                            logger.warning("live jobs json export retry failed: %s", exc2)

                if source_id:
                    await self._record_source_run(
                        session,
                        source_code,
                        fetched=len(rows),
                        accepted=saved,
                        rejected=rejected,
                        error=None if saved else "no rows saved",
                    )
        except Exception as exc:
            db_error = str(exc)
            logger.warning("database unavailable for source=%s: %s", source_code, exc)
            if get_settings().allow_fallback_json_export:
                self._export_fallback_json(rows, entry, source_code)
            else:
                logger.error("fallback JSON export disabled (set ALLOW_FALLBACK_JSON_EXPORT=1 to enable in dev)")

        if rows and saved == 0 and not db_error and get_settings().allow_fallback_json_export:
            self._export_fallback_json(rows, entry, source_code)

        return {
            "source": source_code,
            "fetched": len(rows),
            "saved": saved,
            "rejected": rejected,
            "errors": errors,
            "rejection_reasons": dict(rejection_reasons.most_common()),
            "db_error": db_error,
        }

    async def _normalize_raw(
        self,
        raw: dict,
        entry: dict,
        source_code: str,
        *,
        rejection_reasons: Counter[str] | None = None,
    ) -> dict | None:
        raw = {**raw, "source": source_code}
        if entry.get("sourceName"):
            raw["sourceName"] = entry["sourceName"]

        title = str(raw.get("title") or "")
        body = str(raw.get("summary") or raw.get("description") or "")
        link = str(raw.get("link") or raw.get("applyUrl") or "")
        classification = classify_document(title, body, url=link, dept=str(entry.get("sourceName") or ""))

        # Gate before PDF discovery/parse — non-recruitment never enters PDF pipeline.
        if classification.content_type != "RECRUITMENT":
            logger.info(
                "ingest classified non-recruitment source=%s type=%s title=%r reasons=%s",
                source_code,
                classification.content_type,
                title[:80],
                classification.reasons[:5],
            )
            # Persist as reviewable draft when confidence says possible recruitment.
            if classification.content_type not in ("POSSIBLE_RECRUITMENT",):
                if rejection_reasons is not None:
                    rejection_reasons[f"classification:{classification.content_type.lower()}"] += 1
                return None
            # Weak signal: continue without PDF enrichment; mark for review.
            apply_link = raw.get("link") or raw.get("applyUrl")
            normalized = self.parser.parse(raw, pdf_fields={}, source_code=source_code)
            normalized["category"] = normalized.get("category") or entry.get("category")
            normalized["document_type"] = classification.document_type
            normalized["verification_status"] = "NEEDS_REVIEW"
            normalized["review_reasons"] = classification.reasons
            st = entry.get("state")
            if st and str(st).lower() not in ("all", "all india"):
                normalized["state"] = str(st).lower()[:8]
            else:
                normalized["state"] = "All India"
            normalized["state_codes"] = _resolve_state_codes(normalized)
            valid, reasons = self.validator.validate(normalized)
            if not valid:
                if rejection_reasons is not None:
                    rejection_reasons.update(reasons or ["validation_failed"])
                return None
            return normalized

        apply_link = raw.get("link") or raw.get("applyUrl")
        pdf_urls = await ensure_pdf_urls(raw.get("pdfUrls") or raw.get("pdf_urls") or [], apply_link)
        primary, score, _ = select_primary_pdf(pdf_urls, min_score=0)
        if primary and score >= 0:
            # Prefer primary notification PDF first for enrichment.
            pdf_urls = [primary] + [u for u in pdf_urls if u != primary]
        elif pdf_urls and score < 0:
            logger.info(
                "ingest PDF candidates look non-recruitment source=%s score=%s title=%r",
                source_code,
                score,
                title[:80],
            )
            pdf_urls = []
        raw["pdfUrls"] = pdf_urls

        pdf_fields: dict = {}
        if pdf_urls:
            try:
                pdf_fields = await asyncio.wait_for(merge_pdf_fields(pdf_urls[:2]), timeout=45)
            except asyncio.TimeoutError:
                logger.warning(
                    "ingest PDF enrich timeout source=%s title=%r",
                    source_code,
                    title[:80],
                )
                pdf_fields = {}

        normalized = self.parser.parse(raw, pdf_fields=pdf_fields, source_code=source_code)
        normalized["category"] = normalized.get("category") or entry.get("category")
        normalized["document_type"] = "RECRUITMENT"
        normalized["review_reasons"] = classification.reasons
        if primary:
            detail = dict(normalized.get("detail") or {})
            detail["primary_pdf_url"] = primary
            detail["pdf_url"] = detail.get("pdf_url") or primary
            normalized["detail"] = detail

        st = entry.get("state")
        if st and str(st).lower() not in ("all", "all india"):
            normalized["state"] = str(st).lower()[:8]
        else:
            normalized["state"] = "All India"
        normalized["state_codes"] = _resolve_state_codes(normalized)

        valid, reasons = self.validator.validate(normalized)
        if not valid:
            if rejection_reasons is not None:
                rejection_reasons.update(reasons or ["validation_failed"])
            logger.info(
                "ingest rejected source=%s title=%r reasons=%s",
                source_code,
                normalized.get("title"),
                reasons,
            )
            return None
        return normalized

    async def run_all_enabled(self) -> list[dict]:
        async with SessionLocal() as session:
            try:
                n = await self.source_sync.sync_registry(session)
                logger.info("synced %s sources to Supabase", n)
            except Exception as exc:
                logger.warning("source registry sync failed: %s", exc)

        enabled = [e for e in self.registry.get("scrapers", []) if e.get("enabled")]
        concurrency = max(1, get_settings().ingest_concurrency)
        sem = asyncio.Semaphore(concurrency)

        async def _run_one(entry: dict) -> dict:
            code = entry.get("code", "unknown")
            async with sem:
                try:
                    return await self.run_source(code)
                except Exception as exc:
                    logger.exception("ingest source %s failed: %s", code, exc)
                    return {"source": code, "fetched": 0, "saved": 0, "errors": 1, "error": str(exc)}

        return list(await asyncio.gather(*(_run_one(e) for e in enabled)))

    async def _record_source_run(
        self,
        session,
        source_code: str,
        *,
        fetched: int = 0,
        accepted: int = 0,
        rejected: int = 0,
        error: str | None,
    ) -> None:
        now = datetime.now(timezone.utc)
        owns = session is None
        if owns:
            session = SessionLocal()
        try:
            row = (await session.execute(select(Source).where(Source.code == source_code))).scalar_one_or_none()
            if row:
                row.last_run_at = now
                row.last_error = error
            await session.execute(
                text(
                    """
                    INSERT INTO source_health (
                      source_code, homepage_url, last_checked_at, discovered_count,
                      accepted_count, rejected_count, parser_success_rate,
                      last_success_at, last_notification_found_at, health_status,
                      last_error, updated_at
                    ) VALUES (
                      :code, :homepage, :now, :fetched, :accepted, :rejected, :rate,
                      :success_at, :notification_at, :health, :error, :now
                    )
                    ON CONFLICT (source_code) DO UPDATE SET
                      last_checked_at = EXCLUDED.last_checked_at,
                      discovered_count = EXCLUDED.discovered_count,
                      accepted_count = EXCLUDED.accepted_count,
                      rejected_count = EXCLUDED.rejected_count,
                      parser_success_rate = EXCLUDED.parser_success_rate,
                      last_success_at = COALESCE(EXCLUDED.last_success_at, source_health.last_success_at),
                      last_notification_found_at = COALESCE(
                        EXCLUDED.last_notification_found_at, source_health.last_notification_found_at
                      ),
                      health_status = EXCLUDED.health_status,
                      last_error = EXCLUDED.last_error,
                      updated_at = EXCLUDED.updated_at
                    """
                ),
                {
                    "code": source_code,
                    "homepage": "",
                    "now": now,
                    "fetched": fetched,
                    "accepted": accepted,
                    "rejected": rejected,
                    "rate": round(accepted / fetched * 100, 2) if fetched else 0,
                    "success_at": now if accepted else None,
                    "notification_at": now if fetched else None,
                    "health": "HEALTHY" if accepted else ("DEGRADED" if fetched else "BROKEN"),
                    "error": error,
                },
            )
            await session.commit()
        except Exception as exc:
            logger.debug("source run timestamp not updated for %s: %s", source_code, exc)
        finally:
            if owns:
                await session.close()

    def _scraper_for(self, entry: dict):
        settings = get_settings()
        lookback = int(entry.get("lookbackDays") or settings.ingest_lookback_days)
        max_items = int(entry.get("maxItems") or settings.ingest_max_items_per_source)
        module = entry.get("module")
        code = entry.get("code", "unknown")

        if module == "rss_feed":
            return RssFeedScraper(
                feed_id=entry.get("feed_id"),
                lookback_days=lookback,
                max_items=max_items,
            )

        if module == "ssc_api":
            from app.scrapers.ssc_api import SscApiScraper

            return SscApiScraper(
                max_items=max_items,
                lookback_days=lookback,
                content_type=str(entry.get("contentType") or "notice-boards"),
            )

        if module == "state_portal_html":
            from app.scrapers.state_portal_html import StatePortalHtmlScraper

            return StatePortalHtmlScraper(
                entry.get("portal_url", ""),
                entry.get("state", ""),
                max_items=max_items,
                lookback_days=lookback,
                skip_common_paths=bool(entry.get("skipCommonPaths")),
            )

        raise UnsupportedScraperError(
            f"No supported scraper for {code} (module={module!r}); "
            "refusing silent RSS fallback"
        )

    def _export_fallback_json(self, rows: list, entry: dict, source_code: str) -> None:
        """Write validated rows only — never publish unvalidated scrape output."""
        items = []
        for raw in rows:
            try:
                raw_copy = {**raw, "source": source_code}
                if entry.get("sourceName"):
                    raw_copy["sourceName"] = entry["sourceName"]
                normalized = self.parser.parse(raw_copy, source_code=source_code)
                normalized["category"] = normalized.get("category") or entry.get("category")
                st = entry.get("state")
                if st and str(st).lower() not in ("all", "all india"):
                    normalized["state"] = str(st).lower()[:8]
                else:
                    normalized["state"] = "All India"
                normalized["state_codes"] = _resolve_state_codes(normalized)

                valid, reasons = self.validator.validate(normalized)
                if not valid:
                    logger.info(
                        "fallback export skipped source=%s title=%r reasons=%s",
                        source_code,
                        normalized.get("title"),
                        reasons,
                    )
                    continue

                from datetime import date

                digest = content_hash(
                    title=normalized.get("title", ""),
                    apply_url=normalized.get("apply_url"),
                    last_date=str(normalized.get("last_date") or ""),
                )
                last = normalized.get("last_date")
                if last and str(last) < date.today().isoformat():
                    row_status = "expired"
                else:
                    # Never auto-publish via fallback JSON — review queue only.
                    row_status = "draft"

                items.append(
                    {
                        "slug": f"{(normalized.get('title') or 'job')[:48].lower().replace(' ', '-')}-{digest[:8]}",
                        "title": normalized.get("title"),
                        "dept": normalized.get("dept"),
                        "category": normalized.get("category"),
                        "apply_url": normalized.get("apply_url"),
                        "state_codes": normalized.get("state_codes") or [],
                        "vacancies": int(normalized.get("vacancies") or 0) or None,
                        "last_date": normalized.get("last_date"),
                        "status": row_status,
                        "published_to_site": False,
                        "verification_status": "NEEDS_REVIEW",
                        "detail": {
                            "source": source_code,
                            "fallback": True,
                            "pdfUrls": normalized.get("pdf_urls") or raw_copy.get("pdfUrls") or [],
                        },
                    }
                )
            except Exception as exc:
                logger.debug("fallback export row skipped: %s", exc)

        if not items:
            logger.warning("fallback export produced no validated items for source=%s", source_code)
            return

        path = Path(get_settings().live_jobs_json_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        existing: list[dict] = []
        if path.exists():
            try:
                payload = json.loads(path.read_text(encoding="utf-8"))
                existing = [row for row in payload.get("items", []) if isinstance(row, dict)]
            except Exception as exc:
                logger.warning("fallback export could not read existing JSON: %s", exc)

        merged: dict[str, dict] = {}
        for row in [*existing, *items]:
            key = str(row.get("slug") or row.get("apply_url") or row.get("title") or "").lower()
            if key:
                merged[key] = row

        path.write_text(
            json.dumps(
                {
                    "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
                    "items": list(merged.values()),
                },
                indent=2,
            ),
            encoding="utf-8",
        )
