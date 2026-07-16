import BrowseBreadcrumbs from "@/components/browse/BrowseBreadcrumbs";
import { lazy, Suspense, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import JobCard from "@/components/jobs/JobCard";
import JobCardGrid from "@/components/jobs/JobCardGrid";
import { HERO_STAT_FILTERS, VIRTUAL_GRID_MIN, vacancyCountForStats } from "@/data/homePageConstants";
import { getProfessionBySlug, professionLandingTitle } from "@/data/professions";
import {
  getCanonicalProfessionForQualification,
  getRelatedQualificationSlug,
} from "@/data/professionCrossLinks";
import { getQualificationBySlug } from "@/data/qualifications";
import { trackProfessionLanding } from "@/lib/analytics";
import { qualificationRoutePath, professionRoutePath } from "@/utils/browseRoutes";
import type { HeroStatFilterKey, HomeSortKey } from "@/utils/homePageFilters";
import type { JobRecord } from "@/types/job";
import type { CategoryId } from "@/data/categories";
import HomeJobsSkeleton from "@/components/home/HomeJobsSkeleton";

const ProfessionLandingExtras = lazy(() => import("@/components/home/ProfessionLandingExtras"));

type HomeJobsListSectionProps = {
  filtered: JobRecord[];
  selectedState: string | null;
  activeCat: string | null;
  search: string;
  quickFilter: string | null;
  heroStatFilter: HeroStatFilterKey | null;
  sort: HomeSortKey;
  stateName: string;
  browseLandingTitle: string | null;
  browseLandingDescription: string | null;
  professionSlug?: string | null;
  qualificationSlug?: string | null;
  allIndiaBrowse?: boolean;
  orgDept?: string | null;
  jobsLoading: boolean;
  liveCount: number;
  locale: string;
  jobCardFilterProps: {
    onEducationClick: (eduKey: string) => void;
    onStateClick: (stateId: string | null) => void;
  };
  onJobClick: (job: JobRecord) => void;
  onClearListFilters: () => void;
  onSortChange: (sort: HomeSortKey) => void;
  sectionClassName?: string;
  t: (key: string, opts?: Record<string, unknown>) => string;
};

export default function HomeJobsListSection({
  filtered,
  selectedState,
  activeCat,
  search,
  quickFilter,
  heroStatFilter,
  sort,
  stateName,
  browseLandingTitle,
  browseLandingDescription,
  professionSlug = null,
  qualificationSlug = null,
  allIndiaBrowse = false,
  orgDept = null,
  jobsLoading,
  liveCount,
  locale,
  jobCardFilterProps,
  onJobClick,
  onClearListFilters,
  onSortChange,
  sectionClassName = "",
  t,
}: HomeJobsListSectionProps) {
  const showJobCardGrid = filtered.length > 0;
  const professionEntry = getProfessionBySlug(professionSlug);
  const canonicalProfession = getCanonicalProfessionForQualification(qualificationSlug);
  const relatedQualSlug = professionEntry ? getRelatedQualificationSlug(professionEntry) : null;
  const relatedQual = relatedQualSlug ? getQualificationBySlug(relatedQualSlug) : null;
  const showBrowseLanding = Boolean(professionEntry || browseLandingTitle || orgDept);
  const listingCount = jobsLoading ? undefined : filtered.length;
  const landingTitle =
    professionEntry != null
      ? professionLandingTitle(professionEntry, listingCount)
      : browseLandingTitle;
  const sortKeys: HomeSortKey[] = professionEntry
    ? ["expiringSoon", "lastDate", "vacancies"]
    : ["lastDate", "vacancies"];

  useEffect(() => {
    if (!professionEntry || jobsLoading) return
    trackProfessionLanding(professionEntry.slug, filtered.length)
  }, [professionEntry, jobsLoading, filtered.length])

  const listAnimKey = useMemo(
    () =>
      [selectedState, activeCat, search.trim(), quickFilter, heroStatFilter, sort, filtered.length].join('|'),
    [selectedState, activeCat, search, quickFilter, heroStatFilter, sort, filtered.length]
  )

  return (
    <section id="main-jobs" className={`home-jobs-section${sectionClassName}`}>
      {showBrowseLanding && landingTitle && (
        <header className="browse-landing">
          <BrowseBreadcrumbs
            professionSlug={professionSlug}
            qualificationSlug={qualificationSlug}
            categoryId={activeCat as CategoryId | null}
            stateId={selectedState}
            orgDept={orgDept}
            allIndia={allIndiaBrowse}
          />
          <h1 className="browse-landing__title browse-landing__title--count">
            {landingTitle}
          </h1>
          {browseLandingDescription ? (
            <p className="browse-landing__desc">{browseLandingDescription}</p>
          ) : (
            <p className="browse-landing__desc">
              {t("qualification.landingMeta", {
                count: filtered.length.toLocaleString(locale),
                vacancies: filtered
                  .reduce((sum, job) => sum + vacancyCountForStats(job), 0)
                  .toLocaleString(locale),
                defaultValue: "Browse {{count}} live notifications from official government sources.",
              })}
            </p>
          )}
          {professionEntry && relatedQualSlug ? (
            <p className="browse-landing__crosslink">
              {t("profession.alsoByQualification", {
                defaultValue: "Also browse by education:",
              })}{" "}
              <Link to={qualificationRoutePath(relatedQualSlug)}>
                {relatedQual?.title?.replace(/ Government Jobs 2026$/, '') ??
                  relatedQualSlug.replace(/-/g, ' ')}
              </Link>
            </p>
          ) : null}
          {qualificationSlug && canonicalProfession ? (
            <p className="browse-landing__crosslink browse-landing__crosslink--canonical">
              {t("profession.canonicalHint", {
                defaultValue: "For the full sector view, see",
              })}{" "}
              <Link to={professionRoutePath(canonicalProfession.slug)}>
                {t(canonicalProfession.labelKey)}
              </Link>
            </p>
          ) : null}
        </header>
      )}
      <div className="home-jobs-section__header">
        <div>
          <h2 className="home-jobs-section__title">
            {showBrowseLanding
              ? t("qualification.listingsHeading", { defaultValue: "Live listings" })
              : selectedState
                ? t("home.jobsInState", { state: stateName })
                : activeCat
                  ? t("home.categoryJobs", { category: t(`category.${activeCat}`) })
                  : search.trim()
                    ? t("home.searchResultsFor", {
                        query: search.trim(),
                        defaultValue: 'Results for "{{query}}"',
                      })
                    : heroStatFilter
                      ? t(
                          HERO_STAT_FILTERS.find((h) => h.key === heroStatFilter)?.labelKey ??
                            "home.latestJobs"
                        )
                      : t("home.latestJobs")}
          </h2>
          <p className="home-jobs-section__meta">
            {jobsLoading && filtered.length === 0
              ? t("home.jobsLoadingMeta", {
                  defaultValue: "Loading live listings from official sources…",
                })
              : t("home.jobsMetaFast", {
                  count: filtered.length,
                  defaultValue: "{{count}} listings available",
                })}
            {!jobsLoading && liveCount > 0
              ? ` · ${t("home.liveCount", { count: liveCount, defaultValue: "{{count}} official notices" })}`
              : jobsLoading && filtered.length === 0
                ? ""
                : jobsLoading
                  ? ` · ${t("ticker.live")}…`
                  : ""}
            {quickFilter ? ` · ${t(`quickFilter.${quickFilter}`)}` : ""}
            {heroStatFilter
              ? ` · ${t(HERO_STAT_FILTERS.find((h) => h.key === heroStatFilter)?.labelKey ?? "")}`
              : ""}
          </p>
          {!selectedState && !activeCat && !search.trim() && !quickFilter && !heroStatFilter ? (
            <p className="home-jobs-section__hint">{t("home.showEverything")}</p>
          ) : null}
        </div>
        <div className="home-jobs-section__toolbar">
          {(selectedState || activeCat || search.trim() || quickFilter || heroStatFilter) && (
            <button type="button" onClick={onClearListFilters} className="home-jobs-section__filter-btn">
              {t("home.clearAllFilters")}
            </button>
          )}
          <span className="home-jobs-section__sort-label">{t("home.sort")}</span>
          {sortKeys.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSortChange(s)}
              aria-pressed={sort === s}
              className={`home-jobs-section__sort-btn${sort === s ? " home-jobs-section__sort-btn--active" : ""}`}
            >
              {s === "lastDate"
                ? t("home.deadline")
                : s === "expiringSoon"
                  ? t("home.expiringSoon", { defaultValue: "Expiring soon" })
                  : t("home.vacancies")}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        jobsLoading ? (
          <HomeJobsSkeleton count={4} />
        ) : (
          <div className="home-jobs-empty">
            <div className="home-jobs-empty__icon">📭</div>
            <div className="home-jobs-empty__title">{t("home.noJobs")}</div>
            <div className="home-jobs-empty__hint">{t("home.noJobsHint")}</div>
          </div>
        )
      ) : (
        <div
          key={listAnimKey}
          className="home-jobs-section__panel home-jobs-section__panel--animate"
          aria-label={t("home.latestJobs")}
        >
          {showJobCardGrid && filtered.length >= VIRTUAL_GRID_MIN ? (
            <JobCardGrid
              jobs={filtered}
              onJobClick={onJobClick}
              jobCardFilterProps={jobCardFilterProps}
              animateList
            />
          ) : (
            <div className="home-jobs-grid home-jobs-grid--scroll">
              {filtered.map((job, index) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onClick={() => onJobClick(job)}
                  enterIndex={index}
                  {...jobCardFilterProps}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {professionEntry ? (
        <Suspense fallback={null}>
          <ProfessionLandingExtras
            profession={professionEntry}
            listingCount={filtered.length}
            recentJobs={filtered}
            onJobClick={onJobClick}
          />
        </Suspense>
      ) : null}
    </section>
  );
}
