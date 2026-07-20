#!/usr/bin/env python3
import asyncio
import json
from pathlib import Path
from datetime import date, datetime, timezone

import asyncpg


def load_env(path: Path) -> dict[str, str]:
    out: dict[str, str] = {}
    if not path.exists():
        return out
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        out[k.strip()] = v.strip()
    return out


DETAIL = {
    "source": "mpsc",
    "published": "2026-05-26T00:00:00Z",
    "notification_no": "LDE (Gazetted Post) No. 17 of 2026-2027",
    "memo_no": "A.34012/5/2026-MPSC(PRE)",
    "department": "Planning & Programme Implementation",
    "post_name": "Junior Grade of MPE&SS",
    "classification": "Group A (Gazetted)",
    "relevant_rules": "Mizoram Planning, Economic & Statistical Service Rules, 2025",
    "summary": (
        "MPSC LDE (Gazetted Post) No. 17 of 2026-2027 for Junior Grade of MPE&SS under "
        "Planning & Programme Implementation Department."
    ),
    "notification_url": "https://mpsconline.mizoram.gov.in",
    "syllabus_url": "https://tinyurl.com/mpesslde",
    "dates": {
        "Notification Date": "2026-05-26",
        "Last Date": "2026-06-29",
        "Last Time": "4:00 PM",
        "Advt. No.": "LDE (Gazetted Post) No. 17 of 2026-2027",
        "Memo No.": "A.34012/5/2026-MPSC(PRE)",
    },
    "fee": {
        "PwD Candidate": "Exempted from application fee",
        "UPI Note": "UPI payment should use the same mobile number as one-time registration",
        "Refund": "Fees once paid are non-refundable",
    },
    "documents_required": [
        "Confirmation Order",
        "Joining Report / Service Book entry showing date of joining feeder post",
        "Certification by HoD or Cadre Authority",
    ],
    "disqualifications": [
        "Canvassing directly or indirectly",
        "Incomplete or incorrect application details",
        "Not fulfilling eligibility conditions at any stage",
        "Failure to upload required documents before the last date",
    ],
    "selection": [
        "Limited Departmental Examination as notified by MPSC.",
        "Refer official syllabus for paper-wise scheme and stages.",
    ],
    "howApply": [
        "Complete one-time registration if not already registered.",
        "Apply through https://mpsconline.mizoram.gov.in.",
        "Upload required documents before the last date.",
        "Verify final submission after payment.",
        "Submit on or before 29-06-2026, 4:00 PM.",
    ],
    "helpdesk_phone": "0389-3596493",
    "helpdesk_hours": "Working days, 10:00 AM - 4:00 PM",
    "pdf_urls": [
        "https://mpsc.mizoram.gov.in/uploads/notifications/17-lde-gazetted-post-no17-of-2026-2027-jr-gr-of-mpess.pdf"
    ],
    "pdfUrls": [
        "https://mpsc.mizoram.gov.in/uploads/notifications/17-lde-gazetted-post-no17-of-2026-2027-jr-gr-of-mpess.pdf"
    ],
}


async def main() -> None:
    env = load_env(Path("e:/gov-job-alert-Govt-Jobs/backend/.env"))
    dsn = env.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")
    if not dsn:
        raise RuntimeError("DATABASE_URL missing in backend/.env")

    conn = await asyncpg.connect(dsn, statement_cache_size=0)
    try:
        rows = await conn.fetch(
            """
            select id, slug, title
            from jobs
            where lower(title) like '%junior grade of mpe&ss%'
               or lower(title) like '%lde (gazetted post)%17%'
               or lower(coalesce(detail->>'summary','')) like '%junior grade of mpe&ss%'
            """
        )
        if not rows:
            print("No matching rows found.")
            return

        ids = [r["id"] for r in rows]
        print(f"Found {len(ids)} row(s).")
        for r in rows:
            print(f"- {r['id']} {r['slug']}")

        await conn.execute(
            """
            update jobs
            set
              title = $1,
              dept = $2,
              category = $3,
              vacancies = $4,
              qualification = $5,
              salary = $6,
              age_limit = $7,
              last_date = $8,
              apply_url = $9,
              status = 'live',
              published_at = $10,
              detail = coalesce(detail, '{}'::jsonb) || $11::jsonb
            where id = any($12::uuid[])
            """,
            "LDE (Gazetted Post) No. 17 of 2026-2027 - Junior Grade of MPE&SS",
            "Mizoram Public Service Commission (MPSC)",
            "state",
            1,
            "From officers in Inspector of Statistics with 5 years of regular service in the grade (after regular appointment) with Bachelor Degree",
            "Level 10 in the Pay Matrix",
            None,
            date(2026, 6, 29),
            "https://mpsconline.mizoram.gov.in",
            datetime(2026, 5, 26, 0, 0, 0, tzinfo=timezone.utc),
            json.dumps(DETAIL),
            ids,
        )

        verify = await conn.fetch(
            """
            select slug, title, dept, vacancies, qualification, salary, last_date, apply_url,
                   detail->>'pdf_url' as pdf_url,
                   detail->>'notification_no' as notification_no
            from jobs
            where id = any($1::uuid[])
            """,
            ids,
        )
        print("Updated rows:")
        for r in verify:
            print(dict(r))
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
