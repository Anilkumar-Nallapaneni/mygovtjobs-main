# LiveGovtJobs — Consolidated Final Source

This folder uses `mygovtjobs-main.zip` as the authoritative baseline and reviews all seven historical release ZIPs. Historical files are added only when the path is absent from the baseline; newer baseline files are never overwritten. Nested release ZIPs, caches, virtual environments, node_modules and generated build output are excluded.

## First validation

```powershell
npm ci
npm run audit:india
npm run type-check
npm run lint
npm run test
npm run build
```
