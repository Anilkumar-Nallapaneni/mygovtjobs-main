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


def test_commercial_job_boards_blocked():
    assert is_blocked_aggregator_host("https://www.naukri.com/job")
    assert is_blocked_aggregator_host("https://in.indeed.com/viewjob")
    assert not is_official_recruitment_host("https://www.naukri.com/job")


def test_shared_catalog_stems_loaded():
    from app.utils.official_hosts import _catalog

    catalog = _catalog()
    assert "apeda.gov.in" in catalog["officialStems"]
    assert "yesbank.in" in catalog["officialStems"]
    assert "naukri" in catalog["blockedCommercialBoards"]


def test_psu_and_aiims_edu_in_hosts():
    assert is_official_recruitment_host("https://www.bsnl.co.in/opencms/bsnl/BSNL/about_us/company/career_opp.html")
    assert is_official_recruitment_host("https://www.ecil.co.in/jobs/Advt_09_2026.pdf")
    assert is_official_recruitment_host("https://aiimsrajkot.edu.in/api/files/Advertisement.pdf")
    assert is_official_recruitment_host("https://jipmer.edu.in/sites/default/files/advt.pdf")
    assert is_official_recruitment_host("https://jobs.rnsb.bank.in/careers")
    assert is_official_recruitment_host("https://drive.google.com/file/d/abc123/view")
    assert is_official_recruitment_host("https://www.wbsetcl.in/careers/notice.pdf")
    assert is_official_recruitment_host("https://iocl.com/latest-job-opening")
    assert is_official_recruitment_host("https://careers.bhel.in/index.jsp")
    assert is_official_recruitment_host(
        "https://ncrtc.in/wp-content/uploads/2026/09/332026VacancyNoticeforSupervisorNonsupervisorContractonRegualr-1.pdf"
    )
    assert is_official_recruitment_host("https://hudco.org.in/writereaddata/Detailed-Advertisement.pdf")
    assert is_official_recruitment_host("https://www.mecl.co.in/writereaddata/meclpdf/Final_Advt_03R26.pdf")
    assert is_official_recruitment_host("https://pfrda.org.in/documents/33652/212847/x.pdf")
    assert is_official_recruitment_host(
        "https://www.pmbi.co.in/vacancies/HR_Advt_No_022026_03092026.pdf"
    )
    assert is_official_recruitment_host("https://www.rfcl.co.in/upload/Detailed%20Advt%2001_2026.pdf")
    assert is_official_recruitment_host(
        "https://www.seci.co.in/uploads/careers/Final_notification_3-2026_24th_August1.pdf"
    )
    assert is_official_recruitment_host(
        "https://www.eximbankindia.in/sites/default/files/2026-09/Detailed%20SRD%20Advertisement%20for%20Website.pdf"
    )
    assert is_official_recruitment_host(
        "https://cms.concorindia.co.in:8000/uploads/cms/pdf/Asf6Xc3Mnw5BWdp_FinalAdvertisement-18thAug2026(Published).pdf"
    )
    assert is_official_recruitment_host(
        "https://bcplonline.co.in/UploadFiles/CareerUploadFiles/Detailed%20Advt-NE-06-2026.pdf"
    )
    assert not is_official_recruitment_host("https://img2.freejobalert.com/news/2026/05/example.pdf")
