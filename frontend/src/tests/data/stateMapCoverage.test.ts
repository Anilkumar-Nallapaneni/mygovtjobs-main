import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { fromSvgStateId, STATES, toSvgStateId } from "@/data/states";
import { STATE_GLANCE } from "@/data/stateFacts";

const mapsDir = join(dirname(fileURLToPath(import.meta.url)), "../../../public/maps/states");
const svgIds = new Set(
  readdirSync(mapsDir)
    .filter((name) => name.endsWith(".svg"))
    .map((name) => name.replace(/\.svg$/, ""))
);

describe("state map SVG coverage", () => {
  it("every homepage STATES entry resolves to a map file", () => {
    const missing = STATES.map((s) => s.id).filter((id) => !svgIds.has(toSvgStateId(id)));
    expect(missing, `missing SVG for: ${missing.join(", ")}`).toEqual([]);
  });

  it("every state glance record resolves to a map file", () => {
    const missing = Object.keys(STATE_GLANCE).filter((id) => !svgIds.has(toSvgStateId(id)));
    expect(missing, `missing SVG for: ${missing.join(", ")}`).toEqual([]);
  });

  it("round-trips custom svg ids back to internal state ids", () => {
    const custom = ["uk", "od", "cg", "la", "ne", "dd"] as const;
    for (const id of custom) {
      expect(fromSvgStateId(toSvgStateId(id))).toBe(id);
    }
    expect(fromSvgStateId("IN-DD")).toBe("dd");
    expect(fromSvgStateId("IN-DN")).toBe("dd");
  });

  it("composite and synthetic map files exist on disk", () => {
    for (const id of ["IN-LA", "IN-NE", "IN-DH"]) {
      expect(existsSync(join(mapsDir, `${id}.svg`)), `${id}.svg`).toBe(true);
    }
  });
});
