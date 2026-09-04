import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import type { JobRecord } from "@/types/job";
import { buildLatestNotifUrl } from "@/utils/browseRoutes";
import { jobDetailPath } from "@/utils/jobRoutes";
import { formatJobDate } from "@/utils/formatJobDate";

type ClosingDeadlinesStripProps = {
  today: JobRecord[];
  week: JobRecord[];
  onJobClick: (job: JobRecord) => void;
  locale: string;
};

function formatDay(value: string | undefined, _locale?: string): string {
  const formatted = formatJobDate(value);
  return formatted === "—" ? value || "" : formatted;
}

function ClosingGroup({
  title,
  rows,
  viewAllHref,
  viewAllLabel,
  onJobClick,
  locale,
  emptyLabel,
}: {
  title: string;
  rows: JobRecord[];
  viewAllHref: string;
  viewAllLabel: string;
  onJobClick: (job: JobRecord) => void;
  locale: string;
  emptyLabel: string;
}) {
  return (
    <div className="closing-deadlines__group">
      <header className="closing-deadlines__group-head">
        <h3 className="closing-deadlines__group-title">{title}</h3>
        <Link to={viewAllHref} className="closing-deadlines__view-all">
          {viewAllLabel}
        </Link>
      </header>
      {rows.length === 0 ? (
        <p className="closing-deadlines__empty">{emptyLabel}</p>
      ) : (
        <ul className="closing-deadlines__list">
          {rows.slice(0, 6).map((job) => {
            const href = jobDetailPath(job) || "/jobs";
            return (
              <li key={job.id || job.slug}>
                <Link
                  to={href}
                  className="closing-deadlines__row"
                  onClick={() => onJobClick(job)}
                >
                  <span className="closing-deadlines__date">{formatDay(job.lastDate, locale)}</span>
                  <span className="closing-deadlines__title">{job.title}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function ClosingDeadlinesStrip({
  today,
  week,
  onJobClick,
  locale,
}: ClosingDeadlinesStripProps) {
  const { t } = useTranslation();
  if (today.length === 0 && week.length === 0) return null;

  return (
    <section className="closing-deadlines" aria-label={t("home.closing.title", { defaultValue: "Closing dates" })}>
      <ClosingGroup
        title={t("home.closing.todayTitle", { defaultValue: "Closing today" })}
        rows={today}
        viewAllHref={buildLatestNotifUrl({ deadlineWindow: "today" })}
        viewAllLabel={t("home.examRows.viewAll", { defaultValue: "View all →" })}
        onJobClick={onJobClick}
        locale={locale}
        emptyLabel={t("home.closing.todayEmpty", { defaultValue: "No official last dates today." })}
      />
      <ClosingGroup
        title={t("home.closing.weekTitle", { defaultValue: "Closing this week" })}
        rows={week}
        viewAllHref={buildLatestNotifUrl({ deadlineWindow: "week" })}
        viewAllLabel={t("home.examRows.viewAll", { defaultValue: "View all →" })}
        onJobClick={onJobClick}
        locale={locale}
        emptyLabel={t("home.closing.weekEmpty", { defaultValue: "No other last dates in the next 7 days." })}
      />
    </section>
  );
}
