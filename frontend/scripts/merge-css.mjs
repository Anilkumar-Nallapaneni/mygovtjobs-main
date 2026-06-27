import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", "src");

const sections = [
  ["TOKENS", "styles/variables.css"],
  ["GLOBAL", "styles/global.css"],
  ["ErrorBoundary", "components/ErrorBoundary.css"],
  ["BrandLogo", "components/layout/BrandLogo.css"],
  ["Navbar", "components/layout/Navbar.css"],
  ["Footer", "components/layout/Footer.css"],
  ["HomePage", "components/home/HomePage.css"],
  ["StateJobsPanel", "components/home/StateJobsPanel.css"],
  ["LatestNotificationsTable", "components/home/LatestNotificationsTable.css"],
  ["JobCard", "components/jobs/JobCard.css"],
  ["JobDetail", "components/jobs/JobDetail.css"],
  ["IndiaMap", "components/Maps/IndiaMap/IndiaMap.css"],
];

let out = "/* My Govt Jobs — single frontend stylesheet (tokens + all components) */\n\n";

for (const [title, rel] of sections) {
  let c = fs.readFileSync(path.join(root, rel), "utf8");
  if (rel === "styles/global.css") {
    c = c.replace(/@import\s+["']\.\/variables\.css["'];\s*/g, "");
  }
  out += `/* ========== ${title} ========== */\n${c.trim()}\n\n`;
}

out = out.replace(/\.job-card__stats--vacancy-shown\s*\{[^}]*\}\s*/g, "");
out = out.replace(/\.job-card__stat--highlight\s*\{[^}]*\}\s*/g, "");
out = out.replace(/font-family:\s*'Outfit',\s*sans-serif;/g, "font-family: var(--font-sans);");
out = out.replace(
  /\.india-map-container\s*\{[^}]*font-family:[^;]+;/,
  ".india-map-container {\n  font-family: var(--font-sans);"
);

// Merge duplicate @media (max-width: 640px) blocks in HomePage section
out = out.replace(
  /@media \(max-width: 640px\) \{\s*\.home-jobs-grid,\s*\.home-jobs-grid-virtual__row[^}]+\}\s*@media \(max-width: 640px\) \{\s*\.home-jobs-grid[^}]+\}/s,
  `@media (max-width: 640px) {
  .home-jobs-grid,
  .home-jobs-grid-virtual__row,
  .home-jobs-grid {
    grid-template-columns: 1fr !important;
  }

  .home-hero-stats {
    grid-template-columns: repeat(2, 1fr) !important;
  }
}`
);

out += `/* ========== App shell utilities ========== */
.page-fallback {
  padding: 48px 20px;
  text-align: center;
  color: var(--ds-text-muted);
  font-family: var(--font-sans);
}
`;

const outPath = path.join(root, "styles", "app.css");
fs.writeFileSync(outPath, out);
console.log("Wrote", outPath, fs.statSync(outPath).size, "bytes");
