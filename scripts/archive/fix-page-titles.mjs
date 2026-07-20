#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const pagesDir = join(dirname(fileURLToPath(import.meta.url)), "..", "frontend/src/pages");

for (const file of readdirSync(pagesDir)) {
  if (!file.endsWith(".tsx")) continue;
  const path = join(pagesDir, file);
  let content = readFileSync(path, "utf8");
  const before = content;

  content = content.replace(
    /document\.title = `\$\{(.+?)\} \| My Govt Jobs`;?/g,
    "document.title = pageTitle($1);"
  );

  if (content.includes("pageTitle(") && !content.includes("@/data/siteMeta")) {
    const importLine = "import { pageTitle } from '@/data/siteMeta'\n";
    const firstImport = content.indexOf("import ");
    if (firstImport >= 0) {
      content = content.slice(0, firstImport) + importLine + content.slice(firstImport);
    } else {
      content = importLine + content;
    }
  }

  if (content !== before) {
    writeFileSync(path, content);
    console.log(`fixed ${file}`);
  }
}
