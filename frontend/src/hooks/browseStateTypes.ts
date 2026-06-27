import type { HomeSortKey } from "@/utils/homePageFilters";
import { ALL_INDIA_JOBS_PATH } from "@/utils/browseRoutes";
import { isResultHubPath } from "@/data/resultTopics";

export type FooterLinkTarget = {
  view?: string;
  section?: string;
  topicKey?: string | null;
  state?: string;
  category?: string;
  sort?: HomeSortKey;
};

const BROWSE_ROUTE_PATHS = [
  "/",
  "/jobs",
  "/results",
  "/results/admit-card",
  "/state/:stateId",
  "/category/:categoryId",
];

export function isBrowseRoutePath(pathname: string): boolean {
  if (pathname === ALL_INDIA_JOBS_PATH) return true;
  if (isResultHubPath(pathname)) return true;
  if (/^\/profession\/[^/]+$/i.test(pathname)) return true;
  if (/^\/qualification\/[^/]+$/i.test(pathname)) return true;
  if (/^\/org\/[^/]+$/i.test(pathname)) return true;
  return (
    BROWSE_ROUTE_PATHS.some((pattern) => {
      if (!pattern.includes(":")) return pathname === pattern;
      if (pattern.startsWith("/state/")) return /^\/state\/[^/]+$/.test(pathname);
      if (pattern.startsWith("/category/")) return /^\/category\/[^/]+$/.test(pathname);
      return false;
    }) || pathname === "/"
  );
}
