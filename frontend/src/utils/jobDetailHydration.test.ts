import { describe, expect, it } from "vitest";

import {
  jobDetailHasRichContent,
  mergeJobDetailPayloads,
  preferHtmlApplyUrl,
} from "@/utils/jobDetailHydration";

describe("jobDetailHydration", () => {
  it("treats short memorized summaries as incomplete", () => {
    expect(
      jobDetailHasRichContent({
        detail: {
          memorized_at: "2026-07-15T00:00:00Z",
          detail_source: "pdf",
          summary: "x".repeat(401),
        },
      })
    ).toBe(false);
  });

  it("accepts rich content_sections or long summaries", () => {
    expect(
      jobDetailHasRichContent({
        detail: {
          content_sections: [
            {
              heading: "Notification",
              paragraphs: ["Official recruitment notice with eligibility and vacancies. ".repeat(3)],
            },
          ],
        },
      })
    ).toBe(true);
    expect(
      jobDetailHasRichContent({
        detail: { summary: "y".repeat(900) },
      })
    ).toBe(true);
  });

  it("prefers non-PDF apply URLs", () => {
    expect(
      preferHtmlApplyUrl(
        "https://dept.gov.in/notice.pdf",
        "https://dept.gov.in/recruitment/"
      )
    ).toBe("https://dept.gov.in/recruitment/");
  });

  it("merges Storage detail sections onto slim list rows", () => {
    const list: Record<string, unknown> = {
      id: "1",
      slug: "demo-job",
      apply_url: "https://dept.gov.in/notice.pdf",
      detail: {
        memorized_at: "2026-07-15T00:00:00Z",
        summary: "x".repeat(401),
      },
    };
    const storage: Record<string, unknown> = {
      id: "1",
      slug: "demo-job",
      apply_url: null,
      detail: {
        summary: "Full PDF extracted notification text. ".repeat(40),
        content_sections: [
          {
            heading: "Eligibility",
            paragraphs: ["Graduate degree required with two years experience."],
            tables: [],
            lists: [],
            links: [],
          },
        ],
        apply_urls: ["https://dept.gov.in/recruitment/apply"],
      },
    };
    const merged = mergeJobDetailPayloads(list, storage);
    const detail =
      merged?.detail && typeof merged.detail === "object" && !Array.isArray(merged.detail)
        ? (merged.detail as Record<string, unknown>)
        : {};
    const sections = Array.isArray(detail.content_sections) ? detail.content_sections : [];
    expect(sections.length).toBe(1);
    expect(String(detail.summary || "").length).toBeGreaterThan(800);
    expect(merged?.apply_url).toBe("https://dept.gov.in/recruitment/apply");
  });
});
