import { describe, expect, it } from "vitest";

import { boardExamLinksForJob } from "@/utils/jobBoardExamLinks";
import type { JobRecord } from "@/types/job";

describe("boardExamLinksForJob", () => {
  it("builds category-scoped admit and results hub links", () => {
    const job = {
      id: "1",
      title: "SSC CGL 2026",
      category: "ssc",
      dept: "Staff Selection Commission",
    } as JobRecord;

    const links = boardExamLinksForJob(job);
    expect(links).toHaveLength(2);
    expect(links[0].href).toBe("/results/admit-card?cat=ssc");
    expect(links[1].href).toBe("/results?cat=ssc");
    expect(links[0].boardLabel).toMatch(/SSC/i);
  });
});
