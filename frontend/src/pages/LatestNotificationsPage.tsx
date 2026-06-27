import { useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import LatestNotificationsTable, {
  type LatestViewMode,
} from "@/components/home/LatestNotificationsTable";
import SocialAlertBar from "@/components/home/SocialAlertBar";
import Footer from "@/components/layout/Footer";
import HeadlineStatsBar from "@/components/layout/HeadlineStatsBar";
import type { JobRecord } from "@/types/job";
import type { CatalogStats } from "@/utils/liveJobsPipeline";
import {
  buildLatestNotifQuery,
  parseLatestNotifQuery,
  type LatestNotifQuery,
} from "@/utils/browseRoutes";

type LatestNotificationsPageProps = {
  jobs: JobRecord[];
  loading: boolean;
  onJobClick: (job: JobRecord) => void;
  onFooterLink?: (target: Record<string, unknown>) => void;
  catalogStats?: CatalogStats | null;
  liveCount?: number;
  orgCount?: number;
};

export default function LatestNotificationsPage({
  jobs,
  loading,
  onJobClick,
  onFooterLink,
  catalogStats = null,
  liveCount = 0,
  orgCount = 0,
}: LatestNotificationsPageProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();

  const query = useMemo(
    () => parseLatestNotifQuery(searchParams.toString()),
    [searchParams]
  );

  const viewMode: LatestViewMode = query.viewMode;

  const patchQuery = useCallback(
    (patch: Partial<LatestNotifQuery>) => {
      const next: LatestNotifQuery = { ...query, ...patch };
      if (patch.categoryId !== undefined && patch.categoryId) {
        next.professionSlug = null;
      }
      if (patch.professionSlug !== undefined && patch.professionSlug) {
        next.categoryId = null;
      }
      setSearchParams(buildLatestNotifQuery(next).replace(/^\?/, ""), { replace: true });
    },
    [query, setSearchParams]
  );

  const setViewMode = useCallback(
    (mode: LatestViewMode) => patchQuery({ viewMode: mode }),
    [patchQuery]
  );

  return (
    <div className="latest-notif-page">
      <HeadlineStatsBar
        catalogStats={catalogStats}
        liveCount={liveCount}
        orgCount={orgCount}
        variant="page"
        className="latest-notif-page__stats"
      />

      <SocialAlertBar compact className="latest-notif-page__social" />

      <header className="latest-notif-page__header">
        <button
          type="button"
          className="job-detail-back-btn latest-notif-page__back"
          onClick={() => {
            if (window.history.length > 1) navigate(-1);
            else navigate("/jobs");
          }}
        >
          {t("jobDetail.back", { defaultValue: "Back" })}
        </button>
        <div>
          <h1 className="latest-notif-page__title">
            {t("sidebar.latest", { defaultValue: "Latest Notifications" })}
          </h1>
          <p className="latest-notif-page__subtitle">
            {viewMode === "simple"
              ? t("latestNotif.subtitleSimple", {
                  defaultValue: "Organization · Post · Education · Last date · Apply",
                })
              : t("latestNotif.subtitle", {
                  defaultValue:
                    "State-wise table · Category · Board · Post · Vacancies · Qualification · Last Date",
                })}
          </p>
        </div>
      </header>

      <LatestNotificationsTable
        jobs={jobs}
        loading={loading}
        onJobClick={onJobClick}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        query={query}
        onQueryChange={patchQuery}
      />

      <Footer onFooterLink={onFooterLink} />
    </div>
  );
}
