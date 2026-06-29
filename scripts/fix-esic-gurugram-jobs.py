#!/usr/bin/env python3
"""Remove duplicate ESIC annexure job; align main walk-in record with official PDF (Advt 03/2026)."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LIVE = ROOT / "frontend" / "public" / "data" / "live-jobs.json"
PDF_INDEX = ROOT / "frontend" / "public" / "data" / "pdf-memory-index.json"
INTERVIEW = ROOT / "frontend" / "public" / "data" / "official-archives" / "interview.json"
SITEMAP = ROOT / "frontend" / "public" / "sitemap.xml"

DUPLICATE_SLUG = "3-esic-model-hospital-gurugram-haryana-walk-in-interview-on-07-07-2026-for-the-a-d34e37b1"
MAIN_SLUG = "walk-in-interview-on-07-07-2026-for-the-appointment-of-full-time-contractual-spe-f5f0c9e0"
PDF_URL = (
    "https://www.esic.gov.in/attachments/recruitmentfile/"
    "Walk_in_interview_on_07_07_2026_for_the_appointment_of_Full_Time_Contractual_Specialists_and_"
    "Senior_Resident_on_Contractual_basis_at_ESIC_Model_Hospital_Gurugram_Haryana_1782382011.pdf"
)

ESIC_DETAIL = {
    "pdf_url": PDF_URL,
    "notification_url": PDF_URL,
    "published": "2026-06-23T00:00:00+00:00",
    "detail_source": "pdf",
    "detail_updated_at": "2026-06-29T00:00:00+00:00",
    "memorized_at": "2026-06-28T09:29:53.003586+00:00",
    "source": "esic",
    "advt_no": "03/2026",
    "notification_no": "ADVERTISEMENT NO. 03/2026",
    "apply_mode": "Walk-in interview",
    "venue": (
        "Chambers of Medical Superintendent, 2nd Floor, ESIC Model Hospital, "
        "Sector 9A, Gurugram, Haryana — 122001"
    ),
    "pdf_urls": [PDF_URL],
    "pdfUrls": [PDF_URL],
    "summary": (
        "Employees' State Insurance Corporation (ESIC) Model Hospital Gurugram invites eligible "
        "candidates for walk-in interview on 07 July 2026 (09:00–10:30 AM) for 14 Full-Time "
        "Contractual Specialists and 34 Senior Residents on 3-year contract. Advt No. 03/2026 "
        "dated 23 June 2026."
    ),
    "important_dates": [
        {"event": "Notification date", "date": "23 June 2026"},
        {"event": "Walk-in interview", "date": "07 July 2026"},
        {"event": "Reporting time", "date": "09:00 AM"},
        {"event": "Closing time", "date": "10:30 AM"},
    ],
    "dates": {
        "Notification": "2026-06-23",
        "Walk-in interview": "2026-07-07",
        "Reporting time": "09:00 AM",
        "Closing time": "10:30 AM",
        "Advertisement No.": "03/2026",
    },
    "fee": {
        "General / OBC": "Demand draft as per notification (payable at walk-in)",
        "SC / ST / PwD / Women": "Exempted from application fee",
        "Ex-servicemen": "Exempted from application fee",
        "Payment mode": "Demand draft only — must be issued after notification date",
    },
    "selection_process": [
        "Walk-in interview on 07 July 2026 at the venue notified in Advt No. 03/2026.",
        "Document verification cum walk-in interview for eligible candidates.",
        "Medical fitness and verification of originals before appointment.",
    ],
    "documents_required": [
        "Registration with Medical Council of India or State Medical Council",
        "PG Degree or PG Diploma in concerned specialty (Critical Care for ICU & A&E posts)",
        "Experience certificates (3 years post PG Degree or 5 years post PG Diploma)",
        "Age proof and category certificate (if applicable)",
        "EWS certificate (if claiming EWS reservation)",
        "Ex-servicemen discharge certificate (if applicable)",
        "NOC from employer (if working in government service)",
        "Duly filled biodata form Annexure-F (one application per post)",
        "Demand draft for application fee (except exempt categories)",
    ],
    "posts": [
        {"post_name": "Full-Time Contractual Specialist", "vacancies": 14, "pay_level": "Rs. 1,48,263/month"},
        {"post_name": "Senior Resident (3-year contract)", "vacancies": 34, "pay_level": "As per ESIC rules"},
    ],
    "content_sections": [
        {
            "heading": "Overview",
            "paragraphs": [
                (
                    "ESIC Model Hospital Gurugram, Haryana invites walk-in interview on 07.07.2026 "
                    "for Full-Time Contractual Specialists (14 posts) and Senior Residents (34 posts) "
                    "on contractual basis for a tenure of 3 years."
                ),
            ],
            "lists": [],
            "tables": [],
            "links": [{"label": "Official notification PDF", "url": PDF_URL}],
        },
        {
            "heading": "Vacancy Details",
            "paragraphs": [
                "1) Full-Time Contractual Specialist — 14 posts",
                "2) Senior Residents (3 years tenure) — 34 posts",
            ],
            "tables": [
                [
                    {"Department": "Accident & Emergency", "Total": "2"},
                    {"Department": "Chest", "Total": "1"},
                    {"Department": "ICU", "Total": "1"},
                    {"Department": "Medicine", "Total": "2"},
                    {"Department": "OBG", "Total": "2"},
                    {"Department": "Paediatrics", "Total": "1"},
                    {"Department": "Psychiatry", "Total": "1"},
                    {"Department": "Radiology", "Total": "2"},
                    {"Department": "Surgery", "Total": "2"},
                ]
            ],
            "lists": [],
            "links": [],
        },
        {
            "heading": "Important Dates",
            "paragraphs": [],
            "lists": [
                ["Notification: 23 June 2026"],
                ["Walk-in interview: 07 July 2026"],
                ["Reporting: 09:00 AM | Closing: 10:30 AM"],
            ],
            "tables": [],
            "links": [],
        },
        {
            "heading": "Eligibility",
            "paragraphs": [
                (
                    "Specialist: PG Degree or PG Diploma in concerned specialty; registration with MCI/"
                    "State Medical Council; min. 3 years experience after PG Degree or 5 years after "
                    "PG Diploma; max age 69 years on interview date."
                ),
                (
                    "Senior Resident: PG qualification as per specialty; max age 45 years on interview "
                    "date; preference to PG-qualified candidates."
                ),
            ],
            "lists": [],
            "tables": [],
            "links": [],
        },
        {
            "heading": "Salary",
            "paragraphs": [
                "Full-Time Contractual Specialist: consolidated Rs. 1,48,263 per month (on no work no pay basis).",
                "Senior Resident: emoluments as per ESIC Headquarters guidelines.",
            ],
            "lists": [],
            "tables": [],
            "links": [],
        },
        {
            "heading": "How to Apply",
            "lists": [
                [
                    "Report for walk-in interview on 07.07.2026 between 09:00 AM and 10:30 AM.",
                    f"Venue: Chambers of Medical Superintendent, 2nd Floor, ESIC Model Hospital, Sector 9A, Gurugram.",
                    "Submit separate application for each post in Annexure-F format.",
                    "Bring all original certificates with photocopies and demand draft (if fee applicable).",
                    "See official PDF for complete checklist and fee amount.",
                ]
            ],
            "paragraphs": [],
            "tables": [],
            "links": [{"label": "Download notification PDF", "url": PDF_URL}],
        },
        {
            "heading": "Selection Process",
            "lists": [
                [
                    "Walk-in interview and document verification on scheduled date.",
                    "Medical fitness required before joining.",
                    "Appointment subject to verification of documents and rules.",
                ]
            ],
            "paragraphs": [],
            "tables": [],
            "links": [],
        },
        {
            "heading": "Application Fee",
            "paragraphs": [
                "SC/ST/PwD/Women and Ex-servicemen candidates are exempted. Others pay fee via demand draft at walk-in.",
            ],
            "lists": [],
            "tables": [],
            "links": [],
        },
    ],
}

MAIN_PATCH = {
    "title": (
        "Walk-in interview on 07.07.2026 for Full-Time Contractual Specialists and "
        "Senior Residents at ESIC Model Hospital Gurugram, Haryana"
    ),
    "dept": "ESIC — Employees' State Insurance Corporation",
    "category": "health",
    "state_codes": ["hr"],
    "vacancies": 48,
    "qualification": (
        "PG Degree or PG Diploma in concerned specialty; MCI/State Medical Council registration; "
        "experience as per notification"
    ),
    "salary": "Specialist: Rs. 1,48,263/month (consolidated); Senior Resident: as per ESIC rules",
    "age_limit": "Specialist: max 69 years; Senior Resident: max 45 years (as on interview date)",
    "last_date": "2026-07-07",
    "apply_url": PDF_URL,
    "pdf_url": PDF_URL,
    "published_at": "2026-06-23T00:00:00Z",
    "post_name": "Contractual Specialist & Senior Resident",
    "posts": ESIC_DETAIL["posts"],
    "important_dates": [
        {"event": "Walk-in interview", "date": "2026-07-07"},
        {"event": "Reporting time", "date": "09:00 AM"},
        {"event": "Closing time", "date": "10:30 AM"},
    ],
    "selection": ESIC_DETAIL["selection_process"],
    "howApply": ESIC_DETAIL["content_sections"][5]["lists"][0],
    "fee": ESIC_DETAIL["fee"],
    "detail": ESIC_DETAIL,
}


def _list_key(data: dict) -> str:
    if "items" in data:
        return "items"
    if "jobs" in data:
        return "jobs"
    raise KeyError("expected items or jobs array in JSON")


def patch_live_jobs() -> None:
    data = json.loads(LIVE.read_text(encoding="utf-8"))
    key = _list_key(data)
    kept = []
    for row in data[key]:
        slug = row.get("slug", "")
        if slug == DUPLICATE_SLUG:
            continue
        if slug == MAIN_SLUG:
            row.update(MAIN_PATCH)
        kept.append(row)
    data[key] = kept
    LIVE.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"live-jobs.json: patched {MAIN_SLUG} ({len(kept)} jobs)")


def patch_pdf_index() -> None:
    data = json.loads(PDF_INDEX.read_text(encoding="utf-8"))
    key = _list_key(data)
    kept = []
    for row in data[key]:
        slug = row.get("slug", "")
        if slug == DUPLICATE_SLUG:
            continue
        if slug == MAIN_SLUG:
            row["vacancies"] = 48
            row["title"] = MAIN_PATCH["title"][:120]
        kept.append(row)
    data[key] = kept
    PDF_INDEX.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("pdf-memory-index.json: updated")


def patch_interview_archive() -> None:
    data = json.loads(INTERVIEW.read_text(encoding="utf-8"))
    items = data if isinstance(data, list) else data.get("items", [])
    kept = [
        x
        for x in items
        if "Annexure_1782382011.pdf" not in str(x.get("link", ""))
        and not str(x.get("title", "")).startswith("3 ESIC Model Hospital")
    ]
    for row in kept:
        if MAIN_SLUG.split("-")[-1] in str(row.get("link", "")) or "Walk_in_interview_on_07_07_2026" in str(
            row.get("link", "")
        ):
            row["title"] = MAIN_PATCH["title"]
            row["summary"] = ESIC_DETAIL["summary"]
    INTERVIEW.write_text(json.dumps(kept, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("official-archives/interview.json: updated")


def patch_sitemap() -> None:
    text = SITEMAP.read_text(encoding="utf-8")
    dup_url = f"https://govtjobs.me/jobs/{DUPLICATE_SLUG}"
    import re

    text = re.sub(
        rf"\s*<url>\s*<loc>{re.escape(dup_url)}</loc>.*?</url>\s*",
        "\n",
        text,
        count=1,
        flags=re.DOTALL,
    )
    SITEMAP.write_text(text, encoding="utf-8")
    print("sitemap.xml: removed duplicate URL")


def main() -> None:
    patch_live_jobs()
    patch_pdf_index()
    patch_interview_archive()
    patch_sitemap()


if __name__ == "__main__":
    main()
