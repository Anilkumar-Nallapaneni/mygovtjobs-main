import type { CSSProperties } from "react";
import { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useNow } from "@/hooks/useNow";
import { getCachedEnglishNormalization } from "@/utils/jobContentTranslate";
import { DS } from "@/theme/designSystem";
import { CATS } from "@/data/categories";
import type { JobRecord } from "@/types/job";
import { enrichJobMetadata } from "@/utils/jobMetadataUtils";
import { resolveOfficialApplyHref } from "@/utils/officialDomains";
import { resolveJobApplyHref } from "@/utils/jobDetailLinks";
import { dateTimeLocale, numberLocale } from "@/utils/formatLocale";
import { extractPostName } from "@/utils/extractPostName";
import "@/styles/jobs.css";

const DAY_MS = 1000 * 60 * 60 * 24;

function formatCardDate(value: string | undefined | null, locale: string, compact: boolean) {
  if (!value || value === "—") return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const loc = dateTimeLocale(locale);
  if (compact) {
    const month = d.toLocaleDateString(loc, { month: "short" });
    return `${d.getDate()} ${month} '${String(d.getFullYear()).slice(-2)}`;
  }
  return d.toLocaleDateString(loc, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function hasKnownDisplayValue(value) {
  const text = String(value ?? "").trim();
  return Boolean(text && !/^(?:-|—|tba|pending|null|undefined)$/i.test(text));
}

function JobCard({
  job,
  onClick,
  compact = false,
  onEducationClick,
  onStateClick,
  enterIndex = 0,
}: {
  job: JobRecord
  onClick?: () => void
  compact?: boolean
  onEducationClick?: (key: string) => void
  onStateClick?: (stateId: string) => void
  /** Stagger index for list entrance animation (capped in CSS). */
  enterIndex?: number
}) {
  const { t, i18n } = useTranslation();
  const now = useNow();
  const isMobile = useMediaQuery("(max-width: 640px)");
  const dateLocale = dateTimeLocale(i18n.language);
  const countLocale = numberLocale(i18n.language);
  const enriched = useMemo(() => (job?._enriched ? job : enrichJobMetadata(job)), [job]);

  const rawTitle = String(enriched?.title || "").trim() || t("job.untitled", { defaultValue: "Government recruitment" });
  const title = useMemo(
    () => getCachedEnglishNormalization(rawTitle) || rawTitle,
    [rawTitle]
  );
  const postName = useMemo(() => extractPostName(enriched), [enriched]);
  const translatedPostName = useMemo(
    () => (postName ? getCachedEnglishNormalization(postName) || postName : ""),
    [postName]
  );
  const showPostSubtitle =
    Boolean(postName) &&
    postName.length >= 3 &&
    !rawTitle.toLowerCase().includes(postName.toLowerCase());
  const dept = String(enriched?.dept || "").trim() || t("job.officialSource", { defaultValue: "Official notification" });
  const vacancies = Number(enriched?.vacancies) || 0;
  const lastDateRaw = enriched?.lastDate;
  const lastDate = formatCardDate(lastDateRaw, dateLocale, isMobile);
  const publishedDate = formatCardDate(enriched?.publishedDate, dateLocale, isMobile);
  const updatedDate = formatCardDate(enriched?.updatedDate, dateLocale, isMobile);
  const hasUpdated = updatedDate !== "—" && updatedDate !== publishedDate;
  const hasLastDate = hasKnownDisplayValue(lastDateRaw);
  const dateStatCount = (hasLastDate ? 1 : 0) + (hasUpdated ? 1 : 0);
  const isExpired = job?.status === "expired";
  const lastMs = hasLastDate ? new Date(String(lastDateRaw)).getTime() : NaN;
  const daysLeft =
    hasLastDate && !isExpired && !Number.isNaN(lastMs)
      ? Math.ceil((lastMs - now) / DAY_MS)
      : null;
  const isUrgent = daysLeft != null && daysLeft >= 0 && daysLeft <= 7;

  const officialHref =
    resolveJobApplyHref(enriched) || resolveOfficialApplyHref(enriched);
  const postsDisplay =
    vacancies > 0
      ? vacancies.toLocaleString(countLocale)
      : officialHref
        ? t("job.postsCheckOfficial", { defaultValue: "See official" })
        : t("job.postsUnavailable", { defaultValue: "Not listed" });

  const catId = job?.category && CATS.some((c) => c.id === job.category) ? job.category : "state";
  const catColor = (CATS.find((c) => c.id === catId) || { color: DS.saffron }).color;
  const isSponsored = Boolean(job?.is_sponsored || job?.isSponsored);
  const meta = [
    {
      icon: "📍",
      value: enriched?.state || "All India",
      kind: "state",
      stateId: enriched?.stateIds?.[0],
    },
    {
      icon: "🎓",
      value: enriched?.qual || t("job.qualSeeNotification", { defaultValue: "See notification" }),
      kind: "education",
      eduKey: enriched?.eduFilterKey,
    },
    { icon: "💰", value: enriched?.salary && enriched.salary !== "—" ? enriched.salary : null, kind: "salary" },
  ].filter((m) => m.value && (m.kind === "education" || (m.value !== "—" && m.value !== "See notification")));

  const viewDetailsLabel = `${t("jobDetail.viewDetails")}: ${title}`;
  const enterStyle = {
    "--mgj-enter-index": Math.min(enterIndex, 8),
  } as CSSProperties;
  const showDaysLeft = daysLeft != null && daysLeft <= 30 && daysLeft >= 0;

  return (
    <article
      data-testid={job?.id ? `job-card-${job.id}` : undefined}
      className={`job-card${compact ? " job-card--compact" : ""}${isExpired ? " job-card--expired" : ""}${onClick ? " job-card--clickable" : ""}`}
      style={enterStyle}
    >
      <div className="job-card__accent" style={{ background: `linear-gradient(180deg, ${catColor}, color-mix(in srgb, ${catColor} 30%, transparent))` }} aria-hidden />

      {onClick ? (
        <button
          type="button"
          className="job-card__action"
          onClick={onClick}
          aria-label={viewDetailsLabel}
        />
      ) : null}

      <div className="job-card__inner">
      <div className="job-card__top">
        <div className="job-card__main">
          <div className="job-card__badges">
            <span
              className="job-card__badge"
              style={{
                background: `${catColor}18`,
                color: catColor,
                border: `1px solid ${catColor}35`,
              }}
            >
              {t(`category.${catId}`).toUpperCase()}
            </span>
            {job?.status === "new" && <span className="job-card__badge job-card__badge--new">{t("job.new")}</span>}
            {job?.status === "hot" && (
              <span className="job-card__badge job-card__badge--hot">
                🔥 {t("job.hot")}
              </span>
            )}
            {isSponsored && (
              <span className="job-card__badge job-card__badge--sponsored">
                {t("job.sponsored", { defaultValue: "Featured" })}
              </span>
            )}
            {isExpired && (
              <span className="job-card__badge job-card__badge--expired">{t("job.expired")}</span>
            )}
            {job?._fromLive && (
              <span
                className="job-card__badge"
                style={{
                  background: "var(--ds-accentSoft)",
                  color: "var(--ds-saffron)",
                  border: "1px solid var(--ds-accentBorder)",
                }}
              >
                LIVE
              </span>
            )}
          </div>
          <h3 className="job-card__title">{title}</h3>
          {showPostSubtitle ? (
            <p className="job-card__post-name">{translatedPostName}</p>
          ) : null}
          <p className="job-card__dept">{dept}</p>
        </div>

        <div className="job-card__side">
          <div className="job-card__vacancy" title={vacancies > 0 ? undefined : t("job.postsTbaHint", { defaultValue: "See official notification for post count" })}>
            <div className={`job-card__vacancy-num${vacancies > 0 ? "" : " job-card__vacancy-num--muted"}`}>
              {postsDisplay}
            </div>
            <div className="job-card__vacancy-label">
              {vacancies > 0 ? t("job.posts") : t("job.notice", { defaultValue: "NOTICE" })}
            </div>
          </div>
          {showDaysLeft ? (
            <span className={`job-card__days${isUrgent ? " job-card__days--urgent" : ""}`}>
              {t("job.daysLeft", { count: daysLeft })}
            </span>
          ) : null}
          {isExpired ? (
            <span className="job-card__days job-card__days--expired">{t("job.expired")}</span>
          ) : null}
        </div>
      </div>

      <div
        className={`job-card__stats${vacancies > 0 ? " job-card__stats--vacancy-shown" : ""}${
          dateStatCount > 1 ? " job-card__stats--multi" : ""
        }${isMobile && dateStatCount > 1 ? " job-card__stats--stacked" : ""}`}
      >
        {hasLastDate ? (
          <div className="job-card__stat job-card__stat--highlight">
            <span className="job-card__stat-label job-card__stat-label--deadline">
              {t("job.lastDateToApply", { defaultValue: "Last Date to apply" })}
            </span>
            <span className="job-card__stat-value">{lastDate}</span>
          </div>
        ) : null}
        {hasUpdated ? (
          <div className="job-card__stat">
            <span className="job-card__stat-label">{t("job.updatedOn", { defaultValue: "Updated" })}</span>
            <span className="job-card__stat-value">{updatedDate}</span>
          </div>
        ) : null}
        {!hasLastDate && !hasUpdated ? (
          <div className="job-card__stat">
            <span className="job-card__stat-label job-card__stat-label--deadline">
              {t("job.lastDateToApply", { defaultValue: "Last Date to apply" })}
            </span>
            <span className="job-card__stat-value job-card__stat-value--muted">
              {officialHref
                ? t("job.postsCheckOfficial", { defaultValue: "See official" })
                : t("job.postsUnavailable", { defaultValue: "Not listed" })}
            </span>
          </div>
        ) : null}
        <span className="job-card__cta" aria-hidden="true">
          {t("jobDetail.view", { defaultValue: "View" })} →
        </span>
      </div>

      <div className="job-card__meta">
        {meta.map(({ icon, value, kind, stateId, eduKey }) => {
          const canState = kind === "state" && stateId && stateId !== "all" && onStateClick;
          const canEdu = kind === "education" && eduKey && onEducationClick;
          const Tag = canState || canEdu ? "button" : "span";
          const handleChip = (e) => {
            if (!canState && !canEdu) return;
            e.stopPropagation();
            if (canState) onStateClick(stateId);
            else if (canEdu) onEducationClick(eduKey);
          };
          return (
            <Tag
              key={`${icon}-${value}`}
              type={Tag === "button" ? "button" : undefined}
              className={`job-card__chip${canState || canEdu ? " job-card__chip--link" : ""}`}
              title={value}
              onClick={handleChip}
            >
              {icon} {value}
            </Tag>
          );
        })}
      </div>
      </div>
    </article>
  );
}

export default memo(
  JobCard,
  (a, b) =>
    a.job?.id === b.job?.id &&
    a.job?.slug === b.job?.slug &&
    a.job?.title === b.job?.title &&
    a.job?.status === b.job?.status &&
    a.job?.lastDate === b.job?.lastDate &&
    a.job?.vacancies === b.job?.vacancies &&
    a.job?.updated_at === b.job?.updated_at &&
    a.compact === b.compact &&
    a.onClick === b.onClick &&
    a.onEducationClick === b.onEducationClick &&
    a.onStateClick === b.onStateClick
);
