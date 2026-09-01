import { useDeferredValue, useMemo } from "react";
import { STATES } from "@/data/states";
import { jobMatchesStateFilter } from "@/data/jobRegion";
import {
  QUICK_FILTER_KEYS,
  aggregateCountsByQuickFilter,
  computeEducationVacancySummary,
} from "@/utils/educationVacancySummary";
import {
  filterHomePageJobs,
  filterNationwideJobsForState,
  jobMatchesHeroStatFilter,
} from "@/utils/homePageFilters";
import { isJobExpired } from "@/utils/jobFilters";
import { partitionClosingDeadlineJobs } from "@/utils/latestNotificationsFilters";
import { useBrowseContext } from "@/context/BrowseContext";
import type { HomePageProps } from "@/types/homePage";
import { vacancyCountForStats } from "@/data/homePageConstants";
import { useNow } from "@/hooks/useNow";

type DerivedInput = Pick<HomePageProps, "jobs" | "catalogStats">;

export function useHomePageDerived({ jobs = [], catalogStats }: DerivedInput) {
  const browse = useBrowseContext();
  const nowMs = useNow();
  const {
    selectedState,
    activeCat,
    search,
    quickFilter,
    heroStatFilter,
    sort,
    qualificationSlug,
    professionSlug,
    orgDept,
    orgSlug,
    allIndiaBrowse,
  } = browse;

  const deferredJobs = useDeferredValue(jobs);
  const deferredSearch = useDeferredValue(search);
  const deferredQuickFilter = useDeferredValue(quickFilter);
  const deferredHeroStatFilter = useDeferredValue(heroStatFilter);
  const deferredSort = useDeferredValue(sort);
  const deferredQualificationSlug = useDeferredValue(qualificationSlug);
  const deferredProfessionSlug = useDeferredValue(professionSlug);
  const deferredOrgDept = useDeferredValue(orgDept);
  const deferredOrgSlug = useDeferredValue(orgSlug);
  const deferredAllIndiaBrowse = useDeferredValue(allIndiaBrowse);

  const filtered = useMemo(
    () =>
      filterHomePageJobs({
        jobs: deferredJobs,
        selectedState,
        activeCat,
        search: deferredSearch,
        quickFilter: deferredQuickFilter,
        heroStatFilter: deferredHeroStatFilter,
        sort: deferredSort,
        qualificationSlug: deferredQualificationSlug,
        professionSlug: deferredProfessionSlug,
        orgDept: deferredOrgDept,
        orgSlug: deferredOrgSlug,
        allIndiaOnly: deferredAllIndiaBrowse,
        nowMs,
      }),
    [
      deferredJobs,
      selectedState,
      activeCat,
      deferredSort,
      deferredSearch,
      deferredQuickFilter,
      deferredHeroStatFilter,
      deferredQualificationSlug,
      deferredProfessionSlug,
      deferredOrgDept,
      deferredOrgSlug,
      deferredAllIndiaBrowse,
      nowMs,
    ]
  );

  const nationwideForState = useMemo(
    () =>
      filterNationwideJobsForState({
        jobs: deferredJobs,
        selectedState,
        search: deferredSearch,
        activeCat,
        quickFilter: deferredQuickFilter,
        sort: deferredSort,
        nowMs,
      }),
    [deferredJobs, selectedState, deferredSort, deferredSearch, activeCat, deferredQuickFilter, nowMs]
  );

  const quickFilterCounts = useMemo(() => {
    const summary = computeEducationVacancySummary(jobs);
    return aggregateCountsByQuickFilter(summary);
  }, [jobs]);

  const heroStats = useMemo(() => {
    let posts = 0;
    let withPostCount = 0;
    let hotNew = 0;
    let stateListings = 0;
    const statesWithListings = new Set<string>();
    let live = 0;
    for (const job of jobs) {
      if (isJobExpired(job, nowMs)) continue
      const vacancies = vacancyCountForStats(job);
      if (vacancies > 0) withPostCount += 1;
      if (vacancies > 0) posts += vacancies;
      if (job?.status === "hot" || job?.status === "new") hotNew += 1;
      const matchedStates = STATES.filter((s) => jobMatchesStateFilter(job, s.id));
      if (matchedStates.length) {
        stateListings += 1;
        matchedStates.forEach((s) => statesWithListings.add(s.id));
      }
      if (jobMatchesHeroStatFilter(job, "live", nowMs)) live += 1;
    }
    const catalogVacancies = Number(catalogStats?.vacancies) || 0;
    const catalogNoticesWithVacancies = Number(catalogStats?.noticesWithVacancies) || 0;
    const catalogLiveNotices = Number(catalogStats?.liveNotices) || 0;

    return {
      posts: catalogVacancies || posts,
      withPostCount: catalogNoticesWithVacancies || withPostCount,
      hotNew,
      states: statesWithListings.size,
      stateListings,
      live: catalogLiveNotices || live,
    };
  }, [jobs, catalogStats, nowMs]);

  const closing = useMemo(
    () => partitionClosingDeadlineJobs(deferredJobs, nowMs),
    [deferredJobs, nowMs]
  );

  return {
    filtered,
    nationwideForState,
    quickFilterCounts,
    heroStats,
    quickFilterKeys: QUICK_FILTER_KEYS,
    closingToday: closing.today,
    closingWeek: closing.week,
  };
}
