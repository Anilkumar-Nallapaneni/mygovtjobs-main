from app.utils.catalog_import_sanitize import (
    clean_display_text,
    collect_apply_links,
    is_blocked_url,
    sanitize_raw_job,
)


def test_blocks_aggregator_urls():
    assert is_blocked_url("https://www.freejobalert.com/articles/test-3041572")
    assert is_blocked_url("https://t.me/FreeJobAlertOfficially")
    assert not is_blocked_url("https://www.ncrtc.co.in/hr-module/user/Login.php")


def test_strips_watermark_text():
    raw = "NETRA Vacancy 2026 WWW.FREEJOBALERT.COM Download Mobile App"
    cleaned = clean_display_text(raw)
    assert cleaned is not None
    assert "freejobalert" not in cleaned.lower()


def test_sanitize_removes_social_links():
    raw = {
        "job_id": "3050334",
        "listing": {
            "job_id": "3050334",
            "recruitment_board": "NETRA",
            "exam_post_name": "CEO – 1 Posts",
            "qualification": "B.Tech",
            "advt_no": "20/2026",
            "last_date": "22-06-2026",
            "section": "Delhi",
            "post_date": "22/05/2026",
            "source_page": "delhi",
        },
        "detail": {
            "title": "NETRA CEO Recruitment 2026",
            "summary": "Official NETRA notification.",
            "links": [
                {"text": "Join Telegram", "url": "https://t.me/FreeJobAlertOfficially"},
                {"text": "Apply", "url": "https://www.ncrtc.co.in/hr-module/user/Login.php"},
            ],
            "sections": [
                {
                    "heading": "Introduction",
                    "paragraphs": [
                        "NETRA has released notification on www.ncrtc.in.",
                        "FOLLOW US Join WhatsApp Join Telegram",
                    ],
                    "tables": [],
                    "lists": [],
                    "links": [],
                }
            ],
        },
    }
    clean = sanitize_raw_job(raw)
    assert clean["board"] == "NETRA"
    assert all("freejobalert" not in link["url"].lower() for link in clean["apply_links"])
    assert any("ncrtc.co.in" in link["url"] for link in clean["apply_links"])
    assert not any("FOLLOW US" in p for p in clean["sections"][0]["paragraphs"])


def test_collect_apply_links_dedupes():
    raw = {
        "detail": {
            "apply_links": [
                {"text": "PDF", "url": "https://ssc.nic.in/notice.pdf"},
                {"text": "PDF copy", "url": "https://ssc.nic.in/notice.pdf"},
            ],
            "links": [],
            "sections": [],
        }
    }
    links = collect_apply_links(raw)
    assert len(links) == 1
