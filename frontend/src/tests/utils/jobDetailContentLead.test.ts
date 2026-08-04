import { describe, expect, it } from "vitest";

import { buildRecruitmentLead } from "@/utils/jobDetailContent";

describe("buildRecruitmentLead", () => {
  it("builds a short clean about card from job facts", () => {
    const lead = buildRecruitmentLead({
      title: "SSC CGL 2026",
      dept: "Staff Selection Commission",
      vacancies: 500,
      qual: "Graduate",
      salary: "Pay Level-7",
      age: "18-32 years",
      lastDate: "2026-08-01",
    });

    expect(lead).toContain("SSC CGL 2026");
    expect(lead).toContain("Staff Selection Commission");
    expect(lead).toContain("500");
    expect(lead).toContain("Graduate");
    expect(lead).toMatch(/last date/i);
    expect(lead.length).toBeLessThan(500);
    expect(lead).not.toMatch(/page\s+\d+\s+of\s+\d+/i);
  });

  it("does not dump raw PDF summary text", () => {
    const lead = buildRecruitmentLead({
      title: "ISRO Scientist SC",
      dept: "ISRO",
      vacancies: 10,
      detail: {
        summary:
          "Page 1 of 25 GOVERNMENT OF INDIA " +
          "THE RESPONSIBILITY TO ENSURE THE FULFILLMENT OF ELIGIBILITY CRITERIA ".repeat(20),
      },
    });
    expect(lead).toContain("ISRO Scientist SC");
    expect(lead).not.toMatch(/Page 1 of 25/);
    expect(lead).not.toMatch(/RESPONSIBILITY TO ENSURE/);
  });
});
