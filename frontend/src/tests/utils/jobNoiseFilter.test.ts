import { describe, expect, it } from "vitest";
import { isPortalNoiseJob } from "@/utils/jobNoiseFilter";

describe("isPortalNoiseJob", () => {
  it("filters result waitlists and shortlists", () => {
    expect(
      isPortalNoiseJob({
        title: "MARKS SECURED BY THE CANDIDATES- JUNIOR ASSOCIATES (2024-25) WAITLIST-I",
        apply_url: "https://ongc.gov.in/result",
      })
    ).toBe(true);
    expect(
      isPortalNoiseJob({
        title: "LIST OF CANDIDATES SHORTLISTED AND NEXT IN ORDER OF MERIT FOR OFFLINE ADMISSIONS",
        apply_url: "https://example.gov.in/list",
      })
    ).toBe(true);
  });

  it("filters portal chrome and extension-only notices", () => {
    expect(
      isPortalNoiseJob({
        title: "S3WaaS Logo, link to external site https://s3waas.gov.in/ opens in a new window",
        apply_url: "https://s3waas.gov.in/",
      })
    ).toBe(true);
    expect(
      isPortalNoiseJob({
        title: "Online Registration extended till 15.06.2026",
        apply_url: "https://example.gov.in/",
      })
    ).toBe(true);
  });

  it("keeps real recruitment notifications", () => {
    expect(
      isPortalNoiseJob({
        title: "SSC CGL 2026 Recruitment Notification — 500 Posts",
        apply_url: "https://ssc.gov.in/apply",
        dept: "SSC",
      })
    ).toBe(false);
  });
});
