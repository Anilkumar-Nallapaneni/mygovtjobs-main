# Contributing

Guidelines for adding and organizing components:

- Place reusable UI primitives in `src/components/ui`.
- Keep layout components (Header, Footer, Navigation) in `src/components/layout`.
- Feature-specific containers go in `src/components/features` and should export a single default component from `index.ts`.
- Page-specific small components may live in `src/components/home` and be imported from pages.
- Avoid inline components inside pages; create a separate file for clarity and testing.
- Before removing a file, search the repo for references and consider moving to `examples/` if it might be useful later.

Run checks locally before making a PR:
- `npm run build`
- `npm run lint`
- `npx depcheck` (optional)

Thanks for contributing!
