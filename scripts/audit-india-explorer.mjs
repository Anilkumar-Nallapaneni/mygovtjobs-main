import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
const root = process.cwd();
const required = [
  "database/migrations/041_india_explorer.sql", "database/migrations/042_india_explorer_backend.sql",
  "backend/app/routes/india.py", "scripts/india/import_directory.py", "scripts/run-python.mjs",
  "frontend/src/pages/IndiaExplorerPage.tsx", "frontend/src/pages/StateExplorerPage.tsx",
  "frontend/src/pages/DistrictExplorerPage.tsx", "frontend/src/hooks/useIndiaExplorer.ts",
  "frontend/src/lib/indiaApi.ts", "frontend/src/components/india/ExplorerCategoryCard.tsx",
];
let failed=false; for (const file of required) { if (!existsSync(join(root,file))) { console.error(`MISSING ${file}`); failed=true; } }
const route = readFileSync(join(root,"backend/app/routes/india.py"),"utf8");
for (const needle of ["/states/{state_id}/districts", "/states/{state_id}/districts/{district_id}", "CATEGORY_GROUPS", "JobService"]) if (!route.includes(needle)) { console.error(`MISSING CONTRACT ${needle}`); failed=true; }
console.log(`India Explorer structural audit: ${failed ? "FAILED" : "PASS"}`);
process.exit(failed ? 1 : 0);
