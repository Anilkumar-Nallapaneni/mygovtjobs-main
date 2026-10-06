# Data trust policy

LiveGovtJobs must not invent jobs, vacancies, organizations, places, addresses, statistics, or government facts. When a source is unavailable or a record is not verified, show an honest empty state instead of filling the gap with generated content.

## Provenance and publication

- Prefer official government sources, including the Local Government Directory for administrative data.
- Retain source attribution and source record identifiers/URLs when importing directory data.
- Public directory responses must use verified records; pending or unverified records stay out of public results.
- Job publication and PDF links must follow the existing validation and official-domain rules.
- Record corrections should preserve the source trail and be reproducible.

## Importing India directory data

`data/india/README.md` documents source preparation. The importer in `scripts/india/import_directory.py` accepts CSV datasets and requires a registered source name. Its default `--apply` behavior is off and the database transaction is rolled back in dry-run mode. Review the reported accepted/rejected rows before using `--apply`; an apply run raises on rejected records and rolls back its transaction.

Example:

```powershell
npm run india:import -- districts path\to\districts.csv --source "Local Government Directory"
npm run india:import -- districts path\to\districts.csv --source "Local Government Directory" --apply
```

Never import a dataset as verified solely because it is syntactically valid. Confirm source authority, mapping, UTF-8 content, duplicate behavior, and attribution before applying it.
