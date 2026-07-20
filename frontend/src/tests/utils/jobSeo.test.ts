import { describe, expect, it } from "vitest";

import {
  buildJobPostingJsonLd,
  parseJobBaseSalary,
  resolveJobPostalAddress,
  resolveValidThrough,
} from "@/utils/jobSeo";

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

  it("skips pay-matrix / free-text salaries", () => {
    expect(parseJobBaseSalary("Level-10 in the Pay Matrix")).toBeNull();
    expect(parseJobBaseSalary("Not specified in the notification")).toBeNull();
  });
});

describe("resolveValidThrough", () => {
  it("uses lastDate when present", () => {
    expect(resolveValidThrough({ lastDate: "2026-08-15" }, "2026-01-01")).toBe("2026-08-15");
  });

  it("falls back to datePosted + 180 days", () => {
    expect(resolveValidThrough({}, "2026-01-01")).toBe("2026-06-30");
  });
});

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
    expect(jsonLd?.educationRequirements).toBe("Graduate");
    expect(jsonLd?.baseSalary).toEqual({
      "@type": "MonetaryAmount",
      currency: "INR",
      value: { "@type": "QuantitativeValue", value: 25000, unitText: "MONTH" },
    });
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
});
