from app.services.noise_filter import (
    clean_job_title,
    clean_plain_text,
    looks_like_job_notification,
    sanitize_json_for_postgres,
    sanitize_source_text_fields,
    strip_postgres_control_chars,
)


def test_strip_postgres_control_chars_removes_nul():
    assert strip_postgres_control_chars("hello\x00world") == "helloworld"


def test_clean_job_title_strips_nul_before_chrome_cleanup():
    assert "\x00" not in clean_job_title("DRDO\x00 Recruitment 2026 Read More")


def test_clean_job_title_removes_trailing_portal_call_to_action():
    assert (
        clean_job_title("BARC Group B Recruitment 2026 Click Here to Apply Online")
        == "BARC Group B Recruitment 2026"
    )


def test_clean_plain_text_removes_source_html():
    value = '<b>BARC</b><br><font color="blue"><a href="/apply">Apply Online</a></font>'
    assert clean_plain_text(value) == "BARC Apply Online"


def test_clean_plain_text_decodes_entities_and_normalizes_spaces():
    assert clean_plain_text("SSC&nbsp;&amp;&nbsp;UPSC   Recruitment") == "SSC & UPSC Recruitment"


def test_clean_plain_text_removes_script_and_style_content():
    value = "<style>.hidden{display:none}</style><b>DRDO</b><script>alert('x')</script> Recruitment"
    assert clean_plain_text(value) == "DRDO Recruitment"


def test_clean_plain_text_handles_empty_values():
    assert clean_plain_text(None) == ""
    assert clean_plain_text("   ") == ""


def test_sanitize_source_text_fields_preserves_urls_and_cleans_nested_content():
    payload = {
        "title": "<b>Clerk Recruitment</b>",
        "apply_url": "https://example.gov.in/apply?a=1&b=2",
        "detail": {
            "summary": "Applications <strong>open</strong> now",
            "important_dates": [{"label": "<i>Closing date</i>", "date": "2026-08-01"}],
        },
    }
    cleaned = sanitize_source_text_fields(payload)
    assert cleaned["title"] == "Clerk Recruitment"
    assert cleaned["apply_url"] == payload["apply_url"]
    assert cleaned["detail"]["summary"] == "Applications open now"
    assert cleaned["detail"]["important_dates"][0]["label"] == "Closing date"


def test_rejects_gov_admin_noise_titles():
    assert not looks_like_job_notification("Certificate No. RC9115 of 2026_A.P Nos 15441")
    assert not looks_like_job_notification("Appeal No. 6877 of 2026 filed by Samar Imran")
    assert not looks_like_job_notification("Details of foreign visits undertaken by Officers of the NITI Aayog")
    assert not looks_like_job_notification(
        "COPYRIGHT © 2018 | INDIAN AIR FORCE | DESIGNED AND DEVELOPED BY: C-DAC"
    )
    assert not looks_like_job_notification("Toll Free Helpline:1800 266 7575 or 1800 22 7575")
    assert not looks_like_job_notification("Bharat Ka Share Bazaar @ INDIA INTERNATIONAL TRADE FAIR – 2025")
    assert not looks_like_job_notification(
        "Round-1 Online Counselling Results Declared: Results are now live on the portal"
    )
    assert not looks_like_job_notification(
        "Remittance Advice against: Arvind Poddar [Defaulter] PAN: AODPA6026K in the matter of IPO"
    )
    assert not looks_like_job_notification(
        "Notice of Demand under Recovery Certificate number 9152 of 2026 dated June 10, 2026"
    )
    assert not looks_like_job_notification(
        "ISRO showcased its prestigious achievements and advancements in Pragatisheel Chhattisgarh"
    )
    assert not looks_like_job_notification("IRNSS-1F successfully completed its mission life of 10 years")
    assert not looks_like_job_notification("Online Registration extended till 15.06.2026")
    assert looks_like_job_notification("SSC CGL 2026 Recruitment Notification for 500 Posts")
    assert looks_like_job_notification(
        "SSC CGL 2026 Recruitment Notification — Online Registration extended till 15.08.2026"
    )


def test_clean_job_title_strips_advt_no_prefix():
    raw = "Advt. No. HSFC:01:RMT:2026 Dated.10.08.2026 Recruitment of Scientist/Engineer for HSFC"
    cleaned = clean_job_title(raw)
    assert cleaned.startswith("Recruitment of Scientist")
    assert "Advt" not in cleaned


def test_sanitize_json_for_postgres_nested():
    payload = {"summary": "fee\x00details", "posts": [{"title": "clerk\x07"}]}
    out = sanitize_json_for_postgres(payload)
    assert out["summary"] == "feedetails"
    assert out["posts"][0]["title"] == "clerk"
