"""Official host allow/block behavior."""

from app.utils.official_hosts import is_blocked_aggregator_host, is_official_recruitment_host


def test_employment_news_is_official_not_aggregator():
    url = "https://employmentnews.gov.in/NewEmp/MoreContentNew.aspx?n=Recruitment"
    assert not is_blocked_aggregator_host(url)
    assert is_official_recruitment_host(url)


def test_known_aggregator_still_blocked():
    url = "https://www.sarkariresult.com/example-recruitment/"
    assert is_blocked_aggregator_host(url)
    assert not is_official_recruitment_host(url)


def test_psu_and_aiims_edu_in_hosts():
    assert is_official_recruitment_host("https://www.bsnl.co.in/opencms/bsnl/BSNL/about_us/company/career_opp.html")
    assert is_official_recruitment_host("https://www.ecil.co.in/jobs/Advt_09_2026.pdf")
    assert is_official_recruitment_host("https://aiimsrajkot.edu.in/api/files/Advertisement.pdf")
    assert is_official_recruitment_host("https://jipmer.edu.in/sites/default/files/advt.pdf")
    assert is_official_recruitment_host("https://jobs.rnsb.bank.in/careers")
    assert is_official_recruitment_host("https://drive.google.com/file/d/abc123/view")
    assert is_official_recruitment_host("https://www.wbsetcl.in/careers/notice.pdf")
    assert not is_official_recruitment_host("https://img2.freejobalert.com/news/2026/05/example.pdf")
