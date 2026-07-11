import { useTranslation } from "react-i18next";
import { isPdfUrl } from "@/utils/officialDomains";
import { translateSectionHeading } from "@/utils/jobDetailLabels";
import { sanitizeParagraphText } from "@/utils/jobDetailLinks";
import { useRevealOnScroll } from "@/hooks/useRevealOnScroll";
import type { CSSProperties, ReactNode } from "react";

export function Section({
  title,
  children,
  className = "",
  reveal = true,
  revealDelay = 0,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
  reveal?: boolean;
  revealDelay?: number;
}) {
  const { ref, visible } = useRevealOnScroll<HTMLElement>();
  const revealClass =
    reveal ? `mgj-reveal${visible ? " mgj-reveal--visible" : ""}` : "";
  const style = reveal
    ? ({ "--mgj-reveal-delay": `${revealDelay}ms` } as CSSProperties)
    : undefined;

  return (
    <section
      ref={reveal ? ref : undefined}
      className={`job-detail-section ${revealClass} ${className}`.trim()}
      style={style}
    >
      {title ? <h3 className="job-detail-section-title">{title}</h3> : null}
      {children}
    </section>
  );
}

export function displayValue(v: unknown, fallback = "") {
  const s = String(v ?? "").trim();
  if (!s || /^(?:-|—|tba|pending|null|undefined)$/i.test(s)) return fallback;
  return s;
}

function isKvRow(row: Record<string, string>) {
  const label = row.label || row.Label;
  const value = row.value || row.Value;
  return Boolean(label && value);
}

function isKvTable(rows: Record<string, string>[]) {
  return rows?.length > 0 && rows.every(isKvRow);
}

export function isDateTable(rows: Record<string, string>[]) {
  return (
    rows?.length > 0 &&
    rows.every((row) => {
      const event = row.event || row.Event;
      const date = row.date || row.Date;
      return Boolean(event && date);
    })
  );
}

export function FactsGrid({ items }: { items: Array<{ label: string; value: string }> }) {
  if (!items.length) return null;
  return (
    <div className="job-detail-facts-grid">
      {items.map((item) => (
        <div key={`${item.label}-${item.value}`} className="job-detail-fact-card">
          <div className="job-detail-fact-label">{item.label}</div>
          <div className="job-detail-fact-value">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

export function renderDataTable(rows: unknown) {
  const tableRows = Array.isArray(rows)
    ? rows
    : rows && typeof rows === "object"
      ? [rows as Record<string, string>]
      : [];
  if (!tableRows.length) return null;

  if (isKvTable(tableRows)) {
    return (
      <FactsGrid
        items={tableRows.map((row) => ({
          label: row.label || row.Label || "",
          value: row.value || row.Value || "",
        }))}
      />
    );
  }

  const keys = Object.keys(tableRows[0] || {});
  if (!keys.length) return null;

  return (
    <div className="job-detail-table-wrap">
      <table className="job-detail-table job-detail-table--data">
        <thead>
          <tr>
            {keys.map((key) => (
              <th key={key}>{key}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tableRows.map((row, i) => (
            <tr key={i}>
              {keys.map((key) => (
                <td key={key}>{row[key] ?? ""}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ContentSections({
  sections,
  skipDateTables = false,
  actionUrls,
}: {
  sections: Array<{
    heading?: string;
    paragraphs?: string[];
    tables?: Record<string, string>[][];
    lists?: string[][];
    links?: Array<{ label?: string; url?: string }>;
  }>;
  skipDateTables?: boolean;
  actionUrls: ReadonlySet<string>;
}) {
  const { t } = useTranslation();
  if (!sections?.length) return null;

  return sections.map((section, idx) => {
    const tables = (section.tables || []).filter((table) => {
      if (!skipDateTables || !isDateTable(table)) return true;
      return !/important\s*dates/i.test(section.heading || "");
    });

    const paragraphs = (section.paragraphs || [])
      .map((p) => sanitizeParagraphText(p, actionUrls))
      .filter(Boolean);
    const lists = (section.lists || [])
      .map((list) =>
        list.map((item) => sanitizeParagraphText(item, actionUrls)).filter(Boolean)
      )
      .filter((list) => list.length > 0);

    const hasContent = paragraphs.length || tables.length || lists.length;
    if (!hasContent && !section.heading) return null;

    const sectionTitle = translateSectionHeading(t, section.heading || "");

    return (
      <Section key={`${section.heading}-${idx}`} title={sectionTitle}>
        {paragraphs.map((paragraph, pIdx) => (
          <p key={pIdx} className="job-detail-summary">
            {paragraph}
          </p>
        ))}
        {tables.map((table, tIdx) => (
          <div key={tIdx}>{renderDataTable(table)}</div>
        ))}
        {lists.map((list, lIdx) => (
          <ul key={lIdx} className="job-detail-bullets">
            {list.map((item, iIdx) => (
              <li key={iIdx}>{item}</li>
            ))}
          </ul>
        ))}
      </Section>
    );
  });
}

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

/** Make raw PDF / ALL-CAPS notification text easier to read in the UI. */
export function formatSummaryForDisplay(text: string): string {
  let s = String(text || "").replace(/\s+/g, " ").trim();
  if (!s) return "";

  if (/manual under right to information/i.test(s)) {
    const useful = s.match(
      /(?:teacher|recruitment|notification|hall\s*ticket|eligibility|examination|apply|release)[^.!?]{12,}[.!?]/i
    );
    if (useful) s = useful[0];
    else if (/^1\s+manual/i.test(s)) return "";
  }

  const alpha = s.replace(/[^a-zA-Z]/g, "");
  if (alpha.length > 40 && s === s.toUpperCase()) {
    s = s
      .toLowerCase()
      .replace(/(^|[.!?]\s+)(\w)/g, (_, sep, ch) => `${sep}${ch.toUpperCase()}`);
  }

  return s;
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

export function JobDetailSummaryCard({
  dept,
  postName,
  qualification,
  lastDate,
  vacancies,
  countLocale,
  t,
}: {
  dept: string;
  postName: string;
  qualification: string;
  lastDate: string;
  vacancies: number;
  countLocale: string;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  return (
    <div className="job-detail-summary-card">
      <div className="job-detail-summary-card__logo" aria-hidden>
        {orgInitials(dept || "Govt")}
      </div>
      <div className="job-detail-summary-card__body">
        {dept ? <p className="job-detail-summary-card__org">{dept}</p> : null}
        <dl className="job-detail-summary-card__facts">
          {postName ? (
            <div className="job-detail-summary-card__fact">
              <dt>{t("jobDetail.postName")}</dt>
              <dd>{postName}</dd>
            </div>
          ) : vacancies > 0 ? (
            <div className="job-detail-summary-card__fact">
              <dt>{t("job.posts")}</dt>
              <dd>
                {vacancies.toLocaleString(countLocale)} {t("job.posts")}
              </dd>
            </div>
          ) : null}
          {qualification && qualification !== "—" ? (
            <div className="job-detail-summary-card__fact">
              <dt>{t("jobDetail.qualification", { defaultValue: "Qualification" })}</dt>
              <dd>{qualification}</dd>
            </div>
          ) : null}
          {lastDate && lastDate !== "—" ? (
            <div className="job-detail-summary-card__fact">
              <dt>{t("jobDetail.lastDateLabel")}</dt>
              <dd>{lastDate}</dd>
            </div>
          ) : null}
        </dl>
      </div>
    </div>
  );
}

export function JobDetailStickyBar({
  primaryAction,
  shareTitle,
  shareUrl,
  t,
}: {
  primaryAction: { url: string; label: string } | null;
  shareTitle: string;
  shareUrl: string;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const whatsAppShare =
    shareTitle && shareUrl
      ? `https://wa.me/?text=${encodeURIComponent(`${shareTitle}\n${shareUrl}`)}`
      : null;

  return (
    <div className="job-detail-sticky-bar" aria-label={t("jobDetail.quickActions", { defaultValue: "Quick actions" })}>
      {primaryAction ? (
        <a
          href={primaryAction.url}
          target="_blank"
          rel="noopener noreferrer"
          className="job-detail-sticky-bar__apply"
        >
          {primaryAction.label}
        </a>
      ) : null}
      {whatsAppShare ? (
        <a
          href={whatsAppShare}
          target="_blank"
          rel="noopener noreferrer"
          className="job-detail-sticky-bar__share"
        >
          {t("socialAlert.shareJob", { defaultValue: "Share" })}
        </a>
      ) : null}
      <a href="/alerts" className="job-detail-sticky-bar__alert">
        {t("socialAlert.personalAlerts", { defaultValue: "Alerts" })}
      </a>
    </div>
  );
}

export function JobDetailHighlights({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="job-detail-highlights" role="list">
      {items.map((item) => (
        <span key={item} role="listitem">
          {item}
        </span>
      ))}
    </div>
  );
}

export function ImportantDatesTimeline({
  entries,
  translateEvent,
}: {
  entries: Array<[string, string]>;
  translateEvent: (event: string) => string;
}) {
  if (!entries.length) return null;
  return (
    <ol className="job-detail-timeline">
      {entries.map(([event, dateVal], idx) => (
        <li key={`${event}-${dateVal}`} className="job-detail-timeline__item">
          <div className="job-detail-timeline__marker" aria-hidden>
            <span className="job-detail-timeline__dot" />
            {idx < entries.length - 1 ? <span className="job-detail-timeline__line" /> : null}
          </div>
          <div className="job-detail-timeline__body">
            <div className="job-detail-timeline__event">{translateEvent(event)}</div>
            <div className="job-detail-timeline__date">{String(dateVal)}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function FeeGrid({
  entries,
  translateKey,
}: {
  entries: Array<[string, string]>;
  translateKey: (key: string) => string;
}) {
  if (!entries.length) return null;
  return (
    <div className="job-detail-fee-grid">
      {entries.map(([key, value]) => (
        <div key={key} className="job-detail-fee-card">
          <div className="job-detail-fee-card__label">{translateKey(key)}</div>
          <div className="job-detail-fee-card__value">{String(value)}</div>
        </div>
      ))}
    </div>
  );
}

export function ExtraDetailsGrid({ items }: { items: Array<{ label: string; value: string }> }) {
  if (!items.length) return null;
  return (
    <div className="job-detail-extra-grid">
      {items.map((item) => (
        <div key={`${item.label}-${item.value}`} className="job-detail-extra-card">
          <div className="job-detail-extra-label">{item.label}</div>
          <div className="job-detail-extra-value">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

export function EligibilityBlock({
  items,
  rows,
}: {
  items: string[];
  rows: Array<{ label: string; value: string }>;
}) {
  const hasList = items.length > 0;
  const hasRows = rows.some((r) => r.value && r.value !== "—");
  if (!hasList && !hasRows) return null;

  return (
    <div className="job-detail-eligibility">
      {hasRows ? (
        <dl className="job-detail-eligibility-grid">
          {rows
            .filter((r) => r.value && r.value !== "—")
            .map((row) => (
              <div key={row.label} className="job-detail-eligibility-grid__row">
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
        </dl>
      ) : null}
      {hasList ? (
        <ul className="job-detail-eligibility-list">
          {items.map((item, i) => (
            <li key={i} className="job-detail-eligibility-list__item">
              {item}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
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

export function JobDetailActions({
  actions,
  emptyLabel,
}: {
  actions: Array<{ url: string; label: string; variant?: string }>;
  emptyLabel: string;
}) {
  if (!actions.length) {
    return (
      <div className="job-detail-actions job-detail-actions--inline job-detail-actions--empty">
        <p>{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="job-detail-actions job-detail-actions--inline">
      {actions.map((action) => {
        const isMailto = action.url.toLowerCase().startsWith("mailto:");
        return (
          <a
            key={action.url}
            href={action.url}
            {...(isMailto ? {} : { target: "_blank", rel: "noopener noreferrer" })}
            className={
              action.variant === "primary"
                ? "job-detail-action-btn job-detail-action-btn--primary"
                : "job-detail-action-btn job-detail-action-btn--secondary"
            }
            onClick={(e) => e.stopPropagation()}
          >
            {isPdfUrl(action.url) ? "📄" : isMailto ? "✉️" : "🔗"} {action.label}
            {!isMailto ? " ↗" : ""}
          </a>
        );
      })}
    </div>
  );
}
