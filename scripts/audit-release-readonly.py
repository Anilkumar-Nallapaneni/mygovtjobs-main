"""Release evidence: database-enforced read-only queries, existing publication gates."""
import asyncio
from collections import Counter
from datetime import datetime, timezone
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'backend'))
from sqlalchemy import text
from app.database.session import SessionLocal
from app.services.job_service import JobService, _base_list_stmt
from app.services.live_snapshot_clean import prepare_live_snapshot_row
from app.services.publish_gate import can_publish_job, validate_job_for_publication, _publication_urls
from app.utils.live_jobs_export import slim_job_for_json_export


async def main():
    catalog = json.loads((ROOT / 'frontend/public/data/live-jobs.json').read_text())['items']
    catalog_slugs = {row['slug'] for row in catalog}
    async with SessionLocal() as session:
        await session.execute(text('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY'))
        rows = [dict(row) for row in (await session.execute(text(
            'SELECT j.*, s.code AS source_code FROM jobs j LEFT JOIN sources s ON s.id=j.source_id'
        ))).mappings()]
        sql_public = {row.slug for row in (await session.execute(_base_list_stmt())).scalars()}
        api, api_total = await JobService().list_jobs(limit=1000, session=session)
        exportable = [item for item in map(slim_job_for_json_export, api) if prepare_live_snapshot_row(item)]
        live = []
        draft_errors = Counter()
        draft_groups = Counter()
        for row in rows:
            validation = validate_job_for_publication(row)
            allowed, errors = can_publish_job(row)
            if row['status'] == 'draft':
                draft_errors.update(validation.errors)
                groups = set()
                for error in validation.errors:
                    label = error.lower()
                    group = ('missing_deadline' if 'missing or malformed deadline' in label else
                        'missing_official_pdf' if 'notification pdf' in label else
                        'official_url' if 'source url' in label or 'source domain' in label or 'apply url' in label else
                        'verification' if 'not been verified' in label else
                        'non_recruitment' if 'not classified as recruitment' in label or 'tender' in label or 'unrelated' in label else
                        'completeness' if 'completeness' in label else
                        'expired' if 'past deadline' in label else 'other')
                    groups.add(group)
                if validation.confidence < 90:
                    groups.add('confidence_below_90')
                draft_groups.update(groups)
            if row['status'] == 'live':
                live.append({key: row.get(key) for key in ['id','slug','dept','title','source_url','source_code','status','verification_status','published_to_site','document_type','last_date','completeness_score','publication_confidence']}
                    | {'resolved_source_url': _publication_urls(row)[0], 'in_catalog': row['slug'] in catalog_slugs, 'passes_sql_public_filter': row['slug'] in sql_public,
                       'publication_gate_valid': allowed, 'publication_gate_failures': errors})
        districts = [dict(row) for row in (await session.execute(text('''
            SELECT count(*) AS verified_districts,
                count(*) FILTER (WHERE EXISTS (SELECT 1 FROM india_cities c WHERE c.district_id=d.id AND c.verification_status='verified')
                  OR EXISTS (SELECT 1 FROM india_places p WHERE p.district_id=d.id AND p.verification_status='verified')) AS content_eligible
            FROM india_districts d WHERE d.verification_status='verified'
        '''))).mappings()]
        await session.rollback()
    report = {'generated_at': datetime.now(timezone.utc).isoformat(), 'database_writes': 0,
        'stored_jobs': len(rows), 'statuses': dict(Counter(row['status'] for row in rows)),
        'catalog_jobs': len(catalog), 'raw_live_records': live,
        'excluded_live_records': [row for row in live if not row['in_catalog']],
        'api_sql_total': api_total, 'api_returned': len(api), 'strict_exportable': len(exportable),
        'exportable_missing_from_catalog': sorted({row['slug'] for row in exportable} - catalog_slugs),
        'catalog_not_currently_exportable': sorted(catalog_slugs - {row['slug'] for row in exportable}),
        'draft_blocker_groups': dict(draft_groups.most_common()), 'draft_gate_errors': dict(draft_errors.most_common()),
        'district_content_eligibility': districts}
    path = ROOT / 'docs/audits/release-database-2026-10-07.json'
    path.write_text(json.dumps(report, indent=2, default=str), encoding='utf-8')
    print(json.dumps(report, indent=2, default=str))


if __name__ == '__main__':
    asyncio.run(main())
