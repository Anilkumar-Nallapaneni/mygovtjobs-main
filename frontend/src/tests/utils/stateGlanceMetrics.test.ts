import { describe, expect, it } from "vitest";
import { STATE_GLANCE } from "@/data/stateFacts";
import { STATES, toSvgStateId } from "@/data/states";
import { countStateGlanceVisibleFacts } from "@/utils/stateGlanceMetrics";

describe("state glance metrics (per-state layout)", () => {
  const allGlanceIds = Object.keys(STATE_GLANCE).sort();
  const homepageIds = STATES.map((s) => s.id);

  it("every glance record has at least leadership + geography facts", () => {
    const weak: string[] = [];
    for (const id of allGlanceIds) {
      const m = countStateGlanceVisibleFacts(id);
      if (m.sections < 2 || m.facts < 8) weak.push(`${id}(${m.facts})`);
    }
    expect(weak, `thin glance panels: ${weak.join(", ")}`).toEqual([]);
  });

  it("homepage map states all have glance data and SVG assets", () => {
    const missing = homepageIds.filter((id) => !STATE_GLANCE[id]);
    expect(missing, `no glance for: ${missing.join(", ")}`).toEqual([]);
    for (const id of homepageIds) {
      expect(toSvgStateId(id)).toMatch(/^IN-/);
      expect(countStateGlanceVisibleFacts(id).facts).toBeGreaterThan(0);
    }
  });

  it("reports per-state fact counts for layout tiers", () => {
    const tiers = allGlanceIds.map((id) => {
      const m = countStateGlanceVisibleFacts(id);
      return { id, ...m };
    });

    const minFacts = Math.min(...tiers.map((t) => t.facts));
    const maxFacts = Math.max(...tiers.map((t) => t.facts));
    expect(minFacts).toBeGreaterThanOrEqual(15);
    expect(maxFacts).toBeLessThanOrEqual(35);

    const compact = tiers.filter((t) => t.facts <= 22).map((t) => t.id);
    const full = tiers.filter((t) => t.facts >= 28).map((t) => t.id);
    expect(compact.length).toBeGreaterThan(0);
    expect(full.length).toBeGreaterThan(0);
  });
});
