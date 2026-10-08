import { describe, expect, it } from "vitest";
import { districtLabel, lookupLgdDistrict } from "@/data/stateDistricts";

describe("district map names", () => {
  it("matches Boudh from the parenthetical map label", () => {
    expect(lookupLgdDistrict("od", "BAUDH (BAUDA)")?.name).toBe("Boudh");
  });

  it("shows a readable name when this directory extract has no code", () => {
    expect(lookupLgdDistrict("dl", "SHAHADRA")).toBeNull();
    expect(districtLabel("dl", "SHAHADRA")).toBe("Shahdara");
    expect(districtLabel("ka", "RAMANAGARAM")).toBe("Ramanagara");
    expect(districtLabel("py", "MAHE")).toBe("Mahe");
    expect(districtLabel("sk", "EAST")).toBe("East Sikkim");
    expect(lookupLgdDistrict("ka", "BAGALKOT")?.name).toBe("Bagalkote");
  });
});
