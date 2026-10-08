# State Explorer API wiring — verified 8 October 2026

The requested filename retains 7 October. All new requests and results below are from 8 October. Local wiring is verified; production is **not certified fixed**. No deployment or database mutation was performed.

## Root cause and end-to-end trace

The SPA and its bundled map can identify Andhra Pradesh without loading a database profile. `/india/ap` therefore rendered while its profile request failed. The historical deployed API request returned 404: the Vite Vercel project had no India Python function; an API self-rewrite did not execute the separate local FastAPI server. This was a runtime/wiring failure, not missing LGD districts or an `ap` mapping mismatch.

On the latest read-only live probe, the page still returned 200 but `/api/india/states/ap` returned **500**, rather than the earlier 404. Authenticated, read-only Vercel inspection confirms deployed commit `61117d0482255e4fdde6018e7ef419c83cc1bbfa` and the correct root Vite project. Its production env metadata lists only seven frontend settings, **no server `DATABASE_URL`**. This identifies the current configuration failure: the new function has no connection to the persisted database and backend settings fall back to localhost. Vercel request logs confirm the 500 but provide no nested traceback; therefore the precise exception text is not available. [Sanitized deployment/env-name evidence](audits/vercel-readonly-2026-10-08.json), [request-log evidence](audits/vercel-function-errors-2026-10-08.json).

The local function now fails with explicit sanitized 503 when `VERCEL` is set without server `DATABASE_URL`, before attempting the route. Connection refusal/TLS OS errors also become sanitized 503. Regression tests cover both. No production env was changed, and a successful live request remains required before declaring production fixed.

`StateExplorerPage` resolves `getExplorerState(routeStateId).id` → `useIndiaState('ap')` → `fetchIndiaState('ap')` → `/api/india/states/ap` → root Vercel rewrite captures `_india_path=states/ap` → `api/india.py` rewrites the ASGI path → existing `backend/app/routes/india.py` → parameterized PostgreSQL `state_id='ap'` queries → verified profile/district JSON → state facts and district cards.

**API URL before:** same-origin `/api/india/states/ap` on the inspected deployment; it was not requesting the historical `api.livegovtjobs.com` example.

**API URL after:** same-origin `/api/india/states/ap`, now backed by a repository Python function in the existing Vercel project. No new backend hostname or deployment is invented. The external origin remains an optional override only for an independently verified backend.

Local Vite development can proxy `/api` to port 8000. Its frontend `.env.local` also contains a development loopback origin; a production-mode local compilation would inherit that value. The browser verification explicitly set `VITE_API_URL=''` in the process, without editing environment files. Vite loads frontend env files, not the repository root template. Server `DATABASE_URL` must remain server-only, use the existing transaction pooler, and retain certificate verification. A Windows CA-file path is not portable to a deployment host.

The root framework remains Vite. `api/india.py` exports a top-level ASGI `app`; its backend modules and shared policy files are packaged by root configuration. It exposes read-only India routes and health only, with rate limiting and sanitized database errors. Admin, billing and ingest routes are not exposed by this function. [Vercel Python runtime](https://vercel.com/docs/functions/runtimes/python), [Supabase connection guidance](https://supabase.com/docs/guides/database/connecting-to-postgres).

## Files and behavior

The entrypoint, root Vercel rewrite, inclusion rules and env-template correction were already in user commit `61117d0` when this continuation began. Current work strengthens `api/india.py`, `requirements.txt`, `frontend/src/lib/indiaApi.ts`, `frontend/src/hooks/useIndiaExplorer.ts`, `backend/app/routes/india.py`, API/UI regression tests, `scripts/audit-state-api.mjs`, `scripts/audit-state-explorer-wiring.mjs`, routing tests/harness, the platform audit and `docs/API_DECISION.md`.

The client reports HTTP status and endpoint, rejects HTML masquerading as successful JSON, and validates the returned canonical state ID and nonnegative integer counts. Successful zeros remain zeros; genuinely failed requests remain explicit. No district counts are hard-coded in application code. Live-job counts now use the same publication/date SQL filters as job listings, rather than raw `status='live'` rows. Nationwide records are included consistently.

The isolated Python requirements install exposed a missing timezone dependency; `tzdata` is now pinned alongside the minimal function runtime. Redis is included for the existing optional shared limiter. A fresh isolated environment successfully imports the ASGI application.

## Actual local requests

Full FastAPI `http://127.0.0.1:8000/health`: **200**, database connected. Function requests below use `http://127.0.0.1:8001`, with verified TLS and real existing PostgreSQL rows.

| Request | HTTP | Actual items / total |
|---|---:|---|
| `/api/india/health` | 200 | healthy, connected |
| `/api/india/states` | 200 | 36 states |
| `/api/india/districts` | 200 | 120 returned / 784 total (default pagination) |
| `/api/india/districts?state_id=ap` | 200 | 28 / 28 |
| `/api/india/districts?state_id=ka` | 200 | 31 / 31 |

`node scripts/audit-state-api.mjs` requests the district endpoint and profile for every canonical ID, validates all returned district IDs/verification flags and count agreement, and requires 36 successes, zero unknown mappings and 784 total. It performs no import or write. Complete machine evidence: [state API verification](audits/state-api-verification-2026-10-08.json).

| state_id | State / UT | HTTP | Verified districts |
|---|---|---:|---:|
| jk | Jammu & Kashmir | 200 | 20 |
| hp | Himachal Pradesh | 200 | 12 |
| pb | Punjab | 200 | 23 |
| ch | Chandigarh | 200 | 1 |
| uk | Uttarakhand | 200 | 13 |
| hr | Haryana | 200 | 23 |
| dl | Delhi | 200 | 13 |
| rj | Rajasthan | 200 | 41 |
| up | Uttar Pradesh | 200 | 75 |
| br | Bihar | 200 | 38 |
| sk | Sikkim | 200 | 6 |
| ar | Arunachal Pradesh | 200 | 27 |
| nl | Nagaland | 200 | 17 |
| mn | Manipur | 200 | 16 |
| mz | Mizoram | 200 | 11 |
| tr | Tripura | 200 | 8 |
| ml | Meghalaya | 200 | 12 |
| as | Assam | 200 | 35 |
| wb | West Bengal | 200 | 23 |
| jh | Jharkhand | 200 | 24 |
| od | Odisha | 200 | 30 |
| cg | Chhattisgarh | 200 | 33 |
| mp | Madhya Pradesh | 200 | 55 |
| gj | Gujarat | 200 | 34 |
| mh | Maharashtra | 200 | 36 |
| ap | Andhra Pradesh | 200 | 28 |
| ka | Karnataka | 200 | 31 |
| ga | Goa | 200 | 3 |
| ld | Lakshadweep | 200 | 1 |
| kl | Kerala | 200 | 14 |
| tn | Tamil Nadu | 200 | 38 |
| py | Puducherry | 200 | 2 |
| an | Andaman & Nicobar Islands | 200 | 3 |
| tg | Telangana | 200 | 33 |
| la | Ladakh | 200 | 2 |
| dd | Dadra & Nagar Haveli and Daman & Diu | 200 | 3 |
| **Total** | **36 / 36; zero unknown mappings** | **200** | **784** |

`ap`, `ka`, `tn`, `up`, `dl` and `jk` agree across the frontend canonical mapping, API profile/filter and returned database `state_id`. The user-established migration 043 and immutable LGD dataset were not changed or reapplied.

## Browser routes, viewports and screenshots

Direct navigation and refresh both returned 200 for `/india/ap`, `/india/ka`, `/india/tn`, `/india/up`, `/india/dl` and `/india/jk`; expected API district counts and cards rendered in each. At 360×800, 390×844, 768×1024, 1024×768 and 1440×900 the India map/directory and AP map were visible, with no horizontal overflow. Mobile stacked without nested fixed-height scrolling; desktop kept a substantially larger map and no giant empty lower directory area. State touch targets were at least 44px. All 36 API district counts appeared in the India directory. A separately labelled simulated 503 retained an explicit diagnostic.

These checks execute the configured local root rewrite against the real ASGI/Postgres API; successful API responses are not browser fixtures. They use a standalone code compilation, **not a passing release build or deployed Vercel runtime**. [Results and dimensions](audits/state-explorer-wiring-2026-10-08/results.json), [desktop AP](audits/state-explorer-wiring-2026-10-08/ap-1440x900.png), [mobile AP](audits/state-explorer-wiring-2026-10-08/ap-390x844.png), [desktop India](audits/state-explorer-wiring-2026-10-08/india-1440x900.png), [explicit API error](audits/state-explorer-wiring-2026-10-08/ap-explicit-api-error.png). The folder includes screenshots at every requested viewport and all six state routes. Earlier before/after UI dimensions and CSS removals/additions remain in [the UI report](INDIA_EXPLORER_UI_FIX_2026-10-07.md).

## Verification and remaining honest fields

Type-check, lint, frontend/backend/script tests, `audit:india`, `audit:india:data`, frontend hygiene, performance budgets and `git diff --check` pass. The exact final counts and skips are recorded in [the implementation report](STRUCTURE_AUDIT_IMPLEMENTATION_2026-10-08.md).

`npm run build` was run and is **blocked** by the unchanged release floor: only 9 currently valid notices are available, below 10. The expired notice was removed locally, not replaced with an unverified record. Standalone Vite compilation passes for browser testing; it does not override the release failure.

Capital is `india_states.capital`, currently null for AP, so “Not yet verified” remains. Region is the existing seeded `india_states.region` classification (`south` for AP), not an independently verified capital/profile dataset. Verified cities come from `india_cities`; verified directory records from `india_places`. Current verified city/place coverage is zero, so no city count tile is invented and a successful directory count renders 0. LGD districts prove administrative district records only. Job totals come from separately gated job records. The profile badge describes a verified district directory instead of implying an authoritative complete state profile.

**Stop before deployment:** configure the existing server-only pooler `DATABASE_URL` and valid deployment-host CA configuration in a separately authorized action; verify live API success and any remaining exception; obtain sufficient verified current recruitment data without relaxing gates; then run an approved preview and live verification. Deployed SHA/root were confirmed read-only, not changed. No production DB changes, LGD reimport, TLS bypass, commit, push or deployment were performed by this agent.
