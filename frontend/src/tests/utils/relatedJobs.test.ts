import { describe, expect, it } from "vitest";

import { pickRelatedJobs } from "@/utils/relatedJobs";
import type { JobRecord } from "@/types/job";

const base = (overrides: Partial<JobRecord>): JobRecord => ({
  id: "1",
  slug: "job-1",
  title: "Job 1",
  dept: "UPSC",
  category: "upsc",
  state: "all",
  stateIds: ["all"],
  detail: { source: "upsc" },
  ...overrides,
});

describe("pickRelatedJobs", () => {
  it("excludes current job and returns same-source matches first", () => {
    const current = base({ slug: "current", detail: { source: "upsc" } });
    const sameSource = base({ slug: "a", title: "A", detail: { source: "upsc" } });
    const other = base({
      slug: "b",
      title: "B",
      dept: "SSC",
      state: "mh",
      stateIds: ["mh"],
      detail: { source: "ssc" },
      category: "ssc",
    });
    const related = pickRelatedJobs(current, [current, sameSource, other]);
    expect(related.map((j) => j.slug)).toEqual(["a"]);
  });

  it("skips expired jobs", () => {
    const current = base({ slug: "current" });
    const expired = base({
      slug: "old",
      lastDate: "2020-01-01",
      detail: { source: "upsc" },
    });
    const related = pickRelatedJobs(current, [current, expired], { nowMs: Date.parse("2026-06-01") });
    expect(related).toHaveLength(0);
  });
});
