import BookmarkButton from "@/components/jobs/BookmarkButton";
import ReportJobButton from "@/components/jobs/ReportJobButton";
import { orgInitials } from "@/components/jobs/jobDetailUi";

function formatNoticeDate(iso: string, locale: string) {
  const raw = String(iso || "").trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return iso;
  const parsed = new Date(`${raw}T12:00:00+05:30`);
  if (Number.isNaN(parsed.getTime())) return iso;
  return new Intl.DateTimeFormat(locale, {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

type JobDetailHeroProps = {
  title: string;
  dept: string;
  postName: string;
  lastDate: string;
  categoryLabel: string;
  catColor: string;
  state: string;
  vacancies: number;
  isLive: boolean;
  isUrgent: boolean;
  daysLeft: number | null;
  isPageLayout: boolean;
  applyMode: string;
  jobId: string;
  jobSlug: string;
  verifiedAtText: string;
  primaryAction: { url: string; label: string } | null;
  countLocale: string;
  language: string;
  onClose: () => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
};

export function JobDetailHero({
  title,
  dept,
  postName,
  lastDate,
  categoryLabel,
  catColor,
  state,
  vacancies,
  isLive,
  isUrgent,
  daysLeft,
  isPageLayout,
  applyMode,
  jobId,
  jobSlug,
  verifiedAtText,
  primaryAction,
  countLocale,
  language,
  onClose,
  t,
}: JobDetailHeroProps) {
  return (
    <>
      <div className="job-detail-toolbar">
        <button type="button" onClick={onClose} className="job-detail-back-btn">
          {t("jobDetail.back")}
        </button>
        {applyMode ? <span className="job-detail-toolbar-chip">{applyMode}</span> : null}
        {jobId || jobSlug ? (
          <div className="job-detail-toolbar-tools">
            <BookmarkButton compact jobId={jobId || jobSlug} jobSlug={jobSlug || jobId} />
            <ReportJobButton jobId={jobId || jobSlug} jobTitle={title} />
          </div>
        ) : null}
        {primaryAction ? (
          <a
            href={primaryAction.url}
            target="_blank"
            rel="noopener noreferrer"
            className="job-detail-apply-btn job-detail-toolbar-apply"
            role="button"
            data-testid="official-apply-link"
          >
            {primaryAction.label}
          </a>
        ) : null}
      </div>

      <header
        className={`job-detail-hero job-detail-hero--premium job-detail-hero--notice${isPageLayout ? " job-detail-hero--page" : ""}`}
      >
        <div className="job-detail-hero__accent" aria-hidden />
        <div className="job-detail-hero__inner">
          <div className="job-detail-hero__masthead">
            <div className="job-detail-hero__identity">
              <div className="job-detail-hero__seal" aria-hidden>
                {orgInitials(dept || "Govt")}
              </div>
              <div>
                <p className="job-detail-hero__kicker">
                  {t("jobDetail.officialNotification", { defaultValue: "Official notification" })}
                </p>
                {dept ? <p className="job-detail-dept">{dept}</p> : null}
              </div>
            </div>
            {lastDate ? (
              <div className={`job-detail-hero__stamp${isUrgent ? " job-detail-hero__stamp--urgent" : ""}`}>
                <span className="job-detail-hero__stamp-label">{t("jobDetail.lastDateLabel")}</span>
                <strong className="job-detail-hero__stamp-date">{formatNoticeDate(lastDate, language)}</strong>
                {daysLeft != null && daysLeft >= 0 ? (
                  <span className="job-detail-hero__stamp-hint">
                    {isUrgent
                      ? t("jobDetail.closingIn", { count: daysLeft })
                      : t("jobDetail.daysLeft", {
                          count: daysLeft,
                          defaultValue: "{{count}} days left",
                        })}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="job-detail-badges">
            <span
              className="job-detail-badge"
              style={{ color: catColor, borderColor: `${catColor}40`, background: `${catColor}18` }}
            >
              {categoryLabel}
            </span>
            {state ? <span className="job-detail-badge job-detail-badge-muted">{state}</span> : null}
            {vacancies > 0 ? (
              <span className="job-detail-badge job-detail-badge-vacancy">
                {vacancies.toLocaleString(countLocale)} {t("job.posts")}
              </span>
            ) : null}
            {isLive ? (
              <span className="job-detail-badge job-detail-badge-live">
                {t("jobDetail.activeWindow", { defaultValue: "Open to apply" })}
              </span>
            ) : null}
          </div>

          <h1 className="job-detail-title">{title}</h1>
          {postName && !title.toLowerCase().includes(postName.toLowerCase()) ? (
            <p className="job-detail-post-name">{postName}</p>
          ) : null}

          <p className="job-detail-hero__trust">
            {t("jobDetail.officialSourceBadge", {
              defaultValue: "Verified official source — .gov.in portals only",
            })}
            {verifiedAtText ? ` · ${verifiedAtText} IST` : ""}
          </p>

          {primaryAction ? (
            <div className="job-detail-hero__cta">
              <a
                href={primaryAction.url}
                target="_blank"
                rel="noopener noreferrer"
                className="job-detail-apply-btn"
                role="button"
                data-testid="official-apply-link"
              >
                {primaryAction.label}
              </a>
            </div>
          ) : null}
        </div>
      </header>
    </>
  );
}
