"""SQL-level recruitment filters — fast pre-filter before Python noise checks."""

from sqlalchemy import Date, and_, cast, func, not_, or_

from app.models.job import Job

# Postgres ~* case-insensitive regex (subset of noise_filter.py — catches bulk junk in SQL).
_TENDER_TITLE_RE = r"(e-?tenders?|procurement|quotations?|\brfp\b|bid\s+invit|notice\s+tender|vendor\s+for)"
_TENDER_URL_RE = r"/tenders?(?:/|$|\?|s\b)|/e-?tender|/procurement|downloadtender"

_JUNK_PREFIX_RE = (
    r"^(application\s+form|download|click\s+here|view|pdf|english\s*\(|hindi\s*\(|notification|form)\b"
)

_GOV_NOISE_RE = (
    r"copyright.*(designed|developed)|toll\s*[- ]?free\s+helpline|trade\s+fair|"
    r"counselling\s+results\s+declared|waiting\s+list\s+for\s+offline|"
    r"implementation\s+of\s+multiple\s+nav|certificate\s+no\.?\s*rc\d|"
    r"appeal\s+no\.?\s*\d+\s+of\s+\d+|"
    r"remittance\s+advice|defaulter.*pan|recovery\s+certificate|notice\s+of\s+demand|"
    r"matter\s+of\s+investigation|isro\s+(showcased|conducts|inaugurat)|"
    r"mission\s+life\s+of\s+\d+\s+years|successfully\s+completed\s+its\s+mission|"
    r"sea\s+level\s+test\s+of\s+cryogenic|awareness\s+training\s*\(\s*start|"
    r"paid\s+internship|इंटर्नश|सशुल्क\s+इंटर्नश|online\s+registration\s+extended\s+till"
)

_PORTAL_NAV_RE = (
    r"^(apply\s+online|notifications?|advertisements?|home|login|sign\s*up|sitemap|"
    r"faq|help|about\s+us|contact(?:\s+us)?|tenders?|downloads?|whats\s+new)\b"
)

_RECRUIT_HINT_RE = (
    r"\d|post|vacanc|group|assistant|clerk|constable|engineer|teacher|officer|exam|"
    r"bharti|recruit|notification\s+(?:no|for)|advt|direct\s+recruit|apprentice|"
    r"resident|specialist|selection|engagement|naukri|cgl|ntpc|psc|ssc|upsc|railway|bank|police"
)


def _regex_not(column, pattern: str):
    """column !~* pattern (case-insensitive NOT match)."""
    return not_(func.coalesce(column, "").op("~*")(pattern))


def recruitment_sql_filters():
    """Return SQLAlchemy conditions shared by list + count queries."""
    title = func.coalesce(Job.title, "")
    dept = func.coalesce(Job.dept, "")
    apply_url = func.coalesce(Job.apply_url, "")

    recruit_hint = or_(
        title.op("~*")(_RECRUIT_HINT_RE),
        dept.op("~*")(_RECRUIT_HINT_RE),
    )

    return [
        func.length(title) >= 10,
        _regex_not(title, _TENDER_TITLE_RE),
        _regex_not(apply_url, _TENDER_URL_RE),
        _regex_not(title, _JUNK_PREFIX_RE),
        _regex_not(title, _GOV_NOISE_RE),
        _regex_not(title, _PORTAL_NAV_RE),
        recruit_hint,
    ]


def apply_recruitment_filters(stmt):
    # Keep backend/API/export visibility identical to the Supabase public policy.
    india_today = cast(func.timezone("Asia/Kolkata", func.current_timestamp()), Date)
    active_or_archive = or_(
        Job.status == "expired",
        and_(Job.status == "live", Job.last_date.is_not(None), Job.last_date >= india_today),
    )
    return stmt.where(
        and_(
            *recruitment_sql_filters(),
            Job.document_type == "RECRUITMENT",
            Job.published_to_site.is_(True),
            Job.verification_status.in_(("VERIFIED", "PARTIALLY_VERIFIED")),
            Job.completeness_score >= 70,
            Job.publication_confidence >= 90,
            active_or_archive,
        )
    )
