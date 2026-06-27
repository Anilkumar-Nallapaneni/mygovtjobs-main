import { describe, expect, it } from "vitest";

import { dateTimeLocale, numberLocale } from "@/utils/formatLocale";

describe("formatLocale", () => {
  it("uses plain en for English UI dates", () => {
    expect(dateTimeLocale("en")).toBe("en");
    expect(dateTimeLocale("en-IN")).toBe("en");
  });

  it("keeps Indian language codes for localized dates", () => {
    expect(dateTimeLocale("te")).toBe("te");
    expect(dateTimeLocale("hi")).toBe("hi");
  });

  it("uses en-IN grouping for English number formatting", () => {
    expect(numberLocale("en")).toBe("en-IN");
  });
});
