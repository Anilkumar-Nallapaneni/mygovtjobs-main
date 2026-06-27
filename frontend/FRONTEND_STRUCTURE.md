# Frontend file conventions

All application source under `src/` uses TypeScript React extensions:

| Kind | Extension | Examples |
|------|-----------|----------|
| React components | `.tsx` | `App.tsx`, `components/**/*.tsx` |
| Hooks, utils, data, i18n | `.ts` | `hooks/`, `utils/`, `data/`, `lib/` |
| Entry | `main.tsx` | |
| Types | `.ts` | `types/` |
| Styles | `styles/*.css` via `styles/app.css` `@import` bundle (imported in `main.tsx`) |

## Key modules (split for maintainability)

| Area | Files |
|------|-------|
| App shell | `App.tsx`, `components/AppRoutes.tsx` |
| Home | `components/home/HomePage.tsx`, `HomeHeroMarketing.tsx`, `HomeMapBlock.tsx`, `HomeJobsListSection.tsx`, `useHomePageDerived.ts` |
| Job detail | `components/jobs/JobDetail.tsx`, `jobDetailUi.tsx` |
| Browse state | `hooks/useBrowseState.ts`, `hooks/browseStateTypes.ts` |
| Theme / news bar | `hooks/useColorMode.ts`, `components/layout/EmploymentNewsBar.tsx` |

- No `.js` / `.jsx` under `src/` (`allowJs: false` in `tsconfig.json`).
- Import without file extensions: `import App from './App'`.
- Shared types: `types/job.ts`. Deadline UI: `hooks/useNow.ts` (not `Date.now()` in render).
- Run `npm run check:frontend`, `npm run type-check`, and `npm run lint` before PRs.
- Category grid counts come from `computeJobAggregates(jobs)` — not static strings in `categories.ts`.

Scripts under `frontend/scripts/` and static JSON under `public/` may stay `.mjs` / `.json`.
