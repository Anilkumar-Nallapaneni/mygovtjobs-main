from app.utils.database_url import database_url_issues, sanitize_db_error


def test_database_url_issues_flags_wrong_user():
    url = (
        "postgresql+asyncpg://postgres.lqihbxujvvzagrfoorf:secret@"
        "aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
    )
    issues = database_url_issues(url, supabase_url="https://lqihbxujvvvzagrfoorf.supabase.co")
    assert any("postgres.lqihbxujvvvzagrfoorf" in i for i in issues)


def test_database_url_issues_ok_for_pooler():
    url = (
        "postgresql+asyncpg://postgres.lqihbxujvvvzagrfoorf:secret@"
        "aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres"
    )
    issues = database_url_issues(url, supabase_url="https://lqihbxujvvvzagrfoorf.supabase.co")
    assert issues == []


def test_sanitize_db_error_masks_password():
    err = Exception("connect postgresql://user:supersecret@host:6543/db failed")
    assert "supersecret" not in sanitize_db_error(err)
