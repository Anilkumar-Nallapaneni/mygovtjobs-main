import { isPdfUrl } from "@/utils/officialDomains";
import { useRevealOnScroll } from "@/hooks/useRevealOnScroll";

function orgInitials(dept: string) {
  const words = dept.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "GO";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export type GlanceFact = {
  id: string;
  icon: string;
  label: string;
  value: string;
};

export function buildGlanceFacts({
  postName,
  qualification,
  salary,
  age,
  publishedDate,
  applyMode,
  vacancies,
  countLocale,
  t,
}: {
  postName: string;
  qualification: string;
  salary: string;
  age: string;
  publishedDate: string;
  applyMode: string;
  vacancies: number;
  countLocale: string;
  t: (key: string, opts?: Record<string, unknown>) => string;
}): GlanceFact[] {
  return [
    postName
      ? { id: "post", icon: "📋", label: t("jobDetail.postName"), value: postName }
      : null,
    vacancies > 0
      ? {
          id: "vacancies",
          icon: "👥",
          label: t("job.posts"),
          value: `${vacancies.toLocaleString(countLocale)} ${t("job.posts")}`,
        }
      : null,
    qualification && qualification !== "—"
      ? {
          id: "qual",
          icon: "🎓",
          label: t("jobDetail.qualification", { defaultValue: "Qualification" }),
          value: qualification,
        }
      : null,
    salary && salary !== "—" && !/see official/i.test(salary)
      ? {
          id: "salary",
          icon: "💰",
          label: t("jobDetail.salary", { defaultValue: "Salary" }),
          value: salary,
        }
      : null,
    age && age !== "—" && !/see official/i.test(age)
      ? {
          id: "age",
          icon: "🎂",
          label: t("jobDetail.ageLimit", { defaultValue: "Age limit" }),
          value: age,
        }
      : null,
    publishedDate
      ? {
          id: "published",
          icon: "📰",
          label: t("jobDetail.publishedDate", { defaultValue: "Published" }),
          value: publishedDate,
        }
      : null,
    applyMode
      ? { id: "apply-mode", icon: "🖥️", label: t("jobDetail.applyMode"), value: applyMode }
      : null,
  ].filter(Boolean) as GlanceFact[];
}

export function JobDetailKeyFactsPanel({
  dept,
  facts,
  lastDate,
  daysLeft,
  isUrgent,
  primaryAction,
  t,
}: {
  dept: string;
  facts: GlanceFact[];
  lastDate: string;
  daysLeft: number | null;
  isUrgent: boolean;
  primaryAction: { url: string; label: string } | null;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const { ref, visible } = useRevealOnScroll<HTMLElement>();
  if (!facts.length && (!lastDate || lastDate === "—")) return null;

  return (
    <section
      ref={ref}
      className={`job-detail-keyfacts mgj-reveal${visible ? " mgj-reveal--visible" : ""}`}
      aria-label={t("jobDetail.keyDetails", { defaultValue: "Key details" })}
    >
      <div className="job-detail-keyfacts__card">
        <div className="job-detail-keyfacts__header">
          <div className="job-detail-keyfacts__logo" aria-hidden>
            {orgInitials(dept || "Govt")}
          </div>
          <div>
            <p className="job-detail-keyfacts__eyebrow">
              {t("jobDetail.keyDetails", { defaultValue: "Key details" })}
            </p>
            {dept ? <p className="job-detail-keyfacts__org">{dept}</p> : null}
          </div>
          {primaryAction ? (
            <a
              href={primaryAction.url}
              target="_blank"
              rel="noopener noreferrer"
              className="job-detail-keyfacts__apply"
            >
              {primaryAction.label}
            </a>
          ) : null}
        </div>

        <div className="job-detail-keyfacts__body">
          {lastDate && lastDate !== "—" ? (
            <div
              className={`job-detail-keyfacts__deadline${isUrgent ? " job-detail-keyfacts__deadline--urgent" : ""}`}
            >
              <span className="job-detail-keyfacts__deadline-icon" aria-hidden>
                📅
              </span>
              <div>
                <span className="job-detail-keyfacts__deadline-label">
                  {t("jobDetail.lastDateLabel")}
                </span>
                <strong className="job-detail-keyfacts__deadline-value">{lastDate}</strong>
                {daysLeft != null && daysLeft >= 0 ? (
                  <span className="job-detail-keyfacts__deadline-hint">
                    {isUrgent
                      ? t("jobDetail.closingIn", { count: daysLeft })
                      : t("jobDetail.daysLeft", {
                          count: daysLeft,
                          defaultValue: "{{count}} days left",
                        })}
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}

          {facts.length > 0 ? (
            <dl className="job-detail-keyfacts__grid">
              {facts.map((fact) => (
                <div key={fact.id} className="job-detail-keyfacts__tile">
                  <span className="job-detail-keyfacts__tile-icon" aria-hidden>
                    {fact.icon}
                  </span>
                  <div className="job-detail-keyfacts__tile-body">
                    <dt>{fact.label}</dt>
                    <dd>{fact.value}</dd>
                  </div>
                </div>
              ))}
            </dl>
          ) : null}
        </div>

        <p className="job-detail-keyfacts__trust">
          {t("jobDetail.officialSourceBadge", {
            defaultValue: "Verified official source — .gov.in portals only",
          })}
        </p>
      </div>
    </section>
  );
}

export function JobDetailGlancePanel({
  dept,
  postName,
  qualification,
  salary,
  age,
  lastDate,
  vacancies,
  publishedDate,
  applyMode,
  daysLeft,
  isUrgent,
  countLocale,
  primaryAction,
  actions,
  t,
}: {
  dept: string;
  postName: string;
  qualification: string;
  salary: string;
  age: string;
  lastDate: string;
  vacancies: number;
  publishedDate: string;
  applyMode: string;
  daysLeft: number | null;
  isUrgent: boolean;
  countLocale: string;
  primaryAction: { url: string; label: string } | null;
  actions: Array<{ url: string; label: string; variant?: string }>;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const glanceRows = buildGlanceFacts({
    postName,
    qualification,
    salary,
    age,
    publishedDate,
    applyMode,
    vacancies,
    countLocale,
    t,
  }).map((fact) => ({ label: fact.label, value: fact.value }));

  return (
    <aside className="job-detail-glance" aria-label={t("jobDetail.atAGlance", { defaultValue: "At a glance" })}>
      <div className="job-detail-glance__card">
        <div className="job-detail-glance__header">
          <div className="job-detail-glance__logo" aria-hidden>
            {orgInitials(dept || "Govt")}
          </div>
          <div className="job-detail-glance__header-text">
            <p className="job-detail-glance__eyebrow">
              {t("jobDetail.atAGlance", { defaultValue: "At a glance" })}
            </p>
            {dept ? <p className="job-detail-glance__org">{dept}</p> : null}
          </div>
        </div>

        {lastDate && lastDate !== "—" ? (
          <div
            className={`job-detail-glance__deadline${isUrgent ? " job-detail-glance__deadline--urgent" : ""}`}
          >
            <span className="job-detail-glance__deadline-label">{t("jobDetail.lastDateLabel")}</span>
            <strong className="job-detail-glance__deadline-value">{lastDate}</strong>
            {daysLeft != null && daysLeft >= 0 ? (
              <span className="job-detail-glance__deadline-count">
                {isUrgent
                  ? t("jobDetail.closingIn", { count: daysLeft })
                  : t("jobDetail.daysLeft", { count: daysLeft, defaultValue: "{{count}} days left" })}
              </span>
            ) : null}
          </div>
        ) : null}

        {glanceRows.length > 0 ? (
          <dl className="job-detail-glance__facts">
            {glanceRows.map((row) => (
              <div key={row.label} className="job-detail-glance__fact">
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {primaryAction ? (
          <a
            href={primaryAction.url}
            target="_blank"
            rel="noopener noreferrer"
            className="job-detail-glance__apply"
          >
            {primaryAction.label}
          </a>
        ) : null}

        {actions.length > 1 ? (
          <div className="job-detail-glance__links">
            {actions
              .filter((a) => a.url !== primaryAction?.url)
              .slice(0, 3)
              .map((action) => (
                <a
                  key={action.url}
                  href={action.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="job-detail-glance__link"
                >
                  {isPdfUrl(action.url) ? "📄" : "🔗"} {action.label}
                </a>
              ))}
          </div>
        ) : null}

        <p className="job-detail-glance__trust">
          {t("jobDetail.officialSourceBadge", {
            defaultValue: "Verified official source — .gov.in portals only",
          })}
        </p>
      </div>
    </aside>
  );
}
