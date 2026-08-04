# Production implementation guide

## Apply and test
```powershell
git checkout -b feature/canonical-operations
npm ci
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
npm run db:migrate
npm run pipeline:verify
npm run type-check
npm run lint
npm run test
npm run build
```

## Canonical commands
```powershell
npm run pipeline:daily
npm run pipeline:weekly
npm run pipeline:verify
```
Use only these operator commands. Existing sync scripts remain internal implementation details.

## GitHub settings
See [docs/OPS_WORKFLOWS.md](docs/OPS_WORKFLOWS.md) for the keep/disable matrix.

Already applied on GitHub (2026-08-04):
- `ALLOW_CANONICAL_PIPELINE=true`
- `ALLOW_AUTO_INGEST=false`
- `ALLOW_RSS_REFRESH=true`
- `ALLOW_WEEKLY_ENRICH=true`
- Legacy workflows disabled: Supabase auto ingest, self-hosted ingest, Scheduled API ingest

Push the updated `.github/workflows/` files so Canonical daily pipeline is registered on `main`.

## Acceptance checks
- `/api/health` returns 200.
- `/api/admin/operations` works with `X-Admin-Key`.
- Admin page displays Operations control room.
- `npm run pipeline:verify` succeeds.
- Live snapshot is below 24 hours old.
- Official notification and application links work.

## Next order
1. Recruitment timeline UI using the new lifecycle tables.
2. Closing today, 3-day and 7-day pages.
3. Saved jobs and reminders.
4. Admit card, answer key and result ingestion.
5. Original SEO content pages.
