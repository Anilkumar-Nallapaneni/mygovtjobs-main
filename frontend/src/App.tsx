import { lazy, Suspense, useCallback, useDeferredValue, useEffect, useMemo, useState, startTransition } from "react";
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
import MobileRouteTransition from "@/components/MobileRouteTransition";
import RouteErrorBoundary from "@/components/RouteErrorBoundary";
import { useStandaloneApp } from "@/hooks/useStandaloneApp";
import AppRoutes from "@/components/AppRoutes";
import { BrowseProvider, useBrowseContext } from "@/context/BrowseContext";
import type { JobRecord } from "@/types/job";
import { jobDetailPath } from "@/utils/jobRoutes";
import { HOME_SHELL_ORG_COUNT } from "@/data/homeShellStats";
import { applyBrowseSeo } from "@/utils/browseSeo";
import { scheduleMarkAppReady } from "@/lib/appReady";

const HomePage = lazy(() => import("@/components/home/HomePage"));
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
  useStandaloneApp();

  useEffect(() => {
    // Wait for critical CSS before swapping shell → React (cuts FOUC/CLS).
    return scheduleMarkAppReady();
  }, []);

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

  // Defer aggregate work until after first paint when the catalog is still tiny (bootstrap).
  const [aggregatesReady, setAggregatesReady] = useState(false);
  useEffect(() => {
    if (aggregatesReady) return undefined;
    if (aggregateJobs.length === 0) return undefined;
    let cancelled = false;
    const arm = () => {
      if (typeof requestIdleCallback === "function") {
        const id = requestIdleCallback(() => {
          if (!cancelled) setAggregatesReady(true);
        }, { timeout: 2_500 });
        return () => cancelIdleCallback(id);
      }
      const timer = window.setTimeout(() => {
        if (!cancelled) setAggregatesReady(true);
      }, 800);
      return () => window.clearTimeout(timer);
    };
    return arm();
  }, [aggregateJobs.length, aggregatesReady]);

  const { stateCounts, categoryCounts } = useMemo(
    () => (aggregatesReady ? computeJobAggregates(aggregateJobs) : { stateCounts: {}, categoryCounts: {} }),
    [aggregateJobs, aggregatesReady]
  );

  const mapStateData = useMemo(
    () =>
      aggregatesReady
        ? STATES.map((state) => {
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
          })
        : [],
    [aggregatesReady, stateCounts, stateLabel]
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
      <Suspense
        fallback={
          <div className="home-page-fallback" aria-busy="true" style={{ minHeight: "70vh" }} />
        }
      >
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
      </Suspense>
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
          <p className="jobs-load-error-banner__text">{t("jobsStatus.loadError")}</p>
          <button type="button" className="jobs-load-error-banner__retry" onClick={refreshJobs}>
            {t("jobsStatus.retry")}
          </button>
        </div>
      )}
      <main id="main-content" className="app-main">
        <MobileRouteTransition>
          <AppRoutes
            homePageElement={homePageElement}
            jobs={jobs}
            jobsLoading={jobsLoading}
            liveCount={liveCount}
            catalogStats={catalogStats}
            orgCount={HOME_SHELL_ORG_COUNT}
            onJobClick={handleJobClick}
            onFooterLink={browse.handleFooterLink}
          />
        </MobileRouteTransition>
      </main>
      <MobileBottomNav />
    </div>
  );
}
