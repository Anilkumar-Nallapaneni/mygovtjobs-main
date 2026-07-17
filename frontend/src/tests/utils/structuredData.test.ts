import { describe, expect, it } from "vitest";

import { SITE_NAME } from "@/data/siteMeta";
import { FAQ_ITEMS } from "@/pages/guideContent";
import { buildFaqPageJsonLd, buildOrganizationJsonLd, buildWebSiteJsonLd } from "@/utils/structuredData";

describe("structuredData", () => {
  it("builds WebSite schema with search action", () => {
    const schema = buildWebSiteJsonLd();
    expect(schema["@type"]).toBe("WebSite");
    expect(schema.name).toBe(SITE_NAME);
    expect(schema.potentialAction).toMatchObject({ "@type": "SearchAction" });
  });

  it("builds Organization schema", () => {
    const schema = buildOrganizationJsonLd();
    expect(schema["@type"]).toBe("Organization");
    expect(schema.name).toBe(SITE_NAME);
    expect(Array.isArray(schema.sameAs)).toBe(true);
  });

  it("builds FAQPage schema from FAQ items", () => {
    const schema = buildFaqPageJsonLd(FAQ_ITEMS);
    expect(schema["@type"]).toBe("FAQPage");
    const entities = schema.mainEntity as Array<{ name: string }>;
    expect(entities).toHaveLength(FAQ_ITEMS.length);
    expect(entities[0]?.name).toBe(FAQ_ITEMS[0]?.question);
  });
});
