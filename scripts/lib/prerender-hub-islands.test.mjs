import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildSeoHubIsland,
  flattenArchiveItems,
  flattenJobItems,
  flattenRecruitmentEvents,
} from "./prerender-hub-islands.mjs";

describe("prerender hub islands", () => {
  it("flattens recruitment events into list rows", () => {
    const rows = flattenRecruitmentEvents(
      {
        byType: {
          result: [
            {
              organization: "SSC",
              title: "CGL",
              official_url: "https://ssc.gov.in",
              events: [{ title: "SSC CGL result", event_date: "2026-08-10", official_url: "https://ssc.gov.in/r" }],
            },
          ],
        },
      },
      "result"
    );
    assert.equal(rows[0].title, "SSC CGL result");
    assert.equal(rows[0].org, "SSC");
  });

  it("builds an island with H1 and list links", () => {
    const html = buildSeoHubIsland({
      title: "Sarkari Naukri 2026",
      lede: "Official government jobs.",
      body: "Only .gov.in sources.",
      items: [{ title: "RRB NTPC", org: "RRB", date: "2026-09-30", href: "/jobs/rrb-ntpc" }],
    });
    assert.match(html, /id="seo-hub"/);
    assert.match(html, /<h1>Sarkari Naukri 2026<\/h1>/);
    assert.match(html, /href="\/jobs\/rrb-ntpc"/);
    assert.match(html, /RRB/);
  });

  it("flattens archive and job items", () => {
    assert.equal(flattenArchiveItems({ items: [{ title: "Cutoff", link: "https://upsc.gov.in/x", dept: "UPSC" }] })[0].org, "UPSC");
    assert.equal(flattenJobItems([{ title: "ISRO", slug: "isro", dept: "ISRO", last_date: "2026-10-01" }])[0].href, "/jobs/isro");
  });
});
