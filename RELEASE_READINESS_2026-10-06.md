# LiveGovtJobs India Platform V3 — Release Readiness

## Release goal

Make the India Explorer a first-class part of LiveGovtJobs rather than a jobs-only page:

`India -> 36 States/UTs -> Districts -> Cities -> verified categories`

Jobs are an enrichment layer and never determine whether a geographic unit is visible.

## Release checks completed

- Public state master count: 36 PASS
- Database state seed count: 36 PASS
- Synthetic `NE States` removed from public directory: PASS
- State cards independent of jobs: PASS
- District glance/search: PASS
- State -> District -> City routes: PASS
- State job count enrichment: PASS
- Verified-only directory filtering: PASS
- LGD/Open Data source registry: PASS
- India/state/district SEO head handling: PASS (static source inspection)
- Sitemap generator syntax: PASS
- Sitemap generated with India hub + 36 India state URLs: PASS
- Backend Python compilation: PASS
- Node script syntax audit: PASS
- `npm run audit:india`: PASS (16 checks)

## Not claimed

A full production build is NOT claimed from the isolated build environment because a clean `npm ci` exceeded the execution window. The user's Windows checkout must run the release commands below.

## Required Windows release gate

```powershell
npm ci
npm run audit:india
npm run type-check
npm run lint
npm run test
npm run build
```

Then:

```powershell
npm run db:migrate
npm run india:import -- districts data/india/lgd-districts.csv --source "Local Government Directory (LGD)"
npm run india:import -- districts data/india/lgd-districts.csv --source "Local Government Directory (LGD)" --apply
```

Only use `--apply` after the dry run is clean and the source file is an authentic current dataset.

## Production data policy

Do not seed fake schools, hospitals, hotels, companies, tourist locations, facts or district records. Empty means not yet verified/imported.

Use current administrative geography from LGD. Use Open Government Data / Survey of India / official department datasets according to each dataset's scope and date. Historical Census data must be labelled as historical.

## Production deployment

1. Apply migration in Supabase.
2. Import current LGD districts.
3. Import current city/local-body dataset with district mappings.
4. Import only source-attributed verified places.
5. Run local API and frontend tests.
6. Deploy a Vercel preview.
7. Test `/india`, all 36 state cards, representative district pages, search, mobile layout and canonical metadata.
8. Submit sitemap to Google Search Console.
9. Promote preview to production only after verification.
