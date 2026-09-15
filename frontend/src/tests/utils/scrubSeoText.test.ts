import { describe, expect, it } from "vitest";

import { jobSeoDescription, scrubSeoText } from "@/utils/scrubSeoText";

describe("scrubSeoText", () => {
  it("strips PDF page boilerplate", () => {
    expect(scrubSeoText("Page 1 of 10 Recruitment of Assistants in UPSC 2026")).toMatch(
      /Recruitment of Assistants/i
    );
    expect(scrubSeoText("Page 1 of 10")).toBe("");
  });

  it("strips control characters and camscanner noise", () => {
    const out = scrubSeoText("Staff Selection Commission\u0000 notification scanned by CamScanner for clerks");
    expect(out).not.toMatch(/camscanner/i);
    expect(out).toMatch(/Staff Selection Commission/i);
  });

  it("strips PDF table-of-contents labels", () => {
    const out = scrubSeoText(
      "Railway Recruitment Boards Recruitment for Junior Engineer. Table of Contents S.N. Para No. Contents Page No. Eligibility"
    );
    expect(out).not.toMatch(/table of contents/i);
    expect(out).not.toMatch(/page no/i);
    expect(out).toMatch(/Junior Engineer/i);
  });
});

describe("jobSeoDescription", () => {
  it("falls back to title — dept — qualification when scrub empties text", () => {
    expect(
      jobSeoDescription({
        summary: "Page 1 of 10",
        title: "SSC CGL 2026",
        dept: "SSC",
        qualification: "Graduate",
      })
    ).toBe("SSC CGL 2026 — SSC — Graduate");
  });

  it("keeps a readable notification summary", () => {
    const desc = jobSeoDescription({
      summary: "Official SSC CGL notification for 7500 posts across India.",
      title: "SSC CGL 2026",
    });
    expect(desc).toMatch(/Official SSC CGL/i);
    expect(desc).not.toMatch(/Page 1 of/i);
  });
});
