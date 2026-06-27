import { describe, expect, it } from "vitest";

import { browseSeoForPath } from "@/utils/browseSeo";

describe("browseSeoForPath", () => {
  it("builds state browse title", () => {
    const meta = browseSeoForPath("/state/up");
    expect(meta.title).toContain("Uttar Pradesh");
    expect(meta.description).toMatch(/official/i);
  });

  it("builds category browse title", () => {
    const meta = browseSeoForPath("/category/ssc");
    expect(meta.title).toContain("SSC");
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

  it("builds results hub title with state and board filters", () => {
    const meta = browseSeoForPath("/results/admit-card", "?state=ka&cat=ssc");
    expect(meta.title).toContain("Admit Cards");
    expect(meta.title).toContain("Karnataka");
    expect(meta.title).toContain("SSC");
    expect(meta.description).toMatch(/Karnataka and SSC/i);
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
