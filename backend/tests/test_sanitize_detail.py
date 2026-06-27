from app.utils.sanitize_detail import sanitize_job_detail


def test_sanitize_job_detail_strips_aggregator_section_links():
    detail = {
        "content_sections": [
            {
                "heading": "Links",
                "links": [
                    {"label": "Official", "url": "https://ssc.gov.in/apply"},
                    {"label": "Bad", "url": "https://www.freejobalert.com/job/1"},
                ],
            }
        ]
    }
    out = sanitize_job_detail(detail)
    urls = [link["url"] for link in out["content_sections"][0]["links"]]
    assert urls == ["https://ssc.gov.in/apply"]
