import { describe, expect, it } from "vitest";

import {
  buildJobPostingJsonLd as buildRawJobPostingJsonLd,
  isApprovedActiveJobPosting,
  isRecruitmentJobPosting,
  parseJobBaseSalary,
  resolveJobPostalAddress,
  resolveValidThrough,
} from "@/utils/jobSeo";
import type { JobRecord } from "@/types/job";

function buildJobPostingJsonLd(job: JobRecord): Record<string, unknown> | null {
  return buildRawJobPostingJsonLd({
    status: "live",
    published_to_site: true,
    document_type: "RECRUITMENT",
    verification_status: "VERIFIED",
    completeness_score: 90,
    publication_confidence: 90,
    lastDate: "2099-12-31",
    ...job,
  });
}

describe("resolveJobPostalAddress", () => {
  it("uses explicit city when present", () => {
    expect(
      resolveJobPostalAddress({
        title: "Test",
        city: "Bhavnagar",
        state: "Gujarat",
      })
    ).toEqual({
      addressLocality: "Bhavnagar",
      addressRegion: "Gujarat",
      addressCountry: "IN",
    });
  });

  it("uses state name as locality when city is missing", () => {
    expect(
      resolveJobPostalAddress({
        title: "Test",
        state: "Assam",
        stateIds: ["as"],
      })
    ).toEqual({
      addressLocality: "Assam",
      addressRegion: "Assam",
      addressCountry: "IN",
    });
  });

  it("resolves locality from stateIds when state label is empty", () => {
    expect(
      resolveJobPostalAddress({
        title: "Test",
        stateIds: ["gj"],
      })
    ).toEqual({
      addressLocality: "Gujarat",
      addressRegion: "Gujarat",
      addressCountry: "IN",
    });
  });

  it("falls back to India for nationwide jobs", () => {
    expect(
      resolveJobPostalAddress({
        title: "UPSC",
        state: "All India",
        stateIds: ["all"],
      })
    ).toEqual({
      addressLocality: "India",
      addressRegion: "India",
      addressCountry: "IN",
    });
  });

  it("always returns addressLocality even with no location fields", () => {
    const address = resolveJobPostalAddress({ title: "Bare" });
    expect(address.addressLocality).toBe("India");
    expect(address.addressCountry).toBe("IN");
  });
});

describe("parseJobBaseSalary", () => {
  it("parses INR monthly ranges", () => {
    expect(parseJobBaseSalary("Rs. 35400 - 112400 Per Month")).toEqual({
      "@type": "MonetaryAmount",
      currency: "INR",
      value: { "@type": "QuantitativeValue", minValue: 35400, maxValue: 112400, unitText: "MONTH" },
    });
  });

  it("parses single INR amounts", () => {
    expect(parseJobBaseSalary("Rs. 25000 Per Month")).toEqual({
      "@type": "MonetaryAmount",
      currency: "INR",
      value: { "@type": "QuantitativeValue", value: 25000, unitText: "MONTH" },
    });
  });

  it("skips free-text salaries without INR figures", () => {
    expect(parseJobBaseSalary("Level-10 in the Pay Matrix")).toBeNull();
    expect(parseJobBaseSalary("Not specified in the notification")).toBeNull();
  });

  it("parses pay-matrix strings that include INR ranges", () => {
    expect(parseJobBaseSalary("Pay Matrix Level-6 (Rs. 35400 - 112400)")).toEqual({
      "@type": "MonetaryAmount",
      currency: "INR",
      value: { "@type": "QuantitativeValue", minValue: 35400, maxValue: 112400, unitText: "MONTH" },
    });
  });
});

describe("resolveValidThrough", () => {
  it("uses lastDate when present", () => {
    expect(resolveValidThrough({ lastDate: "2026-08-15" }, "2026-01-01")).toBe(
      "2026-08-15T23:59:59+05:30"
    );
  });

  it("falls back to datePosted + 180 days", () => {
    expect(resolveValidThrough({}, "2026-01-01")).toBe("2026-06-30T23:59:59+05:30");
  });
});

describe("buildJobPostingJsonLd", () => {
  it("omits JobPosting for exam schedules, merit lists, and circulars", () => {
    expect(
      buildJobPostingJsonLd({
        id: "n1",
        slug: "tentative-exam-schedule",
        title: "Tentative Exam Schedule for CEN 01-2025",
        published_at: "2026-01-01",
      })
    ).toBeNull();
    expect(
      isRecruitmentJobPosting({
        title: "AISSAC 2026 Offline Admission Merit List No 2",
      })
    ).toBe(false);
    expect(
      isRecruitmentJobPosting({
        title: "SSC CGL 2026 Recruitment",
        vacancies: 100,
      })
    ).toBe(true);
  });

  it("builds schema.org JobPosting from a job row", () => {
    const jsonLd = buildJobPostingJsonLd({
      id: "1",
      slug: "ssc-cgl-2026",
      title: "SSC CGL 2026 Recruitment",
      dept: "Staff Selection Commission",
      state: "All India",
      vacancies: 7500,
      lastDate: "2027-08-15",
      published_at: "2026-06-01T00:00:00Z",
      detail: { summary: "Official SSC CGL notification for 7500 posts." },
    });

    expect(jsonLd?.["@type"]).toBe("JobPosting");
    expect(jsonLd?.title).toBe("SSC CGL 2026 Recruitment");
    expect(jsonLd?.validThrough).toBe("2027-08-15T23:59:59+05:30");
    expect(jsonLd?.datePosted).toBe("2026-06-01");
    expect(jsonLd?.totalJobOpenings).toBe(7500);

    const location = jsonLd?.jobLocation as {
      address: { addressLocality: string; addressRegion: string; addressCountry: string };
    };
    expect(location.address.addressLocality).toBe("India");
    expect(location.address.addressRegion).toBe("India");
    expect(location.address.addressCountry).toBe("IN");
  });

  it("always includes addressLocality for state jobs", () => {
    const jsonLd = buildJobPostingJsonLd({
      id: "gj-1",
      slug: "csir-csmcri-recruitment-2026",
      title: "CSIR CSMCRI Recruitment 2026",
      dept: "CSIR",
      state: "Gujarat",
      stateIds: ["gj"],
      published_at: "2026-05-20T12:00:00Z",
    });

    const location = jsonLd?.jobLocation as {
      address: { addressLocality: string; addressRegion: string; addressCountry: string };
    };
    expect(location.address.addressLocality).toBe("Gujarat");
    expect(location.address.addressRegion).toBe("Gujarat");
    expect(location.address.addressCountry).toBe("IN");
    expect(jsonLd?.validThrough).toBeTruthy();
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
    expect(jsonLd?.validThrough).toBeTruthy();
  });

  it("includes identifier, educationRequirements, and baseSalary when available", () => {
    const jsonLd = buildJobPostingJsonLd({
      id: "job-42",
      slug: "test-slug",
      title: "Clerk Recruitment",
      dept: "High Court",
      state: "Assam",
      qual: "Graduate",
      salary: "Rs. 25000 Per Month",
      published_at: "2026-01-01",
    });

    expect(jsonLd?.identifier).toEqual({
      "@type": "PropertyValue",
      name: "Live Govt Jobs",
      value: "job-42",
    });
    expect(jsonLd?.educationRequirements).toEqual({
      "@type": "EducationalOccupationalCredential",
      credentialCategory: "bachelor degree",
    });
    expect(jsonLd?.baseSalary).toEqual({
      "@type": "MonetaryAmount",
      currency: "INR",
      value: { "@type": "QuantitativeValue", value: 25000, unitText: "MONTH" },
    });
  });

  it("maps 10th and PG qualifications to Google credentialCategory enums", () => {
    const tenth = buildJobPostingJsonLd({
      id: "e1",
      slug: "tenth",
      title: "Peon Recruitment",
      qual: "10th Pass",
      published_at: "2026-01-01",
    });
    expect(tenth?.educationRequirements).toEqual({
      "@type": "EducationalOccupationalCredential",
      credentialCategory: "high school",
    });

    const pg = buildJobPostingJsonLd({
      id: "e2",
      slug: "pg",
      title: "Officer Recruitment",
      qual: "Post Graduate / MBA",
      published_at: "2026-01-01",
    });
    expect(pg?.educationRequirements).toEqual({
      "@type": "EducationalOccupationalCredential",
      credentialCategory: "postgraduate degree",
    });
  });

  it("omits educationRequirements when qualification cannot be mapped", () => {
    const jsonLd = buildJobPostingJsonLd({
      id: "e3",
      slug: "unknown-qual",
      title: "Specialist",
      qual: "As per notification annexure",
      published_at: "2026-01-01",
    });
    expect(jsonLd?.educationRequirements).toBeUndefined();
  });

  it("includes streetAddress and postalCode only when real values exist", () => {
    const jsonLd = buildJobPostingJsonLd({
      id: "addr-1",
      slug: "with-address",
      title: "Office Recruitment",
      state: "Delhi",
      streetAddress: "CGO Complex, Lodhi Road",
      postalCode: "110003",
      published_at: "2026-01-01",
    });
    const address = (jsonLd?.jobLocation as { address: Record<string, string> }).address;
    expect(address.streetAddress).toBe("CGO Complex, Lodhi Road");
    expect(address.postalCode).toBe("110003");
  });

  it("omits JobPosting when publication approval or the active deadline is missing", () => {
    const base = {
      title: "SSC CGL Recruitment",
      status: "live",
      document_type: "RECRUITMENT",
      verification_status: "VERIFIED",
      completeness_score: 90,
      publication_confidence: 90,
      lastDate: "2099-12-31",
    } satisfies JobRecord;

    expect(buildRawJobPostingJsonLd(base)).toBeNull();
    expect(
      isApprovedActiveJobPosting(
        { ...base, published_to_site: true, lastDate: "2026-07-27" },
        "2026-07-28"
      )
    ).toBe(false);
  });

  it("extracts PIN from address text and skips bare city as streetAddress", () => {
    const withPin = buildJobPostingJsonLd({
      id: "addr-2",
      slug: "pin-in-address",
      title: "HQ Posting Recruitment",
      state: "Delhi",
      streetAddress: "North Block, Raisina Hill, New Delhi 110001",
      published_at: "2026-01-01",
      vacancies: 1,
    });
    const a1 = (withPin?.jobLocation as { address: Record<string, string> }).address;
    expect(a1.postalCode).toBe("110001");
    expect(a1.streetAddress).toMatch(/North Block/i);

    const cityOnly = buildJobPostingJsonLd({
      id: "addr-3",
      slug: "city-only",
      title: "City Job Recruitment",
      state: "Delhi",
      streetAddress: "New Delhi",
      published_at: "2026-01-01",
      vacancies: 1,
    });
    const a2 = (cityOnly?.jobLocation as { address: Record<string, string> }).address;
    expect(a2.streetAddress).toBeUndefined();
  });
});
