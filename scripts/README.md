# scripts/

Production and local tooling for My Govt Jobs.

## Canonical commands (prefer these)

| Goal | Command |
|------|---------|
| Daily full ingest + export | `npm run sync:production` |
| RSS / archives (~4h CI) | `npm run sync:quick` |
| Post-deploy verification | `npm run verify:production` |
| Website health | `npm run health:website` / `:full` |
| PDF read (Agent 2) | `npm run pdf:read:live` |
| Job details (Agent 3) | `npm run job:details` |
| Weekly CI enrich | `npm run weekly:enrich:ci` |

See [RUN.md](../RUN.md) for the full table.

## Legacy aliases (still work — prefer canonical)

| Alias | Prefer instead |
|-------|----------------|
| `daily:sync` | `sync:production` (or local `run-daily-8am-sync.py`) |
| `supabase:full-sync` | `sync:production` |
| `data:refresh` | `sync:production` |
| `ingest:direct` / `ingest:all` | `sync:production` / `ingest:direct:quick` for smoke tests |

## archive/

One-off / historical scripts moved out of the main tree so they are not mistaken for daily ops. Do not wire them into CI.
