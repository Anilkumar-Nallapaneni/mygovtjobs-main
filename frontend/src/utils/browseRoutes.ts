import { CATS, type CategoryId } from "@/data/categories";
import { STATES } from "@/data/states";
import { isValidLatestNotifStateId } from "@/data/statesChips";
import {
  isValidProfessionSlug,
  professionRoutePath,
} from "@/data/professions";
import {
  QUALIFICATION_SLUGS,
  type QualificationDef,
} from "@/data/qualifications";
import {
  getResultTopicByKey,
  getResultTopicBySlug,
  isValidResultTopicSlug,
  resultTopicRoutePath,
} from "@/data/resultTopics";
import { HERO_STAT_FILTER_KEYS, HOME_SORT_KEYS, type HeroStatFilterKey, type HomeSortKey } from "@/utils/homePageFilters";

export { RESULTS_TOPICS_INDEX_PATH } from "@/data/resultTopics";

export type BrowseView = "home" | "jobs" | "results" | "admit-card" | "alert" | "latest-notifications";

export const LATEST_NOTIFICATIONS_PATH = "/jobs/latest-notifications";
export const ALL_INDIA_JOBS_PATH = "/jobs/all-india";
export const QUALIFICATIONS_INDEX_PATH = "/qualifications";
export const PROFESSIONS_INDEX_PATH = "/professions";
export const ORGANIZATIONS_INDEX_PATH = "/organizations";
export const STATES_INDEX_PATH = "/states";
export const CATEGORIES_INDEX_PATH = "/categories";
export const EXPLORE_HUB_PATH = "/explore";
export const EXAM_CALENDAR_PATH = "/exam-calendar";
export const FAQ_PATH = "/faq";
export const GUIDE_HOW_TO_APPLY_PATH = "/guide/how-to-apply";
export const GUIDE_EXAM_PREP_PATH = "/guide/exam-preparation";
export const EXAMS_INDEX_PATH = "/exams";

export type BrowseLocation = {
  view: BrowseView;
  stateId: string | null;
  categoryId: CategoryId | null;
  headlinesTopicKey: string | null;
  qualificationSlug: string | null;
  professionSlug: string | null;
  orgSlug: string | null;
  allIndia: boolean;
};

export type BrowseQuery = {
  quickFilter: string | null;
  sort: HomeSortKey;
  heroStatFilter: HeroStatFilterKey | null;
  search: string | null;
  professionSlug: string | null;
};

export const LATEST_NOTIF_SORT_KEYS = ["newest", "expiringSoon"] as const;
export type LatestNotifSortKey = (typeof LATEST_NOTIF_SORT_KEYS)[number];

export type LatestNotifQuery = {
  stateId: string | null;
  categoryId: CategoryId | null;
  professionSlug: string | null;
  quickFilter: string | null;
  sort: LatestNotifSortKey;
  viewMode: "simple" | "detailed";
  showExpiring: boolean;
};

const VALID_HERO = new Set<string>(HERO_STAT_FILTER_KEYS);
const VALID_SORT = new Set<string>(HOME_SORT_KEYS);
const VALID_LATEST_SORT = new Set<string>(LATEST_NOTIF_SORT_KEYS);

const VALID_STATE_IDS = new Set<string>(STATES.map((s) => s.id));
const VALID_CATEGORY_IDS = new Set<string>(CATS.map((c) => c.id));
const VALID_QUALIFICATION_SLUGS = new Set<string>(QUALIFICATION_SLUGS);

export function isValidStateId(id: string | null | undefined): id is string {
  return Boolean(id && VALID_STATE_IDS.has(id));
}

export function isValidCategoryId(id: string | null | undefined): id is CategoryId {
  return Boolean(id && VALID_CATEGORY_IDS.has(id));
}

export function isValidQualificationSlug(slug: string | null | undefined): slug is string {
  return Boolean(slug && VALID_QUALIFICATION_SLUGS.has(slug));
}

export function isValidProfessionSlugRoute(slug: string | null | undefined): slug is string {
  return isValidProfessionSlug(slug);
}

export { professionRoutePath };

export function qualificationRoutePath(slug: string): string {
  return `/qualification/${encodeURIComponent(slug)}`;
}

export function orgRoutePath(slug: string): string {
  return `/org/${encodeURIComponent(slug)}`;
}

/** Parse shareable browse paths into navbar + filter state. */
export function parseBrowsePath(pathname: string): BrowseLocation {
  const path = (pathname || "/").replace(/\/+$/, "") || "/";
  const empty = {
    stateId: null as string | null,
    categoryId: null as CategoryId | null,
    headlinesTopicKey: null as string | null,
    qualificationSlug: null as string | null,
    professionSlug: null as string | null,
    orgSlug: null as string | null,
    allIndia: false,
  };

  if (path === "/") {
    return { view: "home", ...empty };
  }
  if (path === "/jobs") {
    return { view: "jobs", ...empty };
  }
  if (path === ALL_INDIA_JOBS_PATH) {
    return { view: "jobs", ...empty, allIndia: true };
  }
  if (path === LATEST_NOTIFICATIONS_PATH) {
    return { view: "latest-notifications", ...empty };
  }
  if (path === "/results") {
    return { view: "results", ...empty, headlinesTopicKey: "sarkari-result" };
  }
  if (path === "/results/admit-card") {
    return { view: "admit-card", ...empty, headlinesTopicKey: "admit-card" };
  }

  const resultSubMatch = /^\/results\/([^/]+)$/i.exec(path);
  if (resultSubMatch) {
    const slug = decodeURIComponent(resultSubMatch[1]).toLowerCase();
    if (isValidResultTopicSlug(slug)) {
      const topic = getResultTopicBySlug(slug);
      if (topic?.topicKey === "admit-card") {
        return { view: "admit-card", ...empty, headlinesTopicKey: "admit-card" };
      }
      return { view: "results", ...empty, headlinesTopicKey: topic?.topicKey ?? null };
    }
  }

  if (path === "/alerts") {
    return { view: "alert", ...empty };
  }

  const qualMatch = /^\/qualification\/([^/]+)$/i.exec(path);
  if (qualMatch) {
    const qualificationSlug = decodeURIComponent(qualMatch[1]).toLowerCase();
    if (isValidQualificationSlug(qualificationSlug)) {
      return { view: "jobs", ...empty, qualificationSlug };
    }
  }

  const professionMatch = /^\/profession\/([^/]+)$/i.exec(path);
  if (professionMatch) {
    const professionSlug = decodeURIComponent(professionMatch[1]).toLowerCase();
    if (isValidProfessionSlug(professionSlug)) {
      return { view: "jobs", ...empty, professionSlug };
    }
  }

  const orgMatch = /^\/org\/([^/]+)$/i.exec(path);
  if (orgMatch) {
    const orgSlug = decodeURIComponent(orgMatch[1]).toLowerCase();
    if (orgSlug) {
      return { view: "jobs", ...empty, orgSlug };
    }
  }

  const stateMatch = /^\/state\/([^/]+)$/i.exec(path);
  if (stateMatch) {
    const stateId = decodeURIComponent(stateMatch[1]).toLowerCase();
    if (isValidStateId(stateId)) {
      return { view: "jobs", ...empty, stateId };
    }
  }

  const categoryMatch = /^\/category\/([^/]+)$/i.exec(path);
  if (categoryMatch) {
    const categoryId = decodeURIComponent(categoryMatch[1]).toLowerCase();
    if (isValidCategoryId(categoryId)) {
      return { view: "jobs", ...empty, categoryId };
    }
  }

  return { view: "home", ...empty };
}

export function applyQualificationToBrowseState(def: QualificationDef): {
  quickFilter: string | null;
  categoryId: CategoryId | null;
} {
  if (def.categoryId) {
    return { quickFilter: null, categoryId: def.categoryId };
  }
  return { quickFilter: def.filterKey ?? def.bucketId ?? null, categoryId: null };
}

export function buildBrowsePath(opts: {
  view?: BrowseView;
  stateId?: string | null;
  categoryId?: CategoryId | string | null;
  qualificationSlug?: string | null;
  professionSlug?: string | null;
  orgSlug?: string | null;
  allIndia?: boolean;
  headlinesTopicKey?: string | null;
}): string {
  if (opts.headlinesTopicKey) {
    const topic = getResultTopicByKey(opts.headlinesTopicKey);
    if (topic) return resultTopicRoutePath(opts.headlinesTopicKey);
  }
  if (opts.allIndia) return ALL_INDIA_JOBS_PATH;
  if (opts.professionSlug && isValidProfessionSlug(opts.professionSlug)) {
    return professionRoutePath(opts.professionSlug);
  }
  if (opts.qualificationSlug && isValidQualificationSlug(opts.qualificationSlug)) {
    return qualificationRoutePath(opts.qualificationSlug);
  }
  if (opts.orgSlug) return orgRoutePath(opts.orgSlug);
  if (opts.stateId && isValidStateId(opts.stateId)) {
    return `/state/${encodeURIComponent(opts.stateId)}`;
  }
  if (opts.categoryId && isValidCategoryId(opts.categoryId)) {
    return `/category/${encodeURIComponent(opts.categoryId)}`;
  }

  switch (opts.view) {
    case "jobs":
      return "/jobs";
    case "results":
      return "/results";
    case "admit-card":
      return "/results/admit-card";
    case "alert":
      return "/alerts";
    case "latest-notifications":
      return LATEST_NOTIFICATIONS_PATH;
    default:
      return "/";
  }
}

export function browseScrollTarget(loc: BrowseLocation): string | null {
  if (loc.stateId) return "india-map-panel";
  if (loc.qualificationSlug || loc.professionSlug || loc.orgSlug || loc.allIndia) return "main-jobs";
  if (loc.view === "jobs") return "main-jobs";
  if (loc.view === "results" || loc.view === "admit-card" || loc.headlinesTopicKey) {
    return "official-headlines";
  }
  if (loc.view === "alert") return "alert-section";
  return null;
}

/** Parse shareable query params: ?filter=graduate&sort=vacancies&hero=live&q=railway&profession=medical */
export function parseBrowseQuery(search: string): BrowseQuery {
  const params = new globalThis.URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const filter = params.get("filter");
  const sortRaw = params.get("sort");
  const hero = params.get("hero");
  const q = params.get("q");
  const professionRaw = params.get("profession");

  return {
    quickFilter: filter?.trim() || null,
    sort: VALID_SORT.has(sortRaw || "") ? (sortRaw as HomeSortKey) : "lastDate",
    heroStatFilter: hero && VALID_HERO.has(hero) ? (hero as HeroStatFilterKey) : null,
    search: q?.trim() || null,
    professionSlug:
      professionRaw && isValidProfessionSlug(professionRaw)
        ? professionRaw.toLowerCase()
        : null,
  };
}

/** Parse /jobs/latest-notifications query: ?state=up&category=ssc&profession=medical&filter=graduate&sort=expiringSoon&view=simple&section=expiring */
export function parseLatestNotifQuery(search: string): LatestNotifQuery {
  const params = new globalThis.URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const stateRaw = params.get("state");
  const categoryRaw = params.get("category");
  const professionRaw = params.get("profession");
  const filter = params.get("filter");
  const sortRaw = params.get("sort");
  const view = params.get("view");
  const section = params.get("section");

  let stateId: string | null = null;
  if (stateRaw === "all-india" || stateRaw === "all") {
    stateId = "all";
  } else if (stateRaw && isValidLatestNotifStateId(stateRaw)) {
    stateId = stateRaw.toLowerCase();
  }

  return {
    stateId,
    categoryId: categoryRaw && isValidCategoryId(categoryRaw) ? categoryRaw : null,
    professionSlug:
      professionRaw && isValidProfessionSlug(professionRaw)
        ? professionRaw.toLowerCase()
        : null,
    quickFilter: filter?.trim() || null,
    sort: VALID_LATEST_SORT.has(sortRaw || "") ? (sortRaw as LatestNotifSortKey) : "newest",
    viewMode: view === "simple" ? "simple" : "detailed",
    showExpiring: section === "expiring",
  };
}

export function buildLatestNotifQuery(opts: Partial<LatestNotifQuery>): string {
  const params = new globalThis.URLSearchParams();
  if (opts.stateId === "all") params.set("state", "all-india");
  else if (opts.stateId) params.set("state", opts.stateId);
  if (opts.categoryId) params.set("category", opts.categoryId);
  if (opts.professionSlug) params.set("profession", opts.professionSlug);
  if (opts.quickFilter) params.set("filter", opts.quickFilter);
  if (opts.sort && opts.sort !== "newest") params.set("sort", opts.sort);
  if (opts.viewMode === "simple") params.set("view", "simple");
  if (opts.showExpiring) params.set("section", "expiring");
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function buildLatestNotifUrl(opts: Partial<LatestNotifQuery> = {}): string {
  return `${LATEST_NOTIFICATIONS_PATH}${buildLatestNotifQuery(opts)}`;
}

export function buildBrowseQuery(opts: Partial<BrowseQuery>): string {
  const params = new globalThis.URLSearchParams();
  if (opts.quickFilter) params.set("filter", opts.quickFilter);
  if (opts.sort && opts.sort !== "lastDate") params.set("sort", opts.sort);
  if (opts.heroStatFilter) params.set("hero", opts.heroStatFilter);
  if (opts.search?.trim()) params.set("q", opts.search.trim());
  if (opts.professionSlug) params.set("profession", opts.professionSlug);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function buildBrowseUrl(pathname: string, query?: Partial<BrowseQuery>): string {
  const path = pathname || "/";
  const qs = buildBrowseQuery(query || {});
  return `${path}${qs}`;
}

/** Results hub query: ?state=ka&cat=ssc (shareable admit/results filters). */
export type ResultsHubQuery = {
  stateId: string | null;
  categoryId: CategoryId | null;
};

export function parseResultsHubQuery(search: string): ResultsHubQuery {
  const params = new globalThis.URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const stateRaw = params.get("state");
  const categoryRaw = params.get("cat");

  return {
    stateId: stateRaw && isValidStateId(stateRaw) ? stateRaw.toLowerCase() : null,
    categoryId: categoryRaw && isValidCategoryId(categoryRaw) ? categoryRaw : null,
  };
}

export function buildResultsHubQuery(opts: Partial<ResultsHubQuery>): string {
  const params = new globalThis.URLSearchParams();
  if (opts.stateId && isValidStateId(opts.stateId)) {
    params.set("state", opts.stateId);
  }
  if (opts.categoryId && isValidCategoryId(opts.categoryId)) {
    params.set("cat", opts.categoryId);
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function buildResultsHubUrl(pathname: string, opts: Partial<ResultsHubQuery> = {}): string {
  const path = pathname || "/results";
  return `${path}${buildResultsHubQuery(opts)}`;
}

/** True on full page reload (F5 / browser refresh), not client-side router navigations. */
export function isPageReload(): boolean {
  if (typeof performance === "undefined") return false;
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  return nav?.type === "reload";
}

/** Bare /jobs with no shareable filters should resolve to home on refresh. */
export function shouldRedirectJobsToHome(pathname: string, search: string): boolean {
  if (pathname !== "/jobs") return false;
  const query = parseBrowseQuery(search);
  return !query.search && !query.quickFilter && !query.heroStatFilter;
}
