import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildSeoHubIsland,
  flattenArchiveItems,
  flattenEventsMatching,
  flattenJobItems,
  flattenOrgItems,
  flattenRecruitmentEvents,
  textMatchesBoard,
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

  it("flattens org hubs and does not treat HSSC as SSC", () => {
    const orgs = flattenOrgItems([{ dept: "MPPSC", slug: "mppsc", count: 7 }]);
    assert.equal(orgs[0].href, "/org/mppsc");
    assert.equal(orgs[0].org, "7 live");
    assert.equal(textMatchesBoard("Staff Selection Commission (SSC)", "ssc"), true);
    assert.equal(textMatchesBoard("Haryana Staff Selection Commission (HSSC)", "ssc"), false);
    const rows = flattenEventsMatching(
      {
        byType: {
          result: [
            { organization: "Uttar Pradesh PSC (UPPSC)", title: "PCS", official_url: "https://uppsc.up.nic.in" },
            { organization: "Haryana PSC", title: "HCS", official_url: "https://hpsc.gov.in" },
          ],
        },
      },
      (hay) => /uttar pradesh|uppsc/.test(hay.toLowerCase())
    );
    assert.equal(rows.length, 1);
    assert.match(rows[0].org, /Uttar Pradesh/);
  });

  it("matches event-only org hubs by slugified organisation name", () => {
    const slugify = (value) =>
      String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    const slug = "kerala-psc";
    const rows = flattenEventsMatching(
      {
        byType: {
          result: [
            { organization: "Kerala PSC", title: "LDC", official_url: "https://keralapsc.gov.in" },
            { organization: "Haryana PSC", title: "HCS", official_url: "https://hpsc.gov.in" },
          ],
        },
      },
      (hay) => {
        const deptSlug = slugify(hay);
        return deptSlug === slug || deptSlug.includes(slug) || slug.includes(deptSlug);
      }
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].org, "Kerala PSC");
  });
});
