from app.utils.contact_extract import extract_official_contacts


def test_prefers_helpdesk_gov_in_over_gmail():
    text = """
    For queries email helpdesk@ssc.gov.in or write to ssc-cr@nic.in.
    Ignore this@gmail.com and noreply@ssc.gov.in.
    """
    out = extract_official_contacts(text)
    assert out["helpdesk_email"] == "helpdesk@ssc.gov.in"
    assert out["helpdesk_emails"][0] == "helpdesk@ssc.gov.in"
    assert "ssc-cr@nic.in" in out["helpdesk_emails"]
    assert all("gmail" not in e for e in out["helpdesk_emails"])
    assert "noreply@ssc.gov.in" not in out["helpdesk_emails"]


def test_accepts_obfuscated_official_email():
    out = extract_official_contacts("Helpdesk: recruit[at]ibps[dot]in")
    assert out.get("helpdesk_email") == "recruit@ibps.in"


def test_extracts_cgrs_grievance_portal():
    out = extract_official_contacts(
        "In case of queries / complaints please log on to https://cgrs.ibps.in"
    )
    assert out.get("helpdesk_url") == "https://cgrs.ibps.in"
    assert "helpdesk_email" not in out


def test_rejects_aggregator_and_consumer_mail():
    out = extract_official_contacts(
        "Contact us@freejobalert.com or hr@yahoo.com for this job."
    )
    assert out == {}
