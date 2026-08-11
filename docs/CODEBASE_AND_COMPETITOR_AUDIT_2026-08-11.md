# My Govt Jobs — post-implementation code and competitor audit

Audit date: 11 August 2026. Scope: current repository, verified build/test evidence, public catalog, and observable features of FreeJobAlert, Sarkari Result, MySarkariNaukri, IndGovtJobs, NCS, and Employment News.

## Executive score

**Engineering readiness: 82/100. Product competitiveness: 68/100. Combined: 76/100.**

The release is technically healthy. The limiting factor is no longer build integrity; it is the very small approved public catalog (16 jobs / about 237 vacancies), incomplete lifecycle population, and remaining frontend/backend hotspots.

## Current evidence

- 920 repository files; 338 TypeScript/TSX files; 201 Python files.
- Type-check and lint pass.
- 405 frontend tests pass.
- 214 backend tests pass; 4 environment-dependent tests skip.
- Production build passes with 670 transformed modules and 16 prerendered job pages.
- Repository merge-marker check passes.
- 57 deployable JSON/XML files parse and pass hygiene validation.
- Performance budgets pass.
- Public snapshot verification passes: 16 jobs, all with vacancies, approximately 237 vacancies total.
- Supabase migrations through the comments/bookmarks/control-plane hardening changes were applied.

## Weighted engineering scorecard

| Dimension | Weight | Score | Main evidence |
|---|---:|---:|---|
| Release integrity and CI | 12% | 96 | Merge-marker, JSON/XML, rolling catalog, tests, build and budget gates |
| Data correctness and trust | 16% | 91 | Official-domain enforcement, completeness/confidence gates, PDF memory, QA/watchdog |
| Catalog freshness and breadth | 16% | 28 | Only 16 jobs currently clear publication gates |
| Search and discovery | 10% | 84 | State/category/profession routes, map, closing views, API search |
| Job detail and lifecycle | 10% | 79 | Structured details, timeline model, official PDF/apply paths; population remains incomplete |
| UX, responsive and accessibility | 10% | 82 | Responsive components, skip navigation, axe tooling, route loading, multilingual UI |
| Performance and delivery | 8% | 83 | CDN snapshot, bootstrap, prerendering, PWA, route chunks and enforced budgets |
| Security and privacy | 8% | 91 | RLS, explicit grants, service-role isolation, admin-key routes, Turnstile/rate limits |
| Maintainability | 7% | 61 | Good module boundaries, but large components/services and excessive CSS remain |
| Operations and observability | 3% | 86 | Canonical pipeline, source health, control-plane runs, Sentry and audit scripts |
| **Total** | **100%** | **82/100** | Engineering is deployable; catalog breadth is the major constraint |

## Highest-priority code findings

### P1 — Catalog floor is safe but commercially insufficient

The rolling guard prevents catastrophic drops, but its absolute floor is only 10 rows. The current 16-row catalog is technically valid but cannot compete with portals advertising tens of thousands of vacancies. Keep the gate strict; increase the number of sources that produce complete, verified records.

Implement:

1. Track approved-job yield per source: discovered, parsed, rejected, approved and rejection reason.
2. Prioritize UPSC, SSC, RRB, IBPS, state PSCs, police, teaching, health and PSU feeds.
3. Set staged release objectives: 100, 500, 1,500 and 5,000 active verified jobs.
4. Increase the absolute CI floor only after each stable seven-day production baseline.

### P1 — CSS remains the largest frontend maintenance burden

CSS layering exists, but physical size remains high: `home.css` 87 KB, `layout.css` 62.9 KB and `jobs.css` 40.6 KB. Layers control precedence; they do not remove unused rules.

Implement:

1. Capture CSS coverage on home, browse, detail, account and admin routes at three breakpoints.
2. Remove selectors unused across all route captures.
3. Move account/admin/extensions rules out of shell styles.
4. Add raw source-CSS budgets as well as emitted gzip budgets.

### P1 — Four UI orchestration hotspots remain

`JobDetail.tsx` is 641 lines, `AppRoutes.tsx` 520, `HomeExamUpdatesRow.tsx` 502 and `HomePage.tsx` 488. `LatestNotificationsTable.tsx` is also 458 lines.

Implement controller hooks and presentational sections:

- `useJobDetailController` + header, trust, eligibility, timeline, actions and related sections.
- Route configuration arrays grouped by public, account, reference and admin areas.
- `useExamUpdates` + compact list/tabs/empty sections.
- `useHomePageModel` + independently loaded home sections.

### P1 — Persistence and admin are improved, not finished

`admin.py` is down to 517 lines after operations/moderation extraction, but still mixes review queues, source operations, jobs and ingest. `job_persist_service.py` is 602 lines.

Implement:

- `admin_jobs.py`, `admin_sources.py`, `admin_ingest.py`, and keep shared schemas separately.
- Extract persistence into normalization, identity/deduplication, upsert, publication and snapshot-export services.
- Add write-idempotency tests using two identical ingest passes and asserted stable row/child counts.

### P2 — TypeScript strictness is only a seed

The main project remains `strict: false`; the strict project currently covers a narrow policy slice. Expand by leaf modules first, then adapters, hooks and components. Track the percentage of frontend source files included in strict compilation in CI.

### P2 — Operational command sprawl remains

The canonical runner exists, but legacy commands such as `daily:sync:full`, `pipeline:live:*` and `pipeline:complete` remain callable. Mark them deprecated, prove CI/runbooks do not reference them, then archive their underlying scripts.

### P2 — Public policy is centralized within each runtime, not generated once

Backend SQL imports thresholds from the publication service and frontend has `publicJobPolicy.ts`, which is a major improvement. However, Python and TypeScript constants can still drift. Generate both from one versioned JSON policy contract and add a parity test.

## Competitor feature comparison

Percentages are rubric scores, not traffic or market-share estimates.

| Capability | My Govt Jobs | FreeJobAlert | Sarkari Result | MySarkariNaukri | IndGovtJobs | NCS |
|---|---:|---:|---:|---:|---:|---:|
| Active catalog breadth | 20 | 98 | 90 | 88 | 86 | 82 |
| Official-source transparency | 94 | 76 | 72 | 78 | 74 | 97 |
| Search and structured filters | 86 | 90 | 58 | 88 | 68 | 92 |
| Deadline urgency | 88 | 98 | 84 | 82 | 92 | 60 |
| Results/admit cards/answer keys | 68 | 96 | 99 | 94 | 84 | 45 |
| Recruitment lifecycle | 82 | 86 | 92 | 87 | 72 | 68 |
| Saved jobs/matching/alerts | 78 | 92 | 78 | 84 | 65 | 95 |
| Multilingual reach | 95 | 50 | 45 | 48 | 45 | 68 |
| Accessibility/modern UX | 88 | 62 | 50 | 78 | 58 | 64 |
| Safety and verification | 95 | 72 | 70 | 74 | 70 | 96 |
| SEO landing-page depth | 82 | 98 | 96 | 96 | 92 | 70 |
| Engineering resilience | 91 | 72 | 66 | 74 | 64 | 82 |
| **Average** | **81** | **83** | **78** | **82** | **73** | **80** |

The 81% average is misleading if read alone: My Govt Jobs is competitive in capability design but not in inventory. A job portal with 16 active listings will feel incomplete regardless of architecture.

## What competitors currently do better

- FreeJobAlert exposes very large qualification/state landing inventories and a detailed day-by-day last-date reminder.
- Sarkari Result provides dense, familiar coverage across jobs, admissions, admit cards, answer keys and results.
- MySarkariNaukri combines state discovery, preparation tools, community content and rich lifecycle updates.
- IndGovtJobs publishes broad state/category pages and prominent today/tomorrow deadline pages.
- NCS provides profile-driven matching, SMS alerts, disability-aware preferences, career centres and job fairs.
- Employment News has first-party government authority and editorial/career content.

## Where this product can win

Do not copy competitor density or SEO text volume blindly. The defensible position is:

**Official-source-first + verified PDFs + transparent freshness/corrections + multilingual discovery + complete recruitment timelines.**

This is stronger than competing primarily on duplicated vacancy counts. Every listing should show why it is trusted, when it was checked, what changed, what event comes next and why it matches the user.

## Implementation order

### Next 7 days

1. Add source-yield/rejection dashboards from pipeline control-plane data.
2. Bring the top 25 recruitment bodies to contract-test coverage.
3. Raise approved active inventory to at least 100 without lowering gates.
4. Add route CSS coverage and delete demonstrably unused selectors.
5. Extract `JobDetail` controller and timeline/trust/action sections.

### Days 8–21

1. Reach 500 verified active jobs and at least 80% complete lifecycle metadata for priority sources.
2. Extract the remaining three largest components and split remaining admin concerns.
3. Generate Python/TypeScript public policy constants from one contract.
4. Verify email and web-push delivery, bounce handling, unsubscribe and retry behavior.
5. Expand strict TypeScript coverage to utilities, API adapters and hooks.

### Days 22–45

1. Reach 1,500 verified active jobs across all states and major central bodies.
2. Add correction-history feeds and explainable match reasons.
3. Archive superseded pipelines/scripts after reference scanning.
4. Add route-level visual regression, accessibility and performance trend reports.
5. Build authoritative state/qualification landing pages from verified structured data rather than generic SEO prose.

## Release recommendation

The repository is safe to continue toward deployment, but do not market it as a comprehensive national catalog at 16 active jobs. Launch as a verified beta, show coverage transparently, and graduate the positioning only after the 500-job gate is sustained for at least seven days.

## Complete page-by-page audit

This section maps every route family. Dynamic state, category, qualification, profession, organization, exam, designation and job URLs are reviewed as templates because reviewing each generated slug separately would repeat the same code path.

| Your route/page | Current implementation | Competitor equivalent | Gap | Required code change | Priority |
|---|---|---|---|---|---|
| `/`, `/jobs`, `/government-jobs` | Modern multilingual discovery shell, map, notification table, source/trust UI | All competitors have dense live-update homepages | Excellent structure, insufficient inventory; crawler shell exposes only four notices | Raise approved inventory; SSR/prerender more category blocks; make visible last-updated time explicit | P1 |
| `/latest-notifications` | Strong query-backed table, simple/detailed views, closing-today/week | FreeJobAlert has notifications plus day-wise deadline counts | Your filtering is cleaner; theirs has much greater volume and day-by-day urgency | Add Tomorrow and date tabs; counts per tab; saved-view control; server search after local snapshot limit | P1 |
| `/state/:stateId` | Reuses generic home page with state browse state | Competitors have dedicated state editorial/organization pages | Template is not distinct enough; thin states risk low-value SEO pages | Create state landing controller with PSC, districts, qualifications, deadlines, source coverage and freshness | P1 |
| `/category/:categoryId` | Generic home template with category filter | FreeJobAlert has bank/railway/police/teaching verticals | Missing vertical-specific lifecycle and board navigation | Add category-specific boards, exam calendar, eligibility facets and related results | P1 |
| `/qualification/:slug` | Browse landing with qualification mapping | FreeJobAlert publishes large qualification inventories | Good route model; low counts and limited explanation | Add normalized qualification hierarchy, equivalence notes, active counts and alert CTA | P1 |
| `/profession/:slug` | Profession landing and SEO content | MySarkariNaukri has role/location landing pages | Large static modules; content risks drifting from real inventory | Generate copy/statistics from verified job data; lazy-load editorial blocks | P2 |
| `/org/:slug` | Organization filtering from generated index | Competitors have dedicated recruitment-board pages | Index currently includes only organizations meeting a small-job threshold | Add organization profile, official domains, source health, recruitment history and lifecycle events | P1 |
| `/explore` | Navigation hub | FreeJobAlert homepage itself acts as mega-index | Clean but requires an extra click | Keep clean hub; add live counts and recently updated facets | P2 |
| `/qualifications` | Qualification index | FreeJobAlert Jobs by Education | Functionally present | Sort by live count and show zero-coverage transparently | P2 |
| `/professions` | Profession index | MySarkariNaukri role pages | Present but reference-data heavy | Route-load reference dataset; display verified counts | P2 |
| `/organizations` | Generated organization index | Competitor board/department indexes | Very thin with current catalog | Generate from source registry as well as active jobs; distinguish covered vs active | P1 |
| `/states` | All-state index/map | MySarkariNaukri state explorer | Stronger visualization, weaker inventory | Add updated-at, source count, active job count, closing-soon count per state | P1 |
| `/categories` | Category index | FreeJobAlert category navigation | Present, visually cleaner | Add board counts and category-specific alerts | P2 |
| `/jobs/:slug` | Rich detail hydration, official links, PDF parsing, trust, bookmarks, report | Sarkari Result/FreeJobAlert detail pages are dense and lifecycle rich | Your trust model is better; lifecycle population and structured field coverage lag | Complete correction/exam/admit/answer/result history; add why-matched; surface report resolution lookup | P1 |
| `/results`, `/results/:topicSlug`, `/results/admit-card` | Reuses the jobs home template | Competitors have separate, heavily populated result products | Semantically wrong page reuse; weak lifecycle distinction | Redirect to canonical new hubs or build dedicated event-list pages; avoid multiple URLs for same generic template | P1 |
| `/latest-results` | 32-line wrapper around recruitment-event list | FreeJobAlert/Sarkari Result have rich result indexes | Too thin; no filtering, board/state/exam grouping or archive | Add event date, result type, board, state, exam, official document and prior-stage links | P1 |
| `/admit-cards` | Same generic ResultsHub component with event type | Competitors show exam date, status and download instructions | Thin wrapper and dependent on sparse recruitment events | Add exam/date/status filters, download availability, official evidence and notification link | P1 |
| `/answer-keys` | Same ResultsHub wrapper | Competitors include provisional/final, objection dates and response sheets | Missing answer-key-specific fields | Model provisional/final version, objection window/fee, response sheet and revised key | P1 |
| `/upcoming-exams` | Same event-list wrapper | Competitors provide calendars and exam-date updates | Overlaps `/exam-calendar` | Merge into one canonical exam calendar and redirect duplicate route | P1 |
| `/exams` | Exam index | Competitors offer syllabus, pattern and preparation | Strong reference model, but data module is 564 lines | Route-load exam records; connect every exam to current recruitment events | P2 |
| `/exam/:examSlug` | 215-line exam landing | MySarkariNaukri/Testbook-style exam pages | Good foundation; limited live linkage | Add notification history, current stage, syllabus, pattern, dates, admit/result events | P1 |
| `/exam-calendar` | Date-oriented page | FreeJobAlert exam dates | Present but needs much more event data | Use recruitment_events as source; calendar/list toggle; iCal export and reminders | P1 |
| `/alerts` | Email/WhatsApp/Telegram/push UI and filters | FreeJobAlert registration, NCS preference alerts | Good channel UI; delivery proof and preference editing need production verification | Add verified-channel status, delivery history, retry/bounce state and test notification | P1 |
| `/account` | Auth/profile/subscriptions | NCS has a much richer jobseeker profile | Too limited for explainable matching | Add qualifications, categories, preferred locations, disability/accessibility needs and alert schedule | P1 |
| `/account/bookmarks` | Supabase-backed saved jobs | Competitors provide saved jobs/account tools | Saved entries disappear when not present in current 16-row snapshot | Resolve saved jobs through API by IDs; show archived/closed jobs with status instead of hiding | P1 |
| `/admission` | Static list of official portals | FreeJobAlert has live admission notifications/results | Directory, not a product | Either ingest structured admission events or remove from primary navigation until maintained | P2 |
| `/scholarships` | Static official-link directory | Scholarship portals offer eligibility/date search | Directory lacks deadlines, eligibility and status | Add structured scholarship data pipeline or label clearly as official-links directory | P2 |
| `/yojana` | Static scheme-link directory | Dedicated scheme portals have eligibility and benefit detail | Outside core job mission; creates maintenance/SEO dilution | Move under resources and keep out of primary job navigation unless a real scheme pipeline exists | P3 |
| `/designations`, `/designation/:slug` | Index plus landing page | Competitors expose job-role pages | Useful SEO/discovery route | Generate counts/content from live data; merge with profession taxonomy if overlapping | P2 |
| `/alerts`, social/subscribe blocks | Multiple alert entry points | Competitors strongly promote WhatsApp/mobile app | Good coverage but duplicated calls to action | Centralize one alert conversion component and instrument funnel stages | P2 |
| `/guide/how-to-apply`, `/guide/exam-preparation` | Static guide content | Competitors have large preparation libraries/tools | Useful but shallow | Keep concise; add official examples and safety checklists rather than generic SEO volume | P2 |
| `/faq` | Static FAQ | Common competitor feature | Adequate | Generate FAQ schema and test translated answers | P3 |
| `/about`, `/contact`, `/privacy`, `/terms`, `/disclaimer` | Static/legal/contact pages | All reputable competitors provide these | Present | Add ownership/editorial policy, corrections SLA, data retention and grievance contact | P1 |
| `/sitemap` and XML sitemaps | Human sitemap plus eight XML sitemap groups | Competitors have very deep indexes | Technically strong; shallow because inventory is shallow | Add lifecycle/event sitemap groups when content becomes substantial | P2 |
| `/admin` | Lazy-loaded dashboard with backend key enforcement | Not publicly comparable | Operationally useful; bundle is still 33.6 KB gzip and route guard is soft UI only | Build admin as separate deployment or exclude it entirely when disabled | P2 |
| `*` | Dedicated not-found page | Standard | Adequate | Add search and popular live destinations to recover users | P3 |

## Competitor-by-competitor differences

### FreeJobAlert

What it has that you do not yet have:

- Extremely broad job, education and lifecycle inventory.
- Day-by-day deadline navigation, including today, tomorrow and individual dates.
- Separate high-volume pages for notifications, results, admit cards, exam dates, answer keys, cutoffs, written marks, interview results, syllabus, exam patterns and previous papers.
- Mature qualification, state, gender, sector and special-interest landing pages.
- User account and mobile-app conversion loops.
- Utility tools such as image/PDF conversion and interview support.

What your code does better:

- Clear official-domain boundary and publication gate.
- Better modern interaction design and localization.
- Stronger automated integrity, test and bundle gates.
- Better correction/report/freshness foundation.

Do not copy its enormous homepage. Copy its taxonomy, deadline completeness and lifecycle coverage.

### Sarkari Result

What it has that you do not yet have:

- Very high recognition and a habitual three-column jobs/results/admit-card information architecture.
- Dense historical coverage and frequent update pages.
- Separate recruitment pages that stay useful throughout the entire exam lifecycle.
- Mobile app and large social distribution.

What your code does better:

- Cleaner UI, accessibility foundation, multilingual support and source verification.
- Structured data model rather than primarily editorial pages.

Copy lifecycle continuity and information density on detail pages, not its visual design.

### MySarkariNaukri

What it has that you do not yet have:

- Mature state/city/job-role landing pages.
- Practice tests, community content, candidate tools and employment-news content.
- Greater results/admit-card/answer-key coverage.
- Strong internal linking between roles, locations and exam stages.

What your code does better:

- Stronger official-source rules, multilingual UI and release automation.

Copy its cross-link graph and role/location completeness. Avoid adding community or mock tests until the core catalog is healthy.

### IndGovtJobs

What it has that you do not yet have:

- Broad category/state/date pages and visible today/tomorrow deadline content.
- Large long-tail recruitment archive.
- Simple, crawler-friendly HTML tables.

What your code does better:

- UX, structured verification, account features and engineering quality.

Copy its crawlable summaries and long-tail source coverage, not its blog-style duplication.

### NCS

What it has that you do not yet have:

- Full jobseeker profile and preference system.
- Skill/location/disability-aware matching.
- SMS alerts, employer interaction, counsellors, career centres and job fairs.
- Government ownership and direct trust.

What your code does better for this niche:

- Focused government recruitment presentation, PDF evidence and recruitment lifecycle modeling.

Copy profile-driven explainable matching and accessibility preferences. Do not attempt employer/counsellor marketplace scope.

### Employment News

What it has that you do not yet have:

- First-party editorial authority and weekly issue/archive model.
- Career articles and official job highlights.

What your code does better:

- Search, filtering, alerts, responsive UI and automation.

Use Employment News as a high-authority source and issue archive; do not become a general career magazine.

## Repository-wide line-pattern findings

The full source inventory was scanned for risk patterns. Counts are directional because some occurrences are legitimate type declarations, test instrumentation or boundary logging.

| Pattern | Count | Decision |
|---|---:|---|
| TypeScript `any` token | 33 | Review individually; replace application-level occurrences with schemas/unknown narrowing |
| ESLint/TypeScript suppression directives | 2 | Low; require justification comments and prevent growth |
| Inline JSX style objects | 52 | Move repeated styles into route-layer CSS; static hubs contain obvious examples |
| Frontend console logging | 39 | Route operational errors through one logger/Sentry abstraction; strip debug logs |
| Direct frontend `fetch()` calls | 19 | Centralize retry, timeout, schema validation and telemetry in API clients |
| Component/page `Date.now()` | 2 | Both are event/storage timing in SubscribeBanner, not render-time deadline calculations |

## Exact implementation backlog

### P1 — required before claiming parity

1. Raise active verified listings from 16 to at least 500 while preserving the publication gate.
2. Build dedicated results, admit-card, answer-key and exam-date page models instead of thin generic wrappers.
3. Resolve bookmarked jobs through the API so closed/snapshot-absent entries remain visible.
4. Populate recruitment events for the top 25 boards and expose correction/objection windows.
5. Build dedicated state and category landing controllers with verified counts and source coverage.
6. Verify alerts end-to-end and display delivery/channel health to users.
7. Split JobDetail, AppRoutes, HomeExamUpdatesRow and HomePage.
8. Split remaining admin and persistence responsibilities.

### P2 — required for maintainable scale

1. Remove dead CSS using route coverage and reduce the three largest source stylesheets by at least 40%.
2. Expand strict TypeScript coverage and report its percentage in CI.
3. Centralize direct fetch calls and runtime response validation.
4. Route-load large exam/profession/state-fact datasets.
5. Merge overlapping routes: results aliases and upcoming-exams/exam-calendar.
6. Deprecate and archive superseded pipeline scripts.
7. Add page-level accessibility, visual regression and metadata tests for every route family.

### P3 — only after core parity

1. Candidate calculators and document tools.
2. Preparation/community features.
3. Expanded admission/scholarship/scheme products.
4. Native mobile app packaging beyond the current PWA/TWA preparation.

## Definition of done

The site is genuinely comparable when it sustains all of the following:

- At least 500 verified active jobs initially, moving toward 1,500+.
- At least 90% of priority listings have vacancy, qualification, dates, official notification and apply path.
- At least 80% of priority recruitments expose their current lifecycle stage.
- Saved searches and alert delivery succeed end-to-end with observable delivery status.
- Every route family has metadata, accessibility, mobile, visual and empty/error-state tests.
- No frontend component exceeds 350 lines and no backend route/service exceeds 400 lines without documented justification.
- Initial and route bundles remain within enforced budgets.
- Public-job policy parity is tested across SQL, API, export and frontend.
