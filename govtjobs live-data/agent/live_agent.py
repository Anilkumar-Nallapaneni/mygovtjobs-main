"""GovtJobs Live Agent — scrape all India + state official portals, PDFs, vacancies."""

from __future__ import annotations

import asyncio
import json
import logging
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import certifi
import httpx

from .export import write_outputs
from .html_scraper import common_recruitment_paths, extract_job_links
from .pdf_discover import discover_pdfs_on_page
from .rss_scraper import fetch_feed

logger = logging.getLogger(__name__)

ROOT = Path(__file__).resolve().parents[1]
CONFIG_DIR = ROOT / "config"
OUTPUT_DIR = ROOT / "output"

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)

_JUNK_TITLE = re.compile(
    r"^(home\.?aspx|index|welcome|login|register|contact|about|sitemap|gallery)$",
    re.I,
)


class GovtJobsLiveAgent:
    """Collect live government job vacancies from 100+ official India & state portals."""

    def __init__(
        self,
        *,
        output_dir: Path | None = None,
        lookback_days: int = 60,
        concurrency: int = 6,
        discover_pdfs: bool = True,
    ):
        self.output_dir = output_dir or OUTPUT_DIR
        self.lookback_days = lookback_days
        self.concurrency = concurrency
        self.discover_pdfs = discover_pdfs
        self.state_names = json.loads((CONFIG_DIR / "states.json").read_text(encoding="utf-8"))
        self.feeds = json.loads((CONFIG_DIR / "feeds.json").read_text(encoding="utf-8"))
        self.sources = self._load_sources()

    def _load_sources(self) -> list[dict[str, Any]]:
        path = CONFIG_DIR / "sources.json"
        if not path.exists():
            from .sync_sources import sync_sources

            sync_sources()
        payload = json.loads(path.read_text(encoding="utf-8"))
        return payload.get("sources") or []

    async def run(
        self,
        *,
        state_filter: str | None = None,
        source_limit: int | None = None,
        skip_pdf_enrich: bool = False,
    ) -> dict[str, Any]:
        started = datetime.now(timezone.utc)
        sources = self.sources
        if state_filter:
            sf = state_filter.lower()
            sources = [s for s in sources if s.get("state") == sf or s.get("state") == "all"]
        if source_limit:
            sources = sources[:source_limit]

        sem = asyncio.Semaphore(self.concurrency)
        websites: list[dict[str, Any]] = []
        jobs: list[dict[str, Any]] = []
        source_results: list[dict[str, Any]] = []

        limits = httpx.Limits(max_connections=20, max_keepalive_connections=10)
        timeout = httpx.Timeout(30.0, connect=15.0)
        headers = {"User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"}

        async with httpx.AsyncClient(
            limits=limits, timeout=timeout, headers=headers, verify=certifi.where()
        ) as client:

            async def process_source(source: dict[str, Any]) -> None:
                async with sem:
                    result = await self._scrape_source(client, source, skip_pdf_enrich=skip_pdf_enrich)
                    source_results.append(result)
                    websites.append(result["website"])
                    jobs.extend(result["jobs"])

            await asyncio.gather(*(process_source(s) for s in sources))

        # Dedupe by link
        seen: set[str] = set()
        unique_jobs: list[dict[str, Any]] = []
        for job in jobs:
            key = (job.get("link") or job.get("title") or "").lower()
            if not key or key in seen:
                continue
            seen.add(key)
            unique_jobs.append(job)

        finished = datetime.now(timezone.utc)
        run_log = {
            "startedAt": started.isoformat().replace("+00:00", "Z"),
            "finishedAt": finished.isoformat().replace("+00:00", "Z"),
            "durationSeconds": round((finished - started).total_seconds(), 1),
            "sourcesScraped": len(sources),
            "sourcesOk": sum(1 for r in source_results if r.get("status") == "ok"),
            "sourcesFailed": sum(1 for r in source_results if r.get("status") == "error"),
            "totalJobs": len(unique_jobs),
            "totalPdfs": sum(len(j.get("pdfUrls") or []) for j in unique_jobs),
            "sourceResults": source_results,
        }

        paths = write_outputs(
            self.output_dir,
            websites=websites,
            jobs=unique_jobs,
            run_log=run_log,
            state_names=self.state_names,
        )

        logger.info(
            "Done: %s jobs, %s PDFs from %s sources → %s",
            len(unique_jobs),
            run_log["totalPdfs"],
            len(sources),
            self.output_dir,
        )
        return {"run_log": run_log, "paths": {k: str(v) for k, v in paths.items()}}

    async def _scrape_source(
        self,
        client: httpx.AsyncClient,
        source: dict[str, Any],
        *,
        skip_pdf_enrich: bool,
    ) -> dict[str, Any]:
        code = source.get("code", "unknown")
        state = source.get("state") or "all"
        state_name = self.state_names.get(state, state)
        name = source.get("name") or code
        module = source.get("module")
        max_items = int(source.get("maxItems") or 50)

        website = {
            "code": code,
            "name": name,
            "state": state,
            "stateName": state_name,
            "category": source.get("category"),
            "module": module,
            "portalUrl": source.get("portal_url"),
            "feedUrl": source.get("feed_url"),
            "status": "pending",
            "jobCount": 0,
            "pdfCount": 0,
            "scrapedAt": None,
            "error": None,
        }

        raw_rows: list[dict[str, Any]] = []
        try:
            if module == "rss_feed":
                feed_id = source.get("feed_id")
                feed = self.feeds.get(feed_id) or {}
                feed_url = source.get("feed_url") or feed.get("feedUrl")
                if not feed_url:
                    raise ValueError(f"No feed URL for {code}")
                raw_rows = await fetch_feed(
                    client,
                    feed_url,
                    max_items=max_items,
                    lookback_days=self.lookback_days,
                )
                website["feedUrl"] = feed_url
            else:
                portal_url = source.get("portal_url")
                if not portal_url:
                    raise ValueError(f"No portal URL for {code}")
                raw_rows = await self._scrape_html_portal(client, portal_url, max_items=max_items)
                website["portalUrl"] = portal_url

            jobs: list[dict[str, Any]] = []
            for row in raw_rows:
                title = (row.get("title") or "").strip()
                if _JUNK_TITLE.match(title) or len(title) < 8:
                    continue
                link = row.get("link") or ""
                pdf_urls = list(row.get("pdfUrls") or [])
                if self.discover_pdfs and not skip_pdf_enrich and link and len(pdf_urls) < 3:
                    extra = await discover_pdfs_on_page(client, link)
                    pdf_urls = list(dict.fromkeys([*pdf_urls, *extra]))

                jobs.append(
                    {
                        "id": self._job_id(code, link, title),
                        "title": title or "Official notification",
                        "link": link,
                        "source": code,
                        "sourceName": name,
                        "state": state,
                        "stateName": state_name,
                        "category": source.get("category"),
                        "published": row.get("published"),
                        "summary": row.get("summary"),
                        "pdfUrls": pdf_urls,
                        "status": "live",
                        "scrapedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
                    }
                )

            website["status"] = "ok"
            website["jobCount"] = len(jobs)
            website["pdfCount"] = sum(len(j.get("pdfUrls") or []) for j in jobs)
            website["scrapedAt"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

            return {"status": "ok", "website": website, "jobs": jobs, "source": code}

        except Exception as exc:
            logger.warning("Source %s failed: %s", code, exc)
            website["status"] = "error"
            website["error"] = str(exc)
            website["scrapedAt"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
            return {"status": "error", "website": website, "jobs": [], "source": code, "error": str(exc)}

    async def _scrape_html_portal(
        self,
        client: httpx.AsyncClient,
        portal_url: str,
        *,
        max_items: int,
    ) -> list[dict[str, Any]]:
        urls_to_try = [portal_url, *common_recruitment_paths(portal_url)]
        seen_urls: set[str] = set()
        all_rows: list[dict[str, Any]] = []

        for url in urls_to_try:
            if url in seen_urls:
                continue
            seen_urls.add(url)
            try:
                resp = await client.get(url, follow_redirects=True)
                if resp.status_code >= 400:
                    continue
                rows = extract_job_links(resp.text, str(resp.url), max_items=max_items, relaxed=True)
                all_rows.extend(rows)
                if len(all_rows) >= max_items:
                    break
            except Exception:
                continue

        deduped: dict[str, dict] = {}
        for row in all_rows:
            link = row.get("link") or ""
            if link and link not in deduped:
                deduped[link] = row
        return list(deduped.values())[:max_items]

    @staticmethod
    def _job_id(source: str, link: str, title: str) -> str:
        base = re.sub(r"[^a-z0-9]+", "-", (title or "job").lower()).strip("-")[:40]
        tail = abs(hash(f"{source}:{link}")) % 10_000_000
        return f"{source}-{base}-{tail}"
