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

  it("shows memorized PDF summary as article body when sections are missing", () => {
    const summary =
      "Nuclear Power Corporation invites applications for Executive Trainee. " +
      "Qualification BE/BTech required. Age limit 18 to 30 years. Last date 31 July 2026.";
    const structured = buildStructuredJobDetail({
      title: "NPCIL ET 2026",
      detail: {
        memorized_at: "2026-07-15T00:00:00Z",
        detail_source: "pdf",
        summary,
      },
    });
    expect(structured.isStructured).toBe(true);
    expect(structured.articleSections.some((s) => /notification/i.test(s.heading))).toBe(true);
    expect(structured.articleSections[0]?.paragraphs.join(" ")).toContain("Nuclear Power");
  });

  it("includes selection paragraphs from PDF sections", () => {
    const structured = buildStructuredJobDetail({
      detail: {
        memorized_at: "2026-07-15T00:00:00Z",
        detail_source: "pdf",
        summary: "Recruitment for clerk posts with written exam.",
        content_sections: [
          {
            heading: "Selection Process",
            paragraphs: ["Candidates will appear for a computer-based test followed by document verification."],
            tables: [],
            lists: [["CBT", "Document Verification"]],
            links: [],
          },
          {
            heading: "How to Apply",
            paragraphs: ["Apply online through the official website before the closing date."],
            tables: [],
            lists: [],
            links: [],
          },
          {
            heading: "Application Fee",
            paragraphs: [],
            tables: [[{ label: "General", value: "Rs. 100/-" }, { label: "SC/ST", value: "Nil" }]],
            lists: [],
            links: [],
          },
        ],
      },
    });
    expect(structured.selection.some((s) => /computer-based test/i.test(s))).toBe(true);
    expect(structured.howToApply.some((s) => /official website/i.test(s))).toBe(true);
    // Fee section is promoted to FeeGrid and removed from article body.
    expect(structured.articleSections.some((s) => /application fee/i.test(s.heading))).toBe(false);
  });

  it("drops ISRO FAQ Answer cards, Paper Code splits, and junk fee", () => {
    const structured = buildStructuredJobDetail({
      title: "ISRO Scientist/Engineer SC",
      detail: {
        memorized_at: "2026-08-04T00:00:00Z",
        detail_source: "pdf",
        summary:
          "Centres/Units of Indian Space Research Organization are engaged in Research and Development. " +
          "Online applications are invited for Scientist/Engineer SC posts.",
        fee: {
          Answer: "All Women candidates (General/SC/ST/OBC/PWBD) are exempted from",
        },
        content_sections: [
          {
            heading: "Overview",
            paragraphs: [
              "RECRUITMENT OF SCIENTIST/ENGINEER SC FREQUENTLY ASKED QUESTIONS AND ANSWERS 1. I wish to apply? Answer: Link is available.",
            ],
            tables: [
              [
                { label: "Advt No. ISRO", value: "ICRB:02(EMC-CEPO):2026 dated 28-07-2026" },
                { label: "Answer", value: "There is no written test for the current advertisement. Shortlisting of the" },
                { label: "Answer", value: "You may select other Universities option available in the drop down menu." },
                { label: "Technology [Paper Code", value: "CS]" },
                { label: "GATE Qualification : Valid GATE score in Electronics [Paper Code", value: "EC]" },
              ],
            ],
            lists: [],
            links: [],
          },
          {
            heading: "Eligibility and Qualification",
            paragraphs: ["BE/B.Tech or equivalent in Electronics & Communication Engineering."],
            tables: [[{ label: "NOTE", value: "Graduation should have been completed within the stipulated duration of the course as" }]],
            lists: [],
            links: [],
          },
        ],
      },
    });

    expect(structured.overviewFacts.some((f) => /^answer$/i.test(f.label))).toBe(false);
    expect(structured.overviewFacts.some((f) => /paper\s*code/i.test(f.label))).toBe(false);
    expect(structured.overviewFacts.some((f) => /Advt No/i.test(f.label))).toBe(true);
    const overviewArticle = structured.articleSections.find((s) => /overview/i.test(s.heading));
    const overviewText = overviewArticle?.paragraphs.join(" ") || "";
    expect(overviewText).not.toMatch(/frequently\s+asked/i);
  });

  it("keeps the memorized PDF notice on the page when overview facts also exist", () => {
    const notice =
      "Opening for Business Development Manager at BOB Capital. " +
      "Minimum graduation or 12th pass with 6 months capital market experience. " +
      "Applications should be submitted on careers@bobcaps.in.";
    const structured = buildStructuredJobDetail({
      title: "BOBCAPS Business Development Manager",
      detail: {
        memorized_at: "2026-10-08T20:28:45Z",
        detail_source: "pdf",
        summary: notice,
        content_sections: [
          {
            heading: "Overview",
            paragraphs: [notice],
            tables: [
              [
                { label: "Role Description", value: "Full-time on-site Business Development Manager." },
                { label: "Qualifications", value: "Graduation or 12th pass" },
              ],
            ],
            lists: [],
            links: [],
          },
        ],
      },
    });

    expect(structured.overviewFacts.some((f) => /Role Description/i.test(f.label))).toBe(true);
    const body = structured.articleSections.find((s) => /overview/i.test(s.heading));
    expect(body?.paragraphs.join(" ")).toContain("careers@bobcaps.in");
  });

  it("turns a mislabeled age-limit table into posts, with one age sentence", () => {
    const structured = buildStructuredJobDetail({
      title: "SAIL Young Professionals",
      qualification: "Engagement",
      age_limit: "Min. Post",
      salary: "Rs. 500",
      detail: {
        memorized_at: "2026-10-08T20:28:52Z",
        detail_source: "pdf",
        summary: "SAIL invites applications for Young Professionals.",
        content_sections: [
          {
            heading: "Age Limit",
            paragraphs: [
              "A. Marketing Division M-1 Marketing - Market Analyst, Kolkata YP-3 1 42 yrs 10 yrs M-2 Marketing - Business Development of Coated Steel, Kolkata YP-1 1 35 yrs 3 yrs",
              "C. Finance Division F-1 F&A - GST & Tax Planning, Kolkata YP-2 1 38 yrs 6 yrs",
            ],
            tables: [],
            lists: [["Qualification & Experience Eligibility:"]],
            links: [],
          },
          {
            heading: "Desirable Qualification",
            paragraphs: [
              "General: Candidate must be an Indian national. Minimum age for this engagement is 23 years. The upper age-limit shall be reckoned as on the closing date.",
            ],
            tables: [],
            lists: [],
            links: [],
          },
        ],
      },
    });

    expect(structured.ageLimit).toEqual(["Minimum age for this engagement is 23 years"]);
    expect(structured.vacancyRows.map((row) => row.post)).toEqual([
      "M-1 Marketing - Market Analyst, Kolkata",
      "M-2 Marketing - Business Development of Coated Steel, Kolkata",
      "F-1 F&A - GST & Tax Planning, Kolkata",
    ]);
    expect(structured.vacancyRows[0]).toMatchObject({
      vacancies: "1",
      payLevel: "YP-3",
      age: "42 years",
      experience: "10 years",
    });
    expect(structured.articleSections.some((s) => /age limit/i.test(s.heading))).toBe(false);
  });

  it("pulls who-can-apply rules out of the general notice", () => {
    const structured = buildStructuredJobDetail({
      detail: {
        memorized_at: "2026-10-08T00:00:00Z",
        detail_source: "pdf",
        summary: "SAIL young professional engagement.",
        content_sections: [
          {
            heading: "Desirable Qualification",
            paragraphs: [],
            tables: [
              [
                {
                  label: "General",
                  value:
                    "a. Candidate must be an Indian national. b. Minimum age for this engagement is 23 years. c. Candidates not fulfilling the requirements specified in this advertisement need not apply.",
                },
              ],
            ],
            lists: [["Who can Apply", "Tenure of Engagement:"]],
            links: [],
          },
        ],
      },
    });

    expect(structured.whoCanApply.some((line) => /Indian national/i.test(line))).toBe(true);
    expect(structured.whoCanApply.some((line) => /23 years/i.test(line))).toBe(true);
    expect(structured.eligibility.some((line) => /^who can apply$/i.test(line))).toBe(false);
  });
});
