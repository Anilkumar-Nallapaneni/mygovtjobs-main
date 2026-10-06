# India platform

The India Explorer is implemented in the existing frontend and FastAPI application. It uses the canonical `/india` route family and the directory endpoints in `backend/app/routes/india.py`; it is not a separate application.

## Routes

- `/india`: all 36 States and Union Territories, plus available verified directory data.
- `/india/:stateId`: state profile and verified district directory.
- `/india/:stateId/:category`: state category view.
- `/india/:stateId/district/:districtId`: district profile and verified cities and places.
- `/india/:stateId/district/:districtId/:category`: district category view.

Frontend route declarations live in `frontend/src/components/AppRoutes.tsx`. The API client is `frontend/src/lib/indiaApi.ts`; backend endpoints are in `backend/app/routes/india.py`. Database structure and row-level policies are introduced by migrations 041 and 042.

The state master controls which 36 units are displayed. Job counts and directory counts enrich state cards; zero jobs do not remove a State or UT. Directory records are shown only under the verification filters enforced by the API/database.

Run `npm run audit:india` and `npm run audit:india-explorer` to check the master list, routes, API contract, source registry, and sitemap coverage.
