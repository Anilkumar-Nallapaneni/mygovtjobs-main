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

  it("always includes datePosted when published_at is missing", () => {
    const jsonLd = buildJobPostingJsonLd({
      id: "2",
      slug: "csir-csmcri-missing-published",
      title: "CSIR CSMCRI Recruitment 2026",
      dept: "CSIR",
      state: "Gujarat",
      updated_at: "2026-05-20T12:00:00Z",
    });

    expect(jsonLd?.datePosted).toBe("2026-05-20");
  });

  it("falls back to today when no date fields exist", () => {
    const today = new Date().toISOString().slice(0, 10);
    const jsonLd = buildJobPostingJsonLd({
      id: "3",
      slug: "no-dates",
      title: "Recruitment Without Dates",
      dept: "Government",
    });

    expect(jsonLd?.datePosted).toBe(today);
  });
});
