import { describe, expect, it } from "vitest";

import { buildJobPostingJsonLd } from "@/utils/jobSeo";

describe("buildJobPostingJsonLd", () => {
  it("builds schema.org JobPosting from a job row", () => {
    const jsonLd = buildJobPostingJsonLd({
      id: "1",
      slug: "ssc-cgl-2026",
      title: "SSC CGL 2026 Recruitment",
      dept: "Staff Selection Commission",
      state: "All India",
      vacancies: 7500,
      lastDate: "2026-08-15",
      published_at: "2026-06-01T00:00:00Z",
      detail: { summary: "Official SSC CGL notification for 7500 posts." },
    });

    expect(jsonLd?.["@type"]).toBe("JobPosting");
    expect(jsonLd?.title).toBe("SSC CGL 2026 Recruitment");
    expect(jsonLd?.validThrough).toBe("2026-08-15");
    expect(jsonLd?.datePosted).toBe("2026-06-01");
    expect(jsonLd?.totalJobOpenings).toBe(7500);
  });
});
