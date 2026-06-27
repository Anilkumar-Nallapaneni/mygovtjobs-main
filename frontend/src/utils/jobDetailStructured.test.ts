import { describe, expect, it } from "vitest";

import { buildStructuredJobDetail } from "@/utils/jobDetailStructured";

describe("buildStructuredJobDetail", () => {
  it("parses imported content sections into structured fields", () => {
    const job = {
      title: "NETRA CEO Recruitment 2026",
      detail: {
        source: "structured-import",
        summary: "NETRA has released CEO notification.",
        important_dates: [{ event: "Last Date", date: "22 June 2026" }],
        content_sections: [
          {
            heading: "Overview",
            paragraphs: ["Company Name NETRA Post Name CEO No of Posts 1"],
            tables: [
              [
                { label: "Company Name", value: "NETRA" },
                { label: "Post Name", value: "Chief Executive Officer" },
                { label: "No of Posts", value: "1" },
                { label: "Apply Mode", value: "Online" },
              ],
            ],
            lists: [],
            links: [],
          },
          {
            heading: "Eligibility Criteria",
            paragraphs: [],
            tables: [],
            lists: [["B.E/B.Tech. or equivalent"]],
            links: [],
          },
          {
            heading: "Selection Process",
            paragraphs: [],
            tables: [],
            lists: [["Document Verification", "Interview"]],
            links: [],
          },
          {
            heading: "Important Links",
            paragraphs: [],
            tables: [],
            lists: [],
            links: [
              {
                label: "Apply Online",
                url: "https://www.ncrtc.co.in/hr-module/user/Login.php",
              },
            ],
          },
        ],
      },
    };

    const structured = buildStructuredJobDetail(job);
    expect(structured.isStructured).toBe(true);
    expect(structured.summary).toContain("NETRA");
    expect(structured.overviewFacts.some((f) => f.label === "Apply Mode")).toBe(true);
    expect(structured.eligibility[0]).toContain("B.E/B.Tech");
    expect(structured.selection).toEqual(["Document Verification", "Interview"]);
    expect(structured.officialLinks[0]?.url).toContain("ncrtc.co.in");
    expect(structured.displaySections.some((s) => s.heading.includes("Eligibility"))).toBe(true);
    expect(structured.displaySections.some((s) => /overview/i.test(s.heading))).toBe(false);
    expect(structured.displaySections.some((s) => /important links/i.test(s.heading))).toBe(false);
    expect(structured.displaySections.some((s) => /^introduction$/i.test(s.heading))).toBe(false);
    expect(structured.articleSections.some((s) => /overview/i.test(s.heading))).toBe(false);
    expect(structured.articleSections.some((s) => /important links/i.test(s.heading))).toBe(false);
  });

  it("dedupes application fee when detail.fee is extracted", () => {
    const job = {
      detail: {
        source: "structured-import",
        summary: "Sample recruitment with fee details.",
        fee: {
          General: "Rs. 500/-",
          SC: "Rs. 250/-",
        },
        content_sections: [
          {
            heading: "Overview",
            paragraphs: [],
            tables: [
              [
                { label: "Post Name", value: "Clerk" },
                { label: "Application Fee", value: "Rs. 500/-" },
              ],
            ],
            lists: [],
            links: [],
          },
          {
            heading: "Application Fee",
            paragraphs: [],
            tables: [],
            lists: [["General: Rs. 500/-", "SC: Rs. 250/-"]],
            links: [],
          },
        ],
      },
    };

    const structured = buildStructuredJobDetail(job);
    expect(structured.overviewFacts.some((f) => /fee/i.test(f.label))).toBe(false);
    expect(structured.articleSections.some((s) => /application fee/i.test(s.heading))).toBe(false);
  });

  it("drops placeholder date header rows", () => {
    const job = {
      detail: {
        source: "structured-import",
        summary: "Sample recruitment notice.",
        important_dates: [{ event: "Event", date: "Date" }, { event: "Last Date", date: "1 Jan 2027" }],
        content_sections: [
          {
            heading: "Eligibility Criteria",
            paragraphs: [],
            tables: [],
            lists: [["Graduate degree required"]],
            links: [],
          },
        ],
      },
    };
    const structured = buildStructuredJobDetail(job);
    expect(structured.importantDates).toEqual([{ event: "Last Date", date: "1 Jan 2027" }]);
  });

  it("handles flat table rows without throwing", () => {
    const job = {
      detail: {
        source: "structured-import",
        summary: "SSC CGL recruitment notice.",
        content_sections: [
          {
            heading: "Overview",
            paragraphs: ["Combined Graduate Level examination."],
            tables: [
              { label: "Post Name", value: "Various Group B & C" },
              { label: "Total Posts", value: "12256" },
            ],
            lists: [],
            links: [],
          },
        ],
      },
    };

    expect(() => buildStructuredJobDetail(job)).not.toThrow();
    const structured = buildStructuredJobDetail(job);
    expect(structured.isStructured).toBe(true);
    expect(structured.overviewFacts.length).toBeGreaterThan(0);
  });
});
