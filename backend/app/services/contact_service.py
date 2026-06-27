import html
import logging

import httpx

from app.config import get_settings
from app.schemas.contact import ContactRequest

logger = logging.getLogger(__name__)


async def send_contact_email(body: ContactRequest) -> bool:
    settings = get_settings()
    if not settings.resend_api_key:
        logger.warning("RESEND_API_KEY not set — cannot deliver contact form")
        return False

    to_addr = settings.contact_to_email
    mobile_line = body.mobile.strip()
    mobile_html = (
        f"<p><strong>Mobile:</strong> {html.escape(mobile_line)}</p>" if mobile_line else ""
    )
    mobile_plain = f"Mobile: {mobile_line}\n" if mobile_line else ""

    subject = f"[My Govt Jobs] Contact from {body.name.strip()[:80]}"
    plain = (
        f"Name: {body.name.strip()}\n"
        f"Email: {body.email}\n"
        f"{mobile_plain}\n"
        f"Message:\n{body.message.strip()}\n"
    )
    html_body = (
        f"<p><strong>Name:</strong> {html.escape(body.name.strip())}</p>"
        f"<p><strong>Email:</strong> {html.escape(str(body.email))}</p>"
        f"{mobile_html}"
        f"<p><strong>Message:</strong></p>"
        f"<p>{html.escape(body.message.strip()).replace(chr(10), '<br>')}</p>"
    )

    payload = {
        "from": settings.alert_from_email,
        "to": [to_addr],
        "reply_to": [str(body.email)],
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
            logger.error("Resend contact error %s: %s", res.status_code, res.text[:300])
            return False
    return True
