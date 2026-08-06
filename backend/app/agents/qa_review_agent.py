"""QA Review Agent — AI “employee” that verifies vacancy, dates, PDF, state, title.

Uses deterministic extractors as source of truth. Optional LLM assist only when
OPENAI_API_KEY / AI_REVIEW_API_KEY is set, and never invents values missing from text.
"""

from __future__ import annotations

import json
import logging
import re
from dataclasses import asdict, dataclass, field
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import select, update

from app.database.session import SessionLocal
from app.models.job import Job
from app.parsers.pdf_dates import extract_dates_from_text, prefer_apply_date, to_iso_date
from app.services.document_classifier import classify_document_type
from app.services.job_completeness_service import calculate_completeness
from app.services.llm_qa_assist import llm_assist_enabled, suggest_job_fields
from app.services.noise_filter import clean_job_title, sanitize_source_text_fields
from app.services.publish_gate import india_today, validate_job_for_publication
from app.utils.state_resolve import (
    STATE_BUCKETS,
    job_matches_bucket,
    normalize_state_codes,
    resolve_state_codes,
)
from app.utils.vacancy_extract import is_non_vacancy_document, resolve_vacancies, sanitize_vacancies

logger = logging.getLogger(__name__)

QA_APPROVE_MIN_CONFIDENCE = 80.0
PROMOTE_MIN_CONFIDENCE = 85.0

_CAMEL_SPLIT = re.compile(r"(?<=[a-z])(?=[A-Z])|(?<=[A-Z]{2})(?=[A-Z][a-z])")
_GLUE_WORD = re.compile(
    r"(?i)\b(pnb|ubi|bpcl|nic|sbi|rrb|isro|upsc|ssc|ibps|nhm|icar|iit|iiser|"
    r"bobcaps|cmho|mha|dfpd|csir)\s*(recruitment|notification|advt|advertisement)\b"
)


def _repo_root() -> Path:
    here = Path(__file__).resolve()
    for base in (here.parents[2], here.parents[3]):
        if (base / "frontend" / "public" / "data").is_dir():
            return base
    return here.parents[3]


def _as_date(value: Any) -> date | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    iso = to_iso_date(value)
    if not iso:
        return None
    try:
        return date.fromisoformat(str(iso)[:10])
    except ValueError:
        return None


def improve_title(title: str | None) -> str:
    """Fix glued titles like PNBRecruitment → PNB Recruitment."""
    t = clean_job_title(title)
    if not t:
        return ""
    t = _CAMEL_SPLIT.sub(" ", t)
    t = _GLUE_WORD.sub(lambda m: f"{m.group(1).upper()} {m.group(2).capitalize()}", t)
    t = re.sub(r"\s+", " ", t).strip(" .-–—")
    return t


def _load_static_summary(slug: str | None) -> str:
    if not slug:
        return ""
    path = _repo_root() / "frontend" / "public" / "data" / "job-details" / f"{slug}.json"
    if not path.is_file():
        return ""
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return ""
    parts: list[str] = []
    summary = str(data.get("summary") or "").strip()
    if summary:
        parts.append(summary)
    for section in data.get("content_sections") or []:
        if not isinstance(section, dict):
            continue
        for p in section.get("paragraphs") or []:
            if p:
                parts.append(str(p))
        for row in section.get("lists") or []:
            if isinstance(row, list):
                parts.extend(str(x) for x in row if x)
            elif row:
                parts.append(str(row))
    return "\n".join(parts)[:20000]


def _context_for_job(job: Job, detail: dict[str, Any]) -> str:
    chunks = [
        str(job.title or ""),
        str(job.dept or ""),
        str(detail.get("summary") or ""),
        _load_static_summary(job.slug),
    ]
    return "\n".join(c for c in chunks if c).strip()


@dataclass
class QADecision:
    slug: str
    title: str
    decision: str  # approve | needs_fix | reject | skip
    confidence: float
    reasons: list[str] = field(default_factory=list)
    patches: dict[str, Any] = field(default_factory=dict)
    bucket: str = "all"


class QaReviewAgent:
    """State-wise AI employee: verify and patch job quality fields."""

    def __init__(self, *, use_llm: bool | None = None):
        self.use_llm = llm_assist_enabled() if use_llm is None else use_llm

    async def run(
        self,
        *,
        limit: int = 0,
        apply: bool = False,
        bucket: str = "all",
        states: list[str] | None = None,
        include_live: bool = True,
        include_draft: bool = True,
        status_filter: list[str] | None = None,
    ) -> dict[str, Any]:
        today = india_today()
        report: dict[str, Any] = {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "apply": apply,
            "bucket": bucket,
            "llm": bool(self.use_llm),
            "scanned": 0,
            "approved": [],
            "needs_fix": [],
            "rejected": [],
            "skipped": [],
            "rowsUpdated": 0,
        }

        statuses = status_filter or []
        if not statuses:
            if include_draft:
                statuses.extend(["draft", "pending", "expired"])
            if include_live:
                statuses.append("live")
        statuses = sorted(set(statuses))

        state_filter = normalize_state_codes(states) if states else []

        async with SessionLocal() as session:
            rows = (
                await session.execute(select(Job).where(Job.status.in_(statuses)))
            ).scalars().all()

            for job in rows:
                detail = sanitize_source_text_fields(job.detail if isinstance(job.detail, dict) else {})
                resolved_states = resolve_state_codes(
                    state_codes=job.state_codes,
                    title=job.title or "",
                    dept=job.dept or "",
                    source=str(detail.get("source") or job.source_type or ""),
                    apply_url=job.apply_url or "",
                    source_url=job.source_url or "",
                    primary_pdf_url=job.primary_pdf_url or "",
                    notification_url=str(detail.get("notification_url") or ""),
                )
                if state_filter and not (set(resolved_states) & set(state_filter)):
                    # Also allow all-india when filtering? No — explicit states only.
                    if resolved_states or "all-india" not in state_filter:
                        continue
                if not job_matches_bucket(resolved_states, bucket):
                    continue

                decision = self._review_one(job, detail, resolved_states, today=today)
                report["scanned"] += 1
                bucket_key = {
                    "approve": "approved",
                    "needs_fix": "needs_fix",
                    "reject": "rejected",
                    "skip": "skipped",
                }.get(decision.decision, "skipped")
                entry = {
                    "id": str(job.id),
                    "slug": decision.slug,
                    "title": decision.title[:120],
                    "status": job.status,
                    "confidence": decision.confidence,
                    "reasons": decision.reasons[:8],
                    "patches": decision.patches,
                    "bucket": decision.bucket,
                }
                report[bucket_key].append(entry)

                if apply and decision.decision in ("approve", "needs_fix") and decision.patches:
                    values = self._patches_to_values(job, detail, decision)
                    if values:
                        await session.execute(update(Job).where(Job.id == job.id).values(**values))
                        report["rowsUpdated"] += 1

            if apply:
                await session.commit()

        out = _repo_root() / "scripts" / "qa-review-report.json"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(report, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
        report["reportPath"] = str(out)
        logger.info(
            "QaReviewAgent scanned=%s approved=%s needs_fix=%s rejected=%s updated=%s apply=%s",
            report["scanned"],
            len(report["approved"]),
            len(report["needs_fix"]),
            len(report["rejected"]),
            report["rowsUpdated"],
            apply,
        )
        if limit > 0:
            for key in ("approved", "needs_fix", "rejected", "skipped"):
                report[key] = report[key][:limit]
        return report

    def _review_one(
        self,
        job: Job,
        detail: dict[str, Any],
        resolved_states: list[str],
        *,
        today: date,
    ) -> QADecision:
        title = improve_title(job.title)
        context = _context_for_job(job, detail)
        pdf_url = (
            job.primary_pdf_url
            or detail.get("pdf_url")
            or detail.get("primary_pdf_url")
            or (detail.get("pdf_urls") or [None])[0]
        )
        pdf_url = str(pdf_url or "").strip() or None

        if is_non_vacancy_document(title=title, context=context):
            return QADecision(
                slug=job.slug or "",
                title=title,
                decision="reject",
                confidence=95.0,
                reasons=["Non-recruitment document (result/admit/tender/noise)"],
                bucket=self._bucket_for(resolved_states),
            )

        vacancies = resolve_vacancies(job.vacancies, title=title, context=context)
        vacancies = sanitize_vacancies(vacancies, title=title, context=context)

        extracted = extract_dates_from_text(context)
        last_iso = prefer_apply_date(
            to_iso_date(job.last_date),
            extracted.get("last_date"),
            today=today,
        )
        pub_iso = extracted.get("published_date") or to_iso_date(job.published_at)

        patches: dict[str, Any] = {}
        reasons: list[str] = []

        if title and title != (job.title or "").strip():
            patches["title"] = title
            reasons.append("cleaned title")

        if vacancies and vacancies != (job.vacancies or 0):
            patches["vacancies"] = vacancies
            reasons.append(f"vacancies → {vacancies}")

        if last_iso:
            current_last = to_iso_date(job.last_date)
            if last_iso != current_last:
                patches["last_date"] = last_iso
                reasons.append(f"last_date → {last_iso}")

        if pub_iso and to_iso_date(job.published_at) != pub_iso:
            patches["published_at"] = pub_iso
            reasons.append(f"published_at → {pub_iso}")

        if resolved_states and normalize_state_codes(job.state_codes) != resolved_states:
            patches["state_codes"] = resolved_states
            reasons.append(f"state_codes → {resolved_states}")

        if pdf_url and not job.primary_pdf_url:
            patches["primary_pdf_url"] = pdf_url
            reasons.append("set primary_pdf_url")
            detail = {**detail, "pdf_url": pdf_url}
            patches["detail"] = detail

        if self.use_llm:
            suggestion = suggest_job_fields(
                title=title,
                context=context,
                current={
                    "vacancies": vacancies or job.vacancies,
                    "last_date": last_iso or to_iso_date(job.last_date),
                    "state_codes": resolved_states,
                    "title": title,
                },
            )
            if suggestion:
                self._merge_llm_suggestion(patches, reasons, suggestion, context=context, title=title)

        # Build validation payload after patches
        eff_title = patches.get("title", title)
        eff_vac = patches.get("vacancies", vacancies or job.vacancies or 0)
        eff_last = patches.get("last_date") or to_iso_date(job.last_date)
        eff_pdf = patches.get("primary_pdf_url") or pdf_url
        eff_states = patches.get("state_codes") or resolved_states

        doc_type = (job.document_type or "").upper() or classify_document_type(
            title=eff_title, url=job.apply_url or job.source_url or "", text=context, dept=job.dept or ""
        )
        payload = {
            "title": eff_title,
            "dept": job.dept,
            "department": job.dept,
            "organization": job.dept,
            "apply_url": job.apply_url,
            "source_url": job.source_url,
            "notification_url": detail.get("notification_url") or eff_pdf,
            "document_type": "RECRUITMENT" if doc_type in ("RECRUITMENT", "UNKNOWN") else doc_type,
            "verification_status": "VERIFIED",
            "published_at": patches.get("published_at") or job.published_at,
            "last_date": eff_last,
            "vacancies": eff_vac,
            "qualification": job.qualification,
            "salary": job.salary,
            "age_limit": job.age_limit,
            "detail": patches.get("detail") or detail,
            "pdf_urls": ([eff_pdf] if eff_pdf else []) or detail.get("pdf_urls") or [],
            "state": (eff_states[0] if eff_states else "India"),
            "location": (eff_states[0] if eff_states else "India"),
        }
        score, _missing = calculate_completeness(payload)
        payload["completeness_score"] = score
        validation = validate_job_for_publication(payload, today=today)

        confidence = float(validation.confidence)
        if eff_vac and int(eff_vac) > 0:
            confidence = min(100.0, confidence + 3)
        if eff_pdf:
            confidence = min(100.0, confidence + 2)
        if not eff_last:
            reasons.append("missing last_date")
            confidence = min(confidence, 55.0)
        if not eff_pdf:
            reasons.append("missing PDF")
            confidence = min(confidence, 70.0)
        if not eff_vac or int(eff_vac) <= 0:
            reasons.append("missing vacancies")
            # Vacancy optional for promote floor but lowers confidence
            confidence = min(confidence, 82.0)

        decision = "needs_fix"
        if not validation.valid and any(
            "non-recruitment" in e.lower() or "tender" in e.lower() for e in validation.errors
        ):
            decision = "reject"
        elif validation.valid and confidence >= QA_APPROVE_MIN_CONFIDENCE and eff_last:
            # Approve for publisher when date present and gate mostly happy.
            # PDF strongly preferred; allow approve without PDF only at higher confidence.
            if eff_pdf or confidence >= 90.0:
                decision = "approve"
            else:
                decision = "needs_fix"
                reasons.append("approve blocked until PDF found (or confidence ≥ 90)")
        elif not validation.valid:
            decision = "needs_fix"
            reasons.extend(validation.errors[:5])

        patches["completeness_score"] = score
        patches["publication_confidence"] = round(confidence, 1)
        patches["verification_status"] = "VERIFIED" if decision == "approve" else "NEEDS_REVIEW"
        patches["qa_decision"] = decision
        patches["qa_reasons"] = reasons[:12]

        return QADecision(
            slug=job.slug or "",
            title=eff_title,
            decision=decision,
            confidence=round(confidence, 1),
            reasons=reasons,
            patches=patches,
            bucket=self._bucket_for(eff_states),
        )

    def _merge_llm_suggestion(
        self,
        patches: dict[str, Any],
        reasons: list[str],
        suggestion: dict[str, Any],
        *,
        context: str,
        title: str,
    ) -> None:
        """Accept LLM fields only when deterministic extractors also support them."""
        if "vacancies" in suggestion and "vacancies" not in patches:
            try:
                n = int(suggestion["vacancies"])
            except (TypeError, ValueError):
                n = 0
            supported = resolve_vacancies(n, title=title, context=context)
            if supported and supported == n:
                patches["vacancies"] = n
                reasons.append(f"llm vacancies confirmed → {n}")

        for key in ("last_date", "published_date"):
            val = suggestion.get(key) or suggestion.get("published_at" if key == "published_date" else "")
            iso = to_iso_date(val)
            if not iso:
                continue
            extracted = extract_dates_from_text(context)
            if key == "last_date" and iso == extracted.get("last_date") and "last_date" not in patches:
                patches["last_date"] = iso
                reasons.append(f"llm last_date confirmed → {iso}")
            if key == "published_date" and iso == extracted.get("published_date") and "published_at" not in patches:
                patches["published_at"] = iso
                reasons.append(f"llm published_at confirmed → {iso}")

        if suggestion.get("title") and "title" not in patches:
            cleaned = improve_title(str(suggestion["title"]))
            if cleaned and len(cleaned) >= 12:
                orig_tokens = set(re.findall(r"[a-z0-9]+", (title or "").lower()))
                new_tokens = set(re.findall(r"[a-z0-9]+", cleaned.lower()))
                if orig_tokens and len(orig_tokens & new_tokens) / max(len(orig_tokens), 1) >= 0.5:
                    patches["title"] = cleaned
                    reasons.append("llm title polish")

    def _patches_to_values(self, job: Job, detail: dict[str, Any], decision: QADecision) -> dict[str, Any]:
        p = decision.patches
        values: dict[str, Any] = {"updated_at": datetime.now(timezone.utc)}
        if "title" in p:
            values["title"] = p["title"]
        if "vacancies" in p:
            values["vacancies"] = int(p["vacancies"])
        if "last_date" in p:
            d = _as_date(p["last_date"])
            if d:
                values["last_date"] = d
        if "published_at" in p:
            d = _as_date(p["published_at"])
            if d:
                values["published_at"] = datetime(d.year, d.month, d.day, tzinfo=timezone.utc)
        if "state_codes" in p:
            values["state_codes"] = list(p["state_codes"])
        if "primary_pdf_url" in p:
            values["primary_pdf_url"] = p["primary_pdf_url"]
        if "detail" in p and isinstance(p["detail"], dict):
            values["detail"] = p["detail"]
        elif p.get("qa_decision"):
            # Stamp QA metadata into detail without wiping summary
            merged = dict(detail)
            merged["qa_reviewed_at"] = datetime.now(timezone.utc).isoformat()
            merged["qa_decision"] = p.get("qa_decision")
            merged["qa_reasons"] = p.get("qa_reasons") or decision.reasons[:8]
            values["detail"] = merged
        if "completeness_score" in p:
            values["completeness_score"] = int(p["completeness_score"])
        if "publication_confidence" in p:
            values["publication_confidence"] = float(p["publication_confidence"])
        if "verification_status" in p:
            values["verification_status"] = p["verification_status"]
        # Review reasons for admin queues (list of strings)
        values["review_reasons"] = [
            f"qa:{decision.decision}",
            f"confidence:{decision.confidence}",
            f"bucket:{decision.bucket}",
            *[str(r)[:120] for r in decision.reasons[:10]],
        ][:40]
        return values

    @staticmethod
    def _bucket_for(state_codes: list[str]) -> str:
        codes = normalize_state_codes(state_codes)
        if not codes:
            return "all-india"
        for name, members in STATE_BUCKETS.items():
            if name == "all-india":
                continue
            if set(codes) & members:
                return name
        return "all-india"
