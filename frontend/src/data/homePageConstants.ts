import type { HeroStatFilterKey } from "@/utils/homePageFilters";
import type { JobRecord } from "@/types/job";
import { effectiveVacancyCount } from "@/utils/jobMetadataUtils";

/** Default: virtualize sooner — fewer DOM nodes on first paint. */
export const VIRTUAL_GRID_MIN = 12;

/** Hero summary cards → job list filter (null = show all on home). */
export const HERO_STAT_FILTERS: Array<{ key: HeroStatFilterKey; labelKey: string }> = [
  { key: "live", labelKey: "home.heroStatJobsLive" },
  { key: "vacancies", labelKey: "home.heroStatJobsVacancies" },
  { key: "states", labelKey: "home.heroStatJobsStates" },
  { key: "hotNew", labelKey: "home.heroStatJobsHotNew" },
];

export function vacancyCountForStats(job: JobRecord) {
  return effectiveVacancyCount(job);
}
