import { describe, expect, it } from "vitest";

import { browseSeoForPath } from "@/utils/browseSeo";

describe("browseSeoForPath", () => {
  it("builds state browse title", () => {
    const meta = browseSeoForPath("/state/up");
    expect(meta.title).toContain("Uttar Pradesh");
    expect(meta.description).toMatch(/official/i);
  });

  it("builds board browse title", () => {
    const meta = browseSeoForPath("/board/ssc");
    expect(meta.title).toContain("SSC");
    expect(browseSeoForPath("/category/ssc").title).toContain("SSC");
  });

  it("builds boards index title", () => {
    const meta = browseSeoForPath("/boards");
    expect(meta.title).toMatch(/Board/i);
  });

  it("builds latest notifications title", () => {
    const meta = browseSeoForPath("/jobs/latest-notifications");
    expect(meta.title).toMatch(/Latest Government Job Notifications/i);
  });

  it("builds medical profession latest notifications title", () => {
    const meta = browseSeoForPath("/jobs/latest-notifications", "?profession=medical");
    expect(meta.title).toMatch(/Medical Government Job Notifications/i);
  });

  it("builds state-filtered latest notifications title", () => {
    const meta = browseSeoForPath("/jobs/latest-notifications", "?state=up");
    expect(meta.title).toContain("Uttar Pradesh");
  });

  it("builds sarkari-naukri title and canonical path", () => {
    const meta = browseSeoForPath("/sarkari-naukri");
    expect(meta.path).toBe("/sarkari-naukri");
    expect(meta.title).toMatch(/Sarkari Naukri/i);
    expect(browseSeoForPath("/government-jobs").path).toBe("/sarkari-naukri");
  });

  it("builds results topic titles without falling back to the homepage", () => {
    const meta = browseSeoForPath("/results/syllabus");
    expect(meta.title).toMatch(/Syllabus/i);
    expect(meta.path).toBe("/results/syllabus");
  });

  it("builds results hub title with state and board filters", () => {
    const meta = browseSeoForPath("/results/admit-card", "?state=ka&cat=ssc");
    expect(meta.title).toContain("Admit Cards");
    expect(meta.title).toContain("Karnataka");
    expect(meta.title).toContain("SSC");
    expect(meta.description).toMatch(/Karnataka and SSC/i);
  });

  it("builds unique legal page titles", () => {
    expect(browseSeoForPath("/privacy").title).toMatch(/Privacy/i);
    expect(browseSeoForPath("/terms").title).toMatch(/Terms/i);
    expect(browseSeoForPath("/disclaimer").title).toMatch(/Disclaimer/i);
    expect(browseSeoForPath("/about").path).toBe("/about");
  });

  it("builds alerts page title", () => {
    const meta = browseSeoForPath("/alerts");
    expect(meta.title).toMatch(/Job Alerts/i);
  });

  it("builds profession landing title and description", () => {
    const meta = browseSeoForPath("/profession/medical");
    expect(meta.title).toMatch(/Medical Government Jobs 2026/i);
    expect(meta.description).toMatch(/MBBS/i);
  });

  it("points qualification pages to canonical profession URL in meta", () => {
    const meta = browseSeoForPath("/qualification/medical");
    expect(meta.title).toMatch(/Medical/i);
    expect(meta.description).toMatch(/\/profession\/medical/);
  });
});
