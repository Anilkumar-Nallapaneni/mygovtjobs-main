import { describe, expect, it } from "vitest";

import { formatJobDate, parseJobDate } from "@/utils/formatJobDate";

describe("formatJobDate", () => {
  it("formats ISO dates as 4 Sep 2026", () => {
    expect(formatJobDate("2026-09-04")).toBe("4 Sep 2026");
    expect(formatJobDate("2026-09-04T23:59:59+05:30")).toBe("4 Sep 2026");
  });

  it("returns an em dash for empty values", () => {
    expect(formatJobDate(null)).toBe("—");
    expect(formatJobDate("—")).toBe("—");
  });

  it("supports compact year", () => {
    expect(formatJobDate("2026-09-04", { compact: true })).toBe("4 Sep '26");
  });
});

describe("parseJobDate", () => {
  it("does not shift an ISO calendar date across timezones", () => {
    const d = parseJobDate("2026-09-04");
    expect(d?.getUTCFullYear()).toBe(2026);
    expect(d?.getUTCMonth()).toBe(8);
    expect(d?.getUTCDate()).toBe(4);
  });
});
