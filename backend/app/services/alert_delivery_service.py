"""Match live jobs to alert subscriptions and deliver via email / Telegram."""

from __future__ import annotations

import html
import logging
import re
from datetime import datetime, timedelta, timezone

import httpx
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.alert import AlertDelivery, AlertSubscription
from app.models.job import Job

logger = logging.getLogger(__name__)


def job_matches_subscription(job: Job, sub: AlertSubscription) -> bool:
    """Return True when a job fits the subscriber's optional filters."""
    state_filter = [str(s).lower() for s in (sub.state_codes or []) if s]
    if state_filter:
        job_states = [str(s).lower() for s in (job.state_codes or []) if s]
        if job_states and not any(s in state_filter for s in job_states):
            return False

    category_filter = [str(c).lower() for c in (sub.categories or []) if c]
    if category_filter:
        job_cat = str(job.category or "").lower()
        if job_cat and job_cat not in category_filter:
            return False

    qual_filter = [str(q).lower() for q in (sub.qualification_tags or []) if q]
    if qual_filter:
        qual_blob = " ".join(
            filter(
                None,
                [
                    str(job.qualification or ""),
                    str((job.detail or {}).get("qualification") or ""),
                    str(job.title or ""),
                ],
            )
        ).lower()
        if not any(tag in qual_blob for tag in qual_filter):
            return False

    return True


def _job_detail_url(job: Job) -> str:
    base = get_settings().alert_site_url.rstrip("/")
    slug = job.slug or job.id
    return f"{base}/jobs/{slug}"


def _official_apply_url(job: Job) -> str | None:
    apply = job.apply_url or (job.detail or {}).get("apply_url")
    if not apply or not isinstance(apply, str):
        return None
    if not re.search(r"^https?://", apply, re.I):
        return None
    return apply


def build_alert_message(job: Job) -> tuple[str, str]:
    """Return (plain_text, html_body) for a job alert."""
    title = str(job.title or "Government recruitment").strip()
    dept = str(job.dept or "Official notification").strip()
    vacancies = int(job.vacancies or 0)
    last_date = job.last_date.isoformat() if job.last_date else "See notification"
    detail_url = _job_detail_url(job)
    apply_url = _official_apply_url(job)

    lines = [
        f"New government job: {title}",
        f"Department: {dept}",
    ]
    if vacancies > 0:
        lines.append(f"Vacancies: {vacancies}")
    lines.append(f"Last date: {last_date}")
    lines.append(f"View on My Govt Jobs: {detail_url}")
    if apply_url:
        lines.append(f"Official apply link: {apply_url}")

    plain = "\n".join(lines)

    html_parts = [
        f"<h2>{html.escape(title)}</h2>",
        f"<p><strong>Department:</strong> {html.escape(dept)}</p>",
    ]
    if vacancies > 0:
        html_parts.append(f"<p><strong>Vacancies:</strong> {vacancies}</p>")
    html_parts.append(f"<p><strong>Last date:</strong> {html.escape(last_date)}</p>")
    html_parts.append(f'<p><a href="{html.escape(detail_url)}">View details on My Govt Jobs</a></p>')
    if apply_url:
        html_parts.append(f'<p><a href="{html.escape(apply_url)}">Official apply link</a></p>')
    html_parts.append("<p><small>Official sources only — no aggregator links.</small></p>")
    html_body = "".join(html_parts)

    return plain, html_body


async def send_email_alert(to: str, subject: str, plain: str, html_body: str) -> bool:
    settings = get_settings()
    if not settings.resend_api_key:
        logger.warning("RESEND_API_KEY not set — skipping email to %s", to)
        return False

    payload = {
        "from": settings.alert_from_email,
        "to": [to],
        "subject": subject,
        "text": plain,
        "html": html_body,
    }
    async with httpx.AsyncClient(timeout=20) as client:
        res = await client.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {settings.resend_api_key}"},
            json=payload,
        )
        if res.status_code >= 400:
            logger.error("Resend error %s: %s", res.status_code, res.text[:300])
            return False
    return True


async def send_whatsapp_alert(to: str, plain: str) -> bool:
    settings = get_settings()
    sid = settings.twilio_account_sid
    token = settings.twilio_auth_token
    from_num = settings.twilio_whatsapp_from
    if not sid or not token or not from_num:
        logger.warning("Twilio WhatsApp not configured — skipping %s", to)
        return False

    to_num = to.strip()
    if not to_num.startswith("whatsapp:"):
        digits = "".join(c for c in to_num if c.isdigit() or c == "+")
        to_num = f"whatsapp:{digits}"

    url = f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json"
    async with httpx.AsyncClient(timeout=25) as client:
        res = await client.post(
            url,
            auth=(sid, token),
            data={"From": from_num, "To": to_num, "Body": plain[:1500]},
        )
        if res.status_code >= 400:
            logger.error("Twilio WhatsApp error %s: %s", res.status_code, res.text[:300])
            return False
    return True


async def send_telegram_alert(chat_id: str, plain: str) -> bool:
    settings = get_settings()
    token = settings.telegram_bot_token
    if not token:
        logger.warning("TELEGRAM_BOT_TOKEN not set — skipping Telegram to %s", chat_id)
        return False

    address = chat_id.strip()
    if address.startswith("@"):
        logger.warning("Telegram @username requires chat_id — got %s", address)
        return False

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    async with httpx.AsyncClient(timeout=20) as client:
        res = await client.post(
            url,
            json={"chat_id": address, "text": plain, "disable_web_page_preview": False},
        )
        data = res.json()
        if not data.get("ok"):
            logger.error("Telegram error: %s", data)
            return False
    return True


async def send_push_alert(token: str, subject: str, plain: str) -> bool:
    """Deliver push via optional webhook bridge (token = device/subscription id)."""
    settings = get_settings()
    webhook = (settings.push_webhook_url or "").strip()
    if not webhook:
        logger.warning("PUSH_WEBHOOK_URL not set — skipping push to %s", token[:40])
        return False

    payload = {"token": token.strip(), "title": subject, "body": plain[:1500]}
    async with httpx.AsyncClient(timeout=20) as client:
        res = await client.post(webhook, json=payload)
        if res.status_code >= 400:
            logger.error("Push webhook error %s: %s", res.status_code, res.text[:300])
            return False
    return True


async def deliver_to_subscription(session: AsyncSession, job: Job, sub: AlertSubscription) -> bool:
    subject = f"New govt job: {(job.title or 'Notification')[:120]}"
    plain, html_body = build_alert_message(job)

    if sub.channel == "email":
        ok = await send_email_alert(sub.channel_address, subject, plain, html_body)
    elif sub.channel == "telegram":
        ok = await send_telegram_alert(sub.channel_address, plain)
    elif sub.channel == "whatsapp":
        ok = await send_whatsapp_alert(sub.channel_address, plain)
    elif sub.channel == "push":
        ok = await send_push_alert(sub.channel_address, subject, plain)
    else:
        return False

    if not ok:
        return False

    stmt = (
        insert(AlertDelivery)
        .values(subscription_id=sub.id, job_id=job.id)
        .on_conflict_do_nothing(index_elements=["subscription_id", "job_id"])
    )
    await session.execute(stmt)
    return True


class AlertDeliveryService:
    async def run(self, session: AsyncSession, *, lookback_hours: int | None = None) -> dict[str, int]:
        settings = get_settings()
        hours = lookback_hours if lookback_hours is not None else settings.alert_delivery_lookback_hours
        since = datetime.now(timezone.utc) - timedelta(hours=max(1, hours))

        jobs = (
            await session.execute(
                select(Job)
                .where(Job.status == "live")
                .where(Job.published_at >= since)
                .order_by(Job.published_at.desc())
            )
        ).scalars().all()

        subs = (
            await session.execute(select(AlertSubscription).where(AlertSubscription.is_active.is_(True)))
        ).scalars().all()

        if not jobs:
            return {"jobs": 0, "subscriptions": len(subs), "sent": 0, "skipped": 0}

        delivered_rows = (
            await session.execute(
                select(AlertDelivery.subscription_id, AlertDelivery.job_id).where(
                    AlertDelivery.job_id.in_([j.id for j in jobs])
                )
            )
        ).all()
        delivered_ids = {(row[0], row[1]) for row in delivered_rows}

        sent = 0
        skipped = 0
        for job in jobs:
            for sub in subs:
                if not job_matches_subscription(job, sub):
                    skipped += 1
                    continue
                if (sub.id, job.id) in delivered_ids:
                    skipped += 1
                    continue
                try:
                    if await deliver_to_subscription(session, job, sub):
                        sent += 1
                        delivered_ids.add((sub.id, job.id))
                except Exception:
                    logger.exception("Alert delivery failed sub=%s job=%s", sub.id, job.id)

        await session.commit()
        return {"jobs": len(jobs), "subscriptions": len(subs), "sent": sent, "skipped": skipped}
