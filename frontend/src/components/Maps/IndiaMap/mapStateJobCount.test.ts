/** @vitest-environment node */
import { describe, expect, it } from "vitest";
import { jobCountFromStateData } from "./mapStateJobCount";
import type { StateData } from "@/types/MapTypes";

describe("jobCountFromStateData", () => {
  it("reads numeric jobCount", () => {
    const state: StateData = {
      id: "IN-UP",
      name: "Uttar Pradesh",
      fill: "#fff",
      customData: { jobCount: 42 },
    };
    expect(jobCountFromStateData(state)).toBe(42);
  });

  it("parses localized listings string", () => {
    const state: StateData = {
      id: "IN-KA",
      name: "Karnataka",
      fill: "#fff",
      customData: { listings: "1,234" },
    };
    expect(jobCountFromStateData(state)).toBe(1234);
  });

  it("returns 0 when data is missing", () => {
    expect(jobCountFromStateData(undefined)).toBe(0);
  });
});
