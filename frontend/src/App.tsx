import { lazy, Suspense, useCallback, useDeferredValue, useEffect, useMemo, startTransition } from "react";
import HomePage from "@/components/home/HomePage";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { STATES, toSvgStateId } from "@/data/states";
import { computeJobAggregates } from "@/utils/jobAggregates";
import { useStateLabel } from "@/utils/stateLabels";
import { useLiveJobs } from "@/hooks/useLiveJobs";
import { useServerJobSearch } from "@/hooks/useServerJobSearch";
import { useColorMode } from "@/hooks/useColorMode";
import { dailySyncLabel } from "@/lib/dailySync";
import Navbar from "@/components/layout/Navbar";
import EmploymentNewsBarShell from "@/components/layout/EmploymentNewsBarShell";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import RouteErrorBoundary from "@/components/RouteErrorBoundary";
import AppRoutes from "@/components/AppRoutes";
import { BrowseProvider, useBrowseContext } from "@/context/BrowseContext";
import type { JobRecord } from "@/types/job";
import { jobDetailPath } from "@/utils/jobRoutes";
import { ORG_INDEX } from "@/data/orgIndex";
import { applyBrowseSeo } from "@/utils/browseSeo";

const EmploymentNewsBar = lazy(() => import("@/components/layout/EmploymentNewsBar"));
const SubscribeBanner = lazy(() => import("@/components/home/SubscribeBanner"));
const InstallAppBanner = lazy(() => import("@/components/layout/InstallAppBanner"));

export default function App() {
  return (
    <BrowseProvider>
      <AppShell />
    </BrowseProvider>
  );
}

function AppShell() {
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();
  const stateLabel = useStateLabel();
  const {
    jobs,
    loading: jobsLoading,
    liveCount,
    catalogStats,
    refresh: refreshJobs,
    dailySyncMeta,
    syncStatus,
    error: jobsError,
  } = useLiveJobs();

  const browse = useBrowseContext();
  const serverSearch = useServerJobSearch(browse.search, {
    state: browse.selectedState,
    category: browse.activeCat,
  });
  const location = useLocation();
  const { colorMode, onColorModeChange } = useColorMode();

  useEffect(() => {
    if (browse.isJobDetailRoute) return undefined;
    return applyBrowseSeo(location.pathname, location.search);
  }, [browse.isJobDetailRoute, location.pathname, location.search]);

  const dailySyncLine = useMemo(
    () => dailySyncLabel(dailySyncMeta, syncStatus, t),
    [dailySyncMeta, syncStatus, t]
  );

  const displayJobs = useDeferredValue(serverSearch.jobs ?? jobs);
  const aggregateJobs = useDeferredValue(displayJobs);
  const homeJobsLoading = jobsLoading || serverSearch.loading;

  const { stateCounts, categoryCounts } = useMemo(
    () => computeJobAggregates(aggregateJobs),
    [aggregateJobs]
  );

  const mapStateData = useMemo(
    () =>
      STATES.map((state) => {
        const label = stateLabel(state.id);
        return {
          id: toSvgStateId(state.id),
          name: label,
          fill: "#ffffff",
          customData: {
            name: label,
            jobCount: stateCounts[state.id] || 0,
            listings: (stateCounts[state.id] || 0).toLocaleString(),
          },
        };
      }),
    [stateCounts, stateLabel]
  );

  const handleJobClick = useCallback(
    (job: JobRecord) => {
      const path = jobDetailPath(job);
      if (!path) return;
      startTransition(() => {
        navigate(path);
      });
      window.scrollTo(0, 0);
    },
    [navigate]
  );

  const homePageElement = (
    <RouteErrorBoundary label="Home">
      <HomePage
        key={`home-${i18n.resolvedLanguage || i18n.language}`}
        jobs={displayJobs}
        jobsLoading={homeJobsLoading}
        liveCount={liveCount}
        catalogStats={catalogStats}
        onJobClick={handleJobClick}
        mapStateData={mapStateData}
        dailySyncLine={dailySyncLine}
        stateCounts={stateCounts}
        categoryCounts={categoryCounts}
      />
    </RouteErrorBoundary>
  );

  return (
    <div className="app-shell" key={i18n.resolvedLanguage || i18n.language}>
      <a href="#main-content" className="skip-link">
        {t("a11y.skipToContent")}
      </a>
      <div className="employment-news-bar-slot">
        <Suspense fallback={<EmploymentNewsBarShell />}>
          <EmploymentNewsBar jobs={jobs} liveCount={liveCount} />
        </Suspense>
      </div>
      <Navbar
        view={browse.view}
        onNavigate={browse.handleNavigate}
        search={browse.searchInput}
        setSearch={browse.setSearchInput}
        onSearch={browse.handleSearch}
        colorMode={colorMode}
        onColorModeChange={onColorModeChange}
      />
      <Suspense fallback={null}>
        <InstallAppBanner />
      </Suspense>
      <Suspense fallback={null}>
        <SubscribeBanner />
      </Suspense>
      {jobsError && (
        <div className="jobs-load-error-banner" role="alert">
          <p className="jobs-load-error-banner__text">
            {t("jobsStatus.loadError")}
            <span className="jobs-load-error-banner__detail">{jobsError}</span>
          </p>
          <button type="button" className="jobs-load-error-banner__retry" onClick={refreshJobs}>
            {t("jobsStatus.retry")}
          </button>
        </div>
      )}
      <main id="main-content" className="app-main">
        <AppRoutes
          homePageElement={homePageElement}
          jobs={jobs}
          jobsLoading={jobsLoading}
          liveCount={liveCount}
          catalogStats={catalogStats}
          orgCount={ORG_INDEX.length}
          onJobClick={handleJobClick}
          onFooterLink={browse.handleFooterLink}
        />
      </main>
      <MobileBottomNav />
    </div>
  );
}
