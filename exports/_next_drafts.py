"""List draft recruitments that already have official PDF + future last_date."""
from pathlib import Path
import psycopg

ROOT = Path(r"D:\My Projects\mygovtjobs-main")

def load_env(path: Path) -> dict:
    vals = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        vals[k.strip()] = v.strip().strip('"').strip("'")
    return vals

env = load_env(ROOT / "backend" / ".env")
db_url = env["DATABASE_URL"]
if db_url.startswith("postgresql+asyncpg://"):
    db_url = "postgresql://" + db_url[len("postgresql+asyncpg://"):]

sql = """
SELECT slug, title, dept, status, last_date::text, vacancies,
       completeness_score, publication_confidence, verification_status,
       LEFT(COALESCE(primary_pdf_url,''), 140) AS pdf,
       LEFT(COALESCE(apply_url,''), 80) AS apply
FROM jobs
WHERE last_date >= CURRENT_DATE
  AND COALESCE(primary_pdf_url,'') <> ''
  AND document_type = 'RECRUITMENT'
  AND status IN ('draft','expired')
  AND published_to_site IS NOT TRUE
ORDER BY completeness_score DESC NULLS LAST, last_date
LIMIT 40
"""

with psycopg.connect(db_url) as conn:
    with conn.cursor() as cur:
        cur.execute(sql)
        rows = cur.fetchall()
        print(f"open_drafts_with_pdf={len(rows)}")
        for r in rows:
            print("---")
            print(r[1][:110])
            print(f"  slug={r[0]}")
            print(f"  {r[3]} last={r[4]} vac={r[5]} score={r[6]} conf={r[7]} ver={r[8]}")
            print(f"  pdf={r[9]}")
            print(f"  apply={r[10]}")
