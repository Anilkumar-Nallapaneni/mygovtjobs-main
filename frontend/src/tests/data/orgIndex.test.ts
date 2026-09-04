import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { ORG_INDEX, getOrgBySlug } from "@/data/orgIndex";

describe("org index", () => {
  it("publishes more than one organisation after the P1 widen", () => {
    expect(ORG_INDEX.length).toBeGreaterThan(1);
    expect(ORG_INDEX.every((row) => row.slug && row.dept)).toBe(true);
  });

  it("keeps the bundled index aligned with the public sitemap source", () => {
    const publicIndex = JSON.parse(
      readFileSync(join(process.cwd(), "public/data/org-index.json"), "utf8")
    ) as typeof ORG_INDEX;
    expect(publicIndex).toEqual(ORG_INDEX);
  });

  it("resolves a known organisation slug", () => {
    const first = ORG_INDEX[0];
    expect(getOrgBySlug(first.slug)?.dept).toBe(first.dept);
  });
});
