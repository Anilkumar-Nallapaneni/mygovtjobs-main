import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { OFFICIAL_SITES } from "@/data/officialSites";
import { scrollToSection } from "@/utils/scrollToSection";
import { useStateLabel } from "@/utils/stateLabels";
import { numberLocale } from "@/utils/formatLocale";
import type { HeroStatFilterKey } from "@/utils/homePageFilters";
import AlertSection from "@/components/home/AlertSection";
import EducationFilterPill from "@/components/home/EducationFilterPill";
import HomeHeroMarketing from "@/components/home/HomeHeroMarketing";
import ExploreHubBanner from "@/components/home/ExploreHubBanner";
import HomeJobsListSection from "@/components/home/HomeJobsListSection";
import ResultsHubFilters from "@/components/home/ResultsHubFilters";
import { useHomePageDerived } from "@/components/home/useHomePageDerived";
import HeadlineStatsBar from "@/components/layout/HeadlineStatsBar";
import { ORG_INDEX } from "@/data/orgIndex";
import { HOME_SHELL_HEADLINE_STATS, HOME_SHELL_HERO_STATS } from "@/data/homeShellStats";
import StateJobsPanel from "@/components/home/StateJobsPanel";
import Footer from "@/components/layout/Footer";
import SectorBrowser from "@/components/browse/SectorBrowser";
import { useBrowseContext } from "@/context/BrowseContext";
import { RESULTS_TOPICS_INDEX_PATH } from "@/utils/browseRoutes";
import type { HomePageProps } from "@/types/homePage";

import type { HeadlinesViewMode } from "@/lib/officialFeed";

const OfficialHeadlinesSection = lazy(() => import("@/components/home/OfficialHeadlinesSection"));
const HomeDiscoveryBlock = lazy(() => import("@/components/home/HomeDiscoveryBlock"));
import HomeMapBlock from "@/components/home/HomeMapBlock";

export default function HomePage({
  jobs = [],
  jobsLoading = false,
  liveCount = 0,
  catalogStats = null,
  onJobClick,
  mapStateData,
  dailySyncLine = "",
  stateCounts,
  categoryCounts,
}: HomePageProps) {
  const browse = useBrowseContext();
  const {
    selectedState,
    activeCat,
    quickFilter,
    sort,
    heroStatFilter,
    search,
    clearSearch,
    searchSubmitKey,
    headlinesTopicKey,
    setHeadlinesTopicKey,
    browseLandingTitle,
    browseLandingDescription,
    qualificationSlug,
    professionSlug,
    orgDept,
    orgSlug,
    allIndiaBrowse,
    isResultsHubRoute: resultsHubMode,
    headlinesLandingTitle,
    headlinesLandingDescription,
    setQuickFilter,
    setSort,
    setHeroStatFilter,
    handleBrowseJobs: onBrowseJobs,
    handleStateSelect: onStateSelect,
    handleStateFilter,
    handleCategoryFilter,
    handleFooterLink: onFooterLink,
    handleResultsHubStateSelect: onResultsHubStateSelect,
    handleResultsHubCategorySelect: onResultsHubCategorySelect,
    navigateToQualification: onQualificationSelect,
    navigateToProfession: onProfessionSelect,
    navigateToOrg: onOrgSelect,
  } = browse;
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const locale = numberLocale(i18n.language);
  const stateLabel = useStateLabel();
  const mapPanelRef = useRef<HTMLDivElement | null>(null);
  const heroColRef = useRef<HTMLDivElement | null>(null);
  const [resultsViewMode, setResultsViewMode] = useState<HeadlinesViewMode>("table");

  const { filtered, nationwideForState, quickFilterCounts, heroStats, quickFilterKeys } =
    useHomePageDerived({ jobs, catalogStats });

  const isBrowseLanding =
    !resultsHubMode &&
    !selectedState &&
    Boolean(
      activeCat ||
        qualificationSlug ||
        professionSlug ||
        orgSlug ||
        orgDept ||
        allIndiaBrowse
    );

  const browseToJobs = useCallback(() => {
    onBrowseJobs?.();
    const target = selectedState && !search.trim() ? "state-jobs-panel" : "main-jobs";
    scrollToSection(target);
  }, [onBrowseJobs, selectedState, search]);

  const handleQuickFilterClick = useCallback(
    (key: string) => {
      const next = quickFilter === key ? null : key;
      setHeroStatFilter(null);
      setQuickFilter(next);
      if (next) browseToJobs();
    },
    [quickFilter, setQuickFilter, setHeroStatFilter, browseToJobs]
  );

  const handleStateSelect = useCallback(
    (stateId: string | null) => {
      if (onStateSelect) {
        onStateSelect(stateId);
        return;
      }
      setHeroStatFilter(null);
      handleStateFilter(stateId);
      if (stateId) scrollToSection("india-map-panel", { behavior: "instant" });
    },
    [onStateSelect, handleStateFilter, setHeroStatFilter]
  );

  const handleHeroStatClick = useCallback(
    (statKey: HeroStatFilterKey) => {
      const next = heroStatFilter === statKey ? null : statKey;
      setHeroStatFilter(next);
      if (!next) return;
      handleStateFilter(null);
      handleCategoryFilter(null);
      setQuickFilter(null);
      clearSearch?.();
      if (typeof setHeadlinesTopicKey === "function") setHeadlinesTopicKey(null);
      onBrowseJobs?.();
      scrollToSection(statKey === "states" ? "india-map-panel" : "main-jobs");
    },
    [
      heroStatFilter,
      handleStateFilter,
      handleCategoryFilter,
      setQuickFilter,
      setHeroStatFilter,
      clearSearch,
      setHeadlinesTopicKey,
      onBrowseJobs,
    ]
  );

  const clearListFilters = useCallback(() => {
    setHeroStatFilter(null);
    handleStateFilter(null);
    handleCategoryFilter(null);
    setQuickFilter(null);
    clearSearch?.();
    if (typeof setHeadlinesTopicKey === "function") setHeadlinesTopicKey(null);
  }, [handleStateFilter, handleCategoryFilter, setQuickFilter, setHeroStatFilter, clearSearch, setHeadlinesTopicKey]);

  useEffect(() => {
    if (!searchSubmitKey) return;
    setHeroStatFilter(null);
  }, [searchSubmitKey, setHeroStatFilter]);

  const handleEducationFromCard = useCallback(
    (eduKey: string) => {
      setQuickFilter(eduKey);
      onBrowseJobs?.();
      scrollToSection(selectedState && !search.trim() ? "state-jobs-panel" : "main-jobs");
    },
    [setQuickFilter, onBrowseJobs, selectedState, search]
  );

  const jobCardFilterProps = {
    onEducationClick: handleEducationFromCard,
    onStateClick: handleStateSelect,
  };

  const effectiveTopicKey = headlinesTopicKey;

  useEffect(() => {
    if (resultsHubMode) setResultsViewMode("table");
  }, [resultsHubMode, effectiveTopicKey]);

  // Default home: cap map height to the hero column so the grid row does not leave empty space below India at a glance.
  useEffect(() => {
    const mapNode = mapPanelRef.current;
    const clearMapCap = () => mapNode?.style.removeProperty("--home-map-max-height");

    if (selectedState || resultsHubMode) {
      clearMapCap();
      return;
    }

    const canSyncHeights =
      typeof window !== "undefined" && window.matchMedia("(min-width: 901px)").matches;
    const heroNode = heroColRef.current;
    if (!canSyncHeights || !mapNode || !heroNode) {
      clearMapCap();
      return;
    }

    let frame = 0;
    const syncMapHeight = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const heroHeight = Math.ceil(heroNode.getBoundingClientRect().height);
        const mapHead = mapNode.querySelector(".home-map-block__head");
        const headHeight = mapHead ? Math.ceil(mapHead.getBoundingClientRect().height) : 0;
        const shellPadding = 20;
        const shellMax = Math.max(160, heroHeight - headHeight - shellPadding);
        mapNode.style.setProperty("--home-map-max-height", `${shellMax}px`);
      });
    };

    syncMapHeight();

    const Observer = window.ResizeObserver;
    const observer = Observer ? new Observer(syncMapHeight) : null;
    observer?.observe(heroNode);
    observer?.observe(mapNode);
    window.addEventListener("resize", syncMapHeight);
    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", syncMapHeight);
    viewport?.addEventListener("scroll", syncMapHeight);

    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("resize", syncMapHeight);
      viewport?.removeEventListener("resize", syncMapHeight);
      viewport?.removeEventListener("scroll", syncMapHeight);
      clearMapCap();
    };
  }, [selectedState, resultsHubMode]);

  const showOfficialHeadlines = resultsHubMode || Boolean(effectiveTopicKey);
  const stateName = selectedState ? stateLabel(selectedState) : "";
  const totalListings = jobs.length;
  const paintShellStats = jobsLoading && jobs.length === 0;
  const displayHeroStats = paintShellStats ? HOME_SHELL_HERO_STATS : heroStats;

  return (
    <div className={resultsHubMode ? "results-hub-page" : undefined}>
      {!resultsHubMode ? <section className={`home-page-main${isBrowseLanding ? " home-page-main--landing" : ""}`}>
        {!resultsHubMode && stateCounts && categoryCounts ? (
          <SectorBrowser
            stateCounts={stateCounts}
            categoryCounts={categoryCounts}
            loading={jobsLoading}
          />
        ) : null}

        {!selectedState && !resultsHubMode && !isBrowseLanding && (
          <div className="home-hero-tagline">
            <div className="home-hero-tagline__rule" aria-hidden />
            <span className="home-hero-tagline__text">{t("home.tagline")}</span>
          </div>
        )}

        {!selectedState && !resultsHubMode && !isBrowseLanding && (
          <HeadlineStatsBar
            catalogStats={catalogStats}
            liveCount={liveCount}
            orgCount={ORG_INDEX.length}
            variant="hero"
            className="home-headline-stats-mobile"
            loading={paintShellStats}
            fallbackStats={HOME_SHELL_HEADLINE_STATS}
          />
        )}

        {!selectedState && !resultsHubMode && !isBrowseLanding && (
          <div
            className={`home-stats-strip home-stats-strip--desktop${paintShellStats ? " home-stats-strip--pending" : ""}`}
            title={t("home.statsStrip.tooltip", {
              defaultValue: "Counts from verified .gov.in and official career portals only",
            })}
            aria-busy={paintShellStats || undefined}
          >
            <p className="home-stats-strip__primary">
              {t("home.statsStrip.primary", {
                liveNotices: displayHeroStats.live.toLocaleString(locale),
                vacancies: displayHeroStats.posts.toLocaleString(locale),
                defaultValue: "{{vacancies}} notified posts · {{liveNotices}} live notifications",
              })}
            </p>
            <p className="home-stats-strip__secondary">
              {t("home.statsStrip.secondary", {
                sources: OFFICIAL_SITES.length.toLocaleString(locale),
                syncLabel: dailySyncLine || t("home.statsStrip.syncFallback", { defaultValue: "daily" }),
                defaultValue: "{{sources}} official sources · {{syncLabel}}",
              })}
            </p>
          </div>
        )}

        {selectedState && (
          <div className="home-state-filters">
            <div className="home-state-filters__label">{t("home.filterListings")}</div>
            <div className="home-state-filters__pills">
              {quickFilterKeys.map((f) => (
                <EducationFilterPill
                  key={f}
                  filterKey={f}
                  active={quickFilter === f}
                  counts={quickFilterCounts[f] ?? { listings: 0, vacancies: 0 }}
                  locale={locale}
                  onClick={() => handleQuickFilterClick(f)}
                  t={t}
                  compact
                />
              ))}
            </div>
          </div>
        )}

        {!isBrowseLanding && (
        <div
          className={`home-hero-grid${selectedState ? " home-hero-grid--state" : ""}${resultsHubMode ? " home-hero-grid--hidden" : ""}`}
        >
          <div id="india-map-panel" ref={mapPanelRef}>
            <HomeMapBlock
              mapStateData={mapStateData}
              selectedState={selectedState}
              stateName={stateName}
              onStateSelect={handleStateSelect}
              onClearState={() => handleStateSelect(null)}
              t={t}
            />
          </div>

          <div
            id="state-jobs-panel"
            ref={selectedState ? undefined : heroColRef}
            className={
              selectedState ? "home-state-jobs-panel home-state-jobs-panel--below" : undefined
            }
          >
            {!selectedState ? (
              <HomeHeroMarketing
                totalListings={totalListings}
                heroStats={displayHeroStats}
                heroStatFilter={heroStatFilter}
                locale={locale}
                onHeroStatClick={handleHeroStatClick}
                statsPending={paintShellStats}
                t={t}
              />
            ) : (
              <StateJobsPanel
                stateName={stateName}
                stateJobs={filtered}
                nationwideJobs={nationwideForState}
                sort={sort}
                onSortChange={setSort}
                onJobClick={onJobClick}
                {...jobCardFilterProps}
              />
            )}
          </div>
        </div>
        )}

        {!resultsHubMode && (
          <HomeJobsListSection
            filtered={filtered}
            selectedState={selectedState}
            activeCat={activeCat}
            search={search}
            quickFilter={quickFilter}
            heroStatFilter={heroStatFilter}
            sort={sort}
            stateName={stateName}
            browseLandingTitle={browseLandingTitle}
            browseLandingDescription={browseLandingDescription}
            professionSlug={professionSlug}
            qualificationSlug={qualificationSlug}
            orgDept={orgDept}
            allIndiaBrowse={allIndiaBrowse}
            jobsLoading={jobsLoading}
            liveCount={liveCount}
            locale={locale}
            jobCardFilterProps={jobCardFilterProps}
            onJobClick={onJobClick}
            onClearListFilters={clearListFilters}
            onSortChange={setSort}
            sectionClassName={
              selectedState && !search.trim() && !allIndiaBrowse ? " home-jobs-section--hidden" : ""
            }
            t={t}
          />
        )}

        {!selectedState && !isBrowseLanding && (
          <>
            <ExploreHubBanner />
            <Suspense fallback={null}>
              <HomeDiscoveryBlock
                jobs={jobs}
                jobsLoading={jobsLoading}
                onJobClick={onJobClick}
                onQualificationSelect={onQualificationSelect}
                onProfessionSelect={onProfessionSelect}
                onOrgSelect={onOrgSelect}
              />
            </Suspense>
          </>
        )}
      </section> : null}

      {showOfficialHeadlines && (
        <Suspense fallback={null}>
          <div className={resultsHubMode ? "results-hub-page__body" : undefined}>
          {resultsHubMode && headlinesLandingTitle && (
            <header className="results-hub-page__header">
              <Link to={RESULTS_TOPICS_INDEX_PATH} className="results-hub-page__back">
                {t("results.allTopics", { defaultValue: "All exam updates" })}
              </Link>
              <h1 className="results-hub-page__title">{headlinesLandingTitle}</h1>
              {headlinesLandingDescription ? (
                <p className="results-hub-page__desc">{headlinesLandingDescription}</p>
              ) : null}
            </header>
          )}
          {resultsHubMode && onResultsHubStateSelect && onResultsHubCategorySelect ? (
            <ResultsHubFilters
              topicKey={effectiveTopicKey}
              stateId={selectedState}
              categoryId={activeCat}
              onStateSelect={onResultsHubStateSelect}
              onCategorySelect={onResultsHubCategorySelect}
            />
          ) : null}
          <OfficialHeadlinesSection
            stateId={selectedState}
            categoryId={activeCat}
            topicKey={effectiveTopicKey}
            search={search}
            resultsHubMode={resultsHubMode}
            viewMode={resultsHubMode ? resultsViewMode : undefined}
            onViewModeChange={resultsHubMode ? setResultsViewMode : undefined}
            onClearTopic={() => {
              if (resultsHubMode) {
                navigate(RESULTS_TOPICS_INDEX_PATH);
                return;
              }
              if (typeof setHeadlinesTopicKey === "function") setHeadlinesTopicKey(null);
            }}
          />
          </div>
        </Suspense>
      )}

      {!resultsHubMode && <AlertSection />}
      <Footer onFooterLink={onFooterLink} />
    </div>
  );
}
