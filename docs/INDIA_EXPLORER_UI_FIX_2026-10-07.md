# India Explorer UI fix — 7 October 2026

Scoped correction of the existing India Explorer. No redesign, map replacement, database/schema/LGD changes, commit, push or deployment.

## Root cause

The SVG utility deliberately sets `height:auto`. Its global wrapper reserves a portrait aspect ratio, while Explorer caps only the SVG at560px and separately imposes minimum map heights. On desktop the wrapper still reserves nearly1,000px even though the actual artwork is560px high. The grid stretches the directory to that oversized row, but its own list stops at535px, leaving478px unused at1440px. The1050px breakpoint also forced1024px into a tall stacked layout. A later premium stylesheet repeated independent minimum heights and directory density rules, making import order matter.

The app shell (`.app-shell`, `.app-main`) and `MobileRouteTransition` were inspected: their ordinary page flex sizing does not cause the card defect. They are retained. The State Explorer isolated map rules remain scoped to its overview. Only absent city counts are suppressed there.

State enrichment defaulted absent counts to0, then used truthiness to replace both zero and missing values with dashes. `useIndiaStates` swallowed API errors. The map tooltip lacked keyboard focus handling and an API district-count label.

## Files changed

- `frontend/src/components/Maps/IndiaMap/IndiaMap.tsx`: keyboard tooltip/focus/blur, Escape dismissal, arrow navigation retained, API-count accessible labels, selected-state persistence and bounded tooltip position. Hover/focus uses authoritative state names. Existing canonical click callback retained.
- `frontend/src/pages/IndiaExplorerPage.tsx`: existing state search moved into the directory at full width; district counts come only from verified API results, preserving real zero; missing counts omitted; explicit state service error. No city placeholders or unverified zero city claims.
- `frontend/src/pages/StateExplorerPage.tsx`: city metric displayed only when verified API records exist; map/overview retained.
- `frontend/src/hooks/useIndiaExplorer.ts`: propagate state-list errors instead of swallowing them.
- `frontend/src/styles/india-explorer.css`: coordinated map/directory layout, mobile scroll reset and restrained accessible interactions.
- `frontend/src/styles/premium-v4.css`: remove duplicate sizing/density overrides that conflict with the Explorer's layout owner.
- `frontend/src/tests/pages/IndiaExplorer.lgd.test.tsx`: API count/zero, missing city, failed-count navigation and explicit error regressions.
- `frontend/src/tests/components/Maps/IndiaMap/IndiaMap.interaction.test.tsx`: keyboard count tooltip, activation and persistent/controlled selection regressions. Numeric fixtures are tests only; production counts are not hard-coded.
- `scripts/audit-india-explorer-ui.mjs`: repeatable five-viewport screenshot/dimension/interaction audit using real read-only API responses.
- This report and `docs/audits/india-explorer-ui-2026-10-07/`: baseline, corrected, error screenshots and measured JSON.

## CSS rules removed and added

Removed independent520/440/310px map minimums, premium360–570/300px minimums, the560px SVG cap,535/380px directory caps, desktop two-column directory overrides, and mobile500px district-glance scrolling. The1050px map/directory stack override was replaced; unrelated category and State Explorer breakpoints remain.

Added a65/35 grid (`1.85fr / 1fr`), a natural portrait map stage with600px maximum height, and a100% height SVG/wrapper override scoped to the Explorer map card. The targeted `!important` height overrides the existing utility's inline `height:auto`; other map consumers keep their sizing.

The desktop directory uses `contain:size`, flex sizing and a zero intrinsic list height so its content cannot inflate the shared grid row. The map content determines the row; the list occupies remaining space and scrolls only when needed. At900px and below, containment is removed and the list returns to `height:auto`, normal flow and visible overflow. Cards use two columns at768px and one at360/390px. Search input height44px, all measured cards at least56px. Map paths use180ms fill/filter/opacity/stroke transitions; Explorer continuous job pulses and isolated-map entry animation are disabled. `prefers-reduced-motion` disables transitions/animation. No global map geometry or library changed.

## Measured before/after dimensions

CSS pixel values rounded; map dimensions refer to artwork bounds, not the letterboxed SVG element. Geographic proportions and all islands are preserved. Desktop artwork is about598px tall, versus348/382px on the narrow mobile viewports. At1440px it grows from493×560 to526×598 while the oversized surrounding card shrinks from1,111 to721px. Most of the correction is useful occupancy and eliminated vertical whitespace, not geographic distortion.

| Viewport | Map card before → after (width×height) | Artwork before → after | Directory before → after (height) | Lower gap before → after | Overflow | Layout/scroll |
|---|---|---|---|---|---|---|
| 360×800 | 342×501 → 342×501 | 306×348 → 306×348 | 482 → 2688 | 17 → 17 | None | Map first; natural directory; no nested scroll |
| 390×844 | 372×535 → 372×535 | 336×382 → 336×382 | 482 → 2671 | 17 → 17 | None | Map first; natural directory; no nested scroll |
| 768×1024 | 736×899 → 736×714 | 493×560 → 526×598 | 649 → 1434 | 23 → 23 | None | Map first; natural directory; no nested scroll |
| 1024×768 | 992×1190 → 631×715 | 493×560 → 526×598 | 650 → 715 | 23 → 23 | None | 65/35; internal list scroll |
| 1440×900 | 917×1111 → 883×721 | 493×560 → 526×598 | 1111 → 721 | 478 → 23 | None | 65/35; internal list scroll |

On mobile, the full directory is deliberately long because all36 cards remain in normal document flow; its height is occupied content, not empty space. At1440px the shared cards are721px including borders/header/padding, approximately the requested600–720px useful section range. The map stage itself is capped at600px.

## Viewport assertions and screenshots

All five viewports pass: no positive horizontal overflow, map artwork visible,36 navigable states/UTs, actual API counts rendered for all states (sum784), minimum44px targets, no giant lower gap, desktop shared height/proportions, mobile stack and no nested list scroll. State search works; hover (desktop), keyboard focus/count tooltip, Escape, arrow focus and Enter reach `/india/ka`. Simulated503 shows an explicit error at each viewport, omits unsupported counts, preserves all36 state buttons and their canonical navigation. A failed API is deliberately injected only for the error test; successful counts are actual API responses, cached during the audit, not invented fixtures. Unit tests verify selection persists until changed and respects an external selection key.

In-app Browser discovery returned no available browser, so the repository's installed Playwright/Chromium was used. A read-only test bridge serves actual local FastAPI responses to the local frontend; this does not certify production API deployment.

| Viewport | Before section | After section | After full page | Explicit error |
|---|---|---|---|---|
| 360x800 | [Before](audits/india-explorer-ui-2026-10-07/before-360x800.png) | [After](audits/india-explorer-ui-2026-10-07/after-360x800.png) | [Full page](audits/india-explorer-ui-2026-10-07/after-page-360x800.png) | [503 error](audits/india-explorer-ui-2026-10-07/error-360x800.png) |
| 390x844 | [Before](audits/india-explorer-ui-2026-10-07/before-390x844.png) | [After](audits/india-explorer-ui-2026-10-07/after-390x844.png) | [Full page](audits/india-explorer-ui-2026-10-07/after-page-390x844.png) | [503 error](audits/india-explorer-ui-2026-10-07/error-390x844.png) |
| 768x1024 | [Before](audits/india-explorer-ui-2026-10-07/before-768x1024.png) | [After](audits/india-explorer-ui-2026-10-07/after-768x1024.png) | [Full page](audits/india-explorer-ui-2026-10-07/after-page-768x1024.png) | [503 error](audits/india-explorer-ui-2026-10-07/error-768x1024.png) |
| 1024x768 | [Before](audits/india-explorer-ui-2026-10-07/before-1024x768.png) | [After](audits/india-explorer-ui-2026-10-07/after-1024x768.png) | [Full page](audits/india-explorer-ui-2026-10-07/after-page-1024x768.png) | [503 error](audits/india-explorer-ui-2026-10-07/error-1024x768.png) |
| 1440x900 | [Before](audits/india-explorer-ui-2026-10-07/before-1440x900.png) | [After](audits/india-explorer-ui-2026-10-07/after-1440x900.png) | [Full page](audits/india-explorer-ui-2026-10-07/after-page-1440x900.png) | [503 error](audits/india-explorer-ui-2026-10-07/error-1440x900.png) |

Full-page captures include the existing site shell. Tall section captures can include fixed navigation overlays; full-page screenshots provide unobscured document context. Dimension evidence: [before](audits/india-explorer-ui-2026-10-07/before-dimensions.json), [after](audits/india-explorer-ui-2026-10-07/after-dimensions.json).

## Tests

| Command | Result |
|---|---|
| npm run type-check | PASS |
| npm run lint | PASS; max-warnings0 |
| npm run test | PASS468 frontend tests/94 files;320 backend passed,1 skipped;10 script tests |
| Focused final interaction/page tests | PASS14/14 |
| npm run build | PASS705 modules;130 service-worker entries;10 job-page prerenders |
| npm run audit:india | PASS16 checks |
| npm run audit:india:data | PASS7 source checks; no production import performed |
| node scripts/audit-india-explorer-ui.mjs after | PASS five viewports, real counts and explicit503 states |
| git diff --check | PASS |

Existing HappyDOM fetch-abort teardown diagnostics and one Starlette/httpx deprecation warning remain visible; they did not fail tests. Backend tests used the trusted CA file in TEMP; no environment file was changed. Intermediate browser failures exposed the need for intrinsic-size containment and missing state error propagation; both were corrected and the audit rerun. Initial TypeScript focus-event casting was corrected to a runtime SVGPathElement guard. No test failures are hidden.

No deployment performed. Existing production API hosting/routing approval requirements remain as documented in the release-candidate audit.
