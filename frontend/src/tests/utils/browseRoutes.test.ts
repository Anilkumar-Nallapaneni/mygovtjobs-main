import { describe, expect, it } from "vitest";

import {
  buildBrowsePath,
  buildBrowseQuery,
  buildBrowseUrl,
  buildLatestNotifUrl,
  buildResultsHubQuery,
  buildResultsHubUrl,
  isPageReload,
  parseBrowsePath,
  parseBrowseQuery,
  parseLatestNotifQuery,
  parseResultsHubQuery,
  shouldRedirectJobsToHome,
} from "@/utils/browseRoutes";
import { PROFESSION_SLUGS } from "@/data/professions";

describe("browseRoutes", () => {
  it("parses hub URLs", () => {
    expect(parseBrowsePath("/jobs").view).toBe("jobs");
    expect(parseBrowsePath("/sarkari-naukri").view).toBe("jobs");
    expect(parseBrowsePath("/government-jobs").view).toBe("jobs");
    expect(parseBrowsePath("/state/up").stateId).toBe("up");
    expect(parseBrowsePath("/state/ar").stateId).toBe("ar");
    expect(parseBrowsePath("/state/tr").stateId).toBe("tr");
    expect(parseBrowsePath("/category/banking").categoryId).toBe("banking");
    expect(parseBrowsePath("/board/upsc").categoryId).toBe("upsc");
    expect(parseBrowsePath("/board/ssc").categoryId).toBe("ssc");
    expect(parseBrowsePath("/results/admit-card").headlinesTopicKey).toBe("admit-card");
    expect(parseBrowsePath("/results").headlinesTopicKey).toBe("sarkari-result");
    expect(parseBrowsePath("/results/answer-key").headlinesTopicKey).toBe("answer-key");
    expect(parseBrowsePath("/results/syllabus").headlinesTopicKey).toBe("syllabus");
    expect(parseBrowsePath("/alerts").view).toBe("alert");
    expect(parseBrowsePath("/qualification/iti").qualificationSlug).toBe("iti");
    expect(parseBrowsePath("/profession/medical").professionSlug).toBe("medical");
    expect(parseBrowsePath("/profession/dental").professionSlug).toBe("dental");
    expect(parseBrowsePath("/profession/hotel-management").professionSlug).toBe("hotel-management");
    expect(parseBrowsePath("/org/iit-delhi").orgSlug).toBe("iit-delhi");
    expect(parseBrowsePath("/jobs/all-india").allIndia).toBe(true);
  });

  it("builds shareable paths", () => {
    expect(buildBrowsePath({ stateId: "up" })).toBe("/state/up");
    expect(buildBrowsePath({ categoryId: "banking" })).toBe("/board/banking");
    expect(buildBrowsePath({ view: "jobs" })).toBe("/jobs");
    expect(buildBrowsePath({ qualificationSlug: "iti" })).toBe("/qualification/iti");
    expect(buildBrowsePath({ orgSlug: "iit-delhi" })).toBe("/org/iit-delhi");
    expect(buildBrowsePath({ allIndia: true })).toBe("/jobs/all-india");
    expect(buildBrowsePath({ headlinesTopicKey: "answer-key" })).toBe("/results/answer-key");
    expect(buildBrowsePath({ headlinesTopicKey: "sarkari-result" })).toBe("/results");
  });

  it("ignores invalid slugs", () => {
    expect(parseBrowsePath("/state/not-a-state").view).toBe("home");
    expect(parseBrowsePath("/category/unknown").view).toBe("home");
    expect(parseBrowsePath("/board/unknown").view).toBe("home");
  });

  it("parses and builds shareable query params", () => {
    const q = parseBrowseQuery("?filter=graduate&sort=vacancies&hero=live&q=railway&profession=medical");
    expect(q.quickFilter).toBe("graduate");
    expect(q.sort).toBe("vacancies");
    expect(q.heroStatFilter).toBe("live");
    expect(q.search).toBe("railway");
    expect(q.professionSlug).toBe("medical");
    expect(buildBrowseQuery(q)).toBe("?filter=graduate&sort=vacancies&hero=live&q=railway&profession=medical");
    expect(buildBrowseUrl("/jobs", q)).toBe("/jobs?filter=graduate&sort=vacancies&hero=live&q=railway&profession=medical");
  });

  it("parses latest notifications query params", () => {
    const q = parseLatestNotifQuery("?state=up&category=ssc&profession=medical&view=simple&section=expiring&sort=expiringSoon");
    expect(q.stateId).toBe("up");
    expect(q.categoryId).toBe("ssc");
    expect(q.professionSlug).toBe("medical");
    expect(q.viewMode).toBe("simple");
    expect(q.showExpiring).toBe(true);
    expect(q.deadlineWindow).toBe('week');
    expect(q.sort).toBe("expiringSoon");
    expect(buildLatestNotifUrl({ stateId: "up", professionSlug: "medical" })).toBe(
      "/jobs/latest-notifications?state=up&profession=medical"
    );
    expect(parseLatestNotifQuery("?state=tr").stateId).toBe("tr");
    expect(parseLatestNotifQuery("?filter=graduate").quickFilter).toBe("graduate");
    expect(parseLatestNotifQuery("?section=closing-today").deadlineWindow).toBe("today");
  });

  it("detects bare /jobs URLs that should return home on refresh", () => {
    expect(shouldRedirectJobsToHome("/jobs", "")).toBe(true);
    expect(shouldRedirectJobsToHome("/jobs", "?sort=vacancies")).toBe(true);
    expect(shouldRedirectJobsToHome("/jobs", "?q=railway")).toBe(false);
    expect(shouldRedirectJobsToHome("/", "")).toBe(false);
  });

  it("parses and builds results hub query params", () => {
    const q = parseResultsHubQuery("?state=ka&cat=ssc");
    expect(q.stateId).toBe("ka");
    expect(q.categoryId).toBe("ssc");
    expect(buildResultsHubQuery(q)).toBe("?state=ka&cat=ssc");
    expect(buildResultsHubUrl("/results/admit-card", q)).toBe("/results/admit-card?state=ka&cat=ssc");
    expect(parseResultsHubQuery("?state=not-real&cat=unknown").stateId).toBeNull();
  });

  it("parses all 17 profession slugs", () => {
    for (const slug of PROFESSION_SLUGS) {
      expect(parseBrowsePath(`/profession/${slug}`).professionSlug).toBe(slug);
      expect(buildBrowsePath({ professionSlug: slug })).toBe(`/profession/${slug}`);
    }
  });

  it("reports page reload from navigation timing", () => {
    expect(typeof isPageReload()).toBe("boolean");
  });
});
