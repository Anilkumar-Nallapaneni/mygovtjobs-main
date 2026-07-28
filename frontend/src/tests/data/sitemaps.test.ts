import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { describe, expect, it } from "vitest";

const publicDir = join(process.cwd(), "public");
const sitemapDir = join(publicDir, "sitemaps");

const CHILD_SITEMAPS = [
  "static-pages.xml",
  "states.xml",
  "qualifications.xml",
  "organizations.xml",
  "results.xml",
  "admit-cards.xml",
  "jobs-active.xml",
  "jobs-archive.xml",
];

function readPublic(path: string) {
  return readFileSync(join(publicDir, path), "utf8");
}

function locations(xml: string) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
}

describe("generated sitemaps", () => {
  it("publishes the complete logical sitemap index", () => {
    const rootIndex = readPublic("sitemap.xml");
    const namedIndex = readPublic("sitemap-index.xml");

    expect(namedIndex).toBe(rootIndex);
    for (const name of CHILD_SITEMAPS) {
      expect(existsSync(join(sitemapDir, name))).toBe(true);
      expect(rootIndex).toContain(`/sitemaps/${name}`);
    }
    expect(rootIndex).not.toContain("/sitemaps/static.xml");
  });

  it("keeps the active-job sitemap aligned with the approved live snapshot", () => {
    const payload = JSON.parse(readPublic("data/live-jobs.json")) as {
      items?: Array<{ slug?: string }>;
    };
    const expected = new Set(
      (payload.items ?? [])
        .map((job) => job.slug)
        .filter((slug): slug is string => Boolean(slug))
        .map((slug) => `https://www.livegovtjobs.com/jobs/${encodeURIComponent(slug)}`)
    );
    const actual = new Set(locations(readPublic("sitemaps/jobs-active.xml")));

    expect(actual).toEqual(expected);
  });

  it("does not duplicate state, qualification, result, or organization routes", () => {
    const grouped = [
      "states.xml",
      "qualifications.xml",
      "organizations.xml",
      "results.xml",
      "admit-cards.xml",
    ].flatMap((name) => locations(readPublic(`sitemaps/${name}`)));

    expect(new Set(grouped).size).toBe(grouped.length);
    expect(readPublic("sitemaps/static-pages.xml")).not.toMatch(
      /\/(?:state|qualification|org|results)\//
    );
  });
});
