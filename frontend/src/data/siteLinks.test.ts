/** @vitest-environment happy-dom */
import { describe, expect, it, afterEach } from "vitest";

import { getSiteOrigin } from "@/data/siteLinks";

describe("getSiteOrigin", () => {
  const originalLocation = window.location;

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  it("uses the current host for govtjobs.me", () => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { origin: "https://www.govtjobs.me" },
    });
    expect(getSiteOrigin()).toBe("https://www.govtjobs.me");
  });

  it("normalizes apex govtjobs.me to www", () => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { origin: "https://govtjobs.me" },
    });
    expect(getSiteOrigin()).toBe("https://www.govtjobs.me");
  });

  it("uses the current host for livegovtjobs.com", () => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { origin: "https://www.livegovtjobs.com" },
    });
    expect(getSiteOrigin()).toBe("https://www.livegovtjobs.com");
  });
});
