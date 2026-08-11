import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";

import { useNow } from "@/hooks/useNow";
import { DS } from "@/theme/designSystem";
import { CATS } from "@/data/categories";
import { useTranslatedJob } from "@/hooks/useTranslatedJob";
import { useTranslatedText } from "@/hooks/useTranslatedText";
import {
  translateDateKey,
  translateFactLabel,
  translateFeeKey,
} from "@/utils/jobDetailLabels";
import { buildJobDetailView } from "@/utils/jobDetailContent";
import { isJunkKvFact } from "@/utils/jobDetailStructured";
import { extractPostName } from "@/utils/extractPostName";
import {
  buildUnifiedDetailActions,
  sanitizeParagraphText,
} from "@/utils/jobDetailLinks";
import RelatedJobs from "@/components/jobs/RelatedJobs";
import JobDetailFaq from "@/components/jobs/JobDetailFaq";
import ReportJobButton from "@/components/jobs/ReportJobButton";
import BookmarkButton from "@/components/jobs/BookmarkButton";
import JobComments from "@/components/jobs/JobComments";
import AdSlot from "@/components/ads/AdSlot";
import SocialAlertBar from "@/components/home/SocialAlertBar";
import "@/styles/jobs.css";
import {
  buildGlanceFacts,
  ContentSections,
  displayValue,
  EligibilityBlock,
  ExtraDetailsGrid,
  FactsGrid,
  FeeGrid,
  formatSummaryForDisplay,
  ImportantDatesTimeline,
  JobDetailActions,
  JobDetailGlancePanel,
  JobDetailHighlights,
  JobDetailKeyFactsPanel,
  JobDetailStickyBar,
  Section,
} from "@/components/jobs/jobDetailUi";
import type { JobRecord } from "@/types/job";
import { numberLocale } from "@/utils/formatLocale";

const DAY_MS = 1000 * 60 * 60 * 24;
const SKIP_PLACEHOLDER = /^(?:see official notification|see notification|-+|—)$/i;

function showField(value: unknown) {
  const s = displayValue(value, "");
  return Boolean(s) && !SKIP_PLACEHOLDER.test(s);
}

export default function JobDetail({
  job,
  onClose,
  relatedJobs = [],
  onRelatedJobClick,
  layout = "page",
}: {
  job: JobRecord;
  onClose: () => void;
  relatedJobs?: JobRecord[];
  onRelatedJobClick?: (job: JobRecord) => void;
  layout?: "page" | "modal";
}) {
  const { t, i18n } = useTranslation();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const { job: displayJob, translating } = useTranslatedJob(job);
  const view = useMemo(() => buildJobDetailView(displayJob), [displayJob]);
  const structured = view.structured;
  const useStructured = structured?.isStructured;
  const isPageLayout = layout === "page";

  const now = useNow();
  const catColor = (CATS.find((c) => c.id === view.category) || { color: DS.saffron }).color;
  const lastDateMs = view.lastDate ? new Date(view.lastDate).getTime() : NaN;
  const daysLeft = Number.isFinite(lastDateMs)
    ? Math.ceil((lastDateMs - now) / DAY_MS)
    : null;
  const isUrgent = daysLeft != null && daysLeft >= 0 && daysLeft <= 7;
  const countLocale = numberLocale(i18n.language);

  const detailActions = useMemo(() => buildUnifiedDetailActions(job), [job]);
  const primaryAction = detailActions.find((a) => a.variant === "primary") ?? detailActions[0] ?? null;
  const actionUrls = useMemo(
    () => new Set(detailActions.map((a) => a.url)),
    [detailActions]
  );

  const postName =
    extractPostName(displayJob) ||
    structured?.overviewFacts.find((f) => /post name/i.test(f.label))?.value ||
    "";
  const vacancyRows =
    structured?.vacancyRows?.length > 0
      ? structured.vacancyRows
      : (view.posts || [])
          .map((row) => ({
            post: row.post || row.post_name || "",
            vacancies: String(row.vacancies ?? ""),
            payLevel: row.pay_level || "",
          }))
          .filter((row) => row.post);
  const showPayLevel = vacancyRows.some((row) => row.payLevel);
  const rawApplyMode =
    structured?.applyMode ||
    structured?.overviewFacts.find((f) => /apply mode/i.test(f.label))?.value ||
    "";
  const applyMode = useTranslatedText(rawApplyMode);
  const feeEntries = (Object.entries(view.fee || {}).filter(([, v]) => v && String(v).trim()) as [string, string][]);

  const overviewFacts = (structured?.overviewFacts || [])
    .filter(
      (f) =>
        f.label &&
        f.value &&
        !isJunkKvFact(f) &&
        !/^post name$/i.test(f.label) &&
        !/^(company name|organization name)$/i.test(f.label) &&
        !(feeEntries.length > 0 && /\bfee\b/i.test(f.label))
    )
    // Keep overview scannable — dump of 40+ PDF rows looks broken.
    .slice(0, 10);

  const dateEntries = useStructured
    ? structured.importantDates.map((d) => [d.event, d.date] as [string, string])
    : (Object.entries(view.dates || {}).filter(([, v]) => v && String(v).trim()) as [string, string][]);

  const rawSummary = view.about || "";
  const summaryText = formatSummaryForDisplay(sanitizeParagraphText(rawSummary, actionUrls));
  const bodySections = useStructured ? structured.articleSections : [];
  const showSummaryLead = Boolean(summaryText) && summaryText.length >= 40;

  const highlights = (view.highlights || []).filter(Boolean);
  const extraDetails = (view.extraDetails || []).map((item: { label: string; value: string }) => ({
    label: translateFactLabel(t, item.label),
    value: item.value,
  }));

  const eligibilityList = structured?.eligibility?.length ? structured.eligibility : [];

  const eligibilityRows = [
    showField(view.qual) ? { label: t("jobDetail.qualification", { defaultValue: "Qualification" }), value: displayValue(view.qual) } : null,
    showField(view.nationality) ? { label: t("jobDetail.nationality", { defaultValue: "Nationality" }), value: displayValue(view.nationality) } : null,
    showField(view.age) ? { label: t("jobDetail.ageLimit", { defaultValue: "Age limit" }), value: displayValue(view.age) } : null,
    showField(view.ageRelax) ? { label: t("jobDetail.ageRelaxation", { defaultValue: "Age relaxation" }), value: displayValue(view.ageRelax) } : null,
    showField(view.attempts) ? { label: t("jobDetail.attempts", { defaultValue: "Attempts" }), value: displayValue(view.attempts) } : null,
    showField(view.syllabus) ? { label: t("jobDetail.syllabus", { defaultValue: "Syllabus" }), value: displayValue(view.syllabus) } : null,
    showField(view.helpdesk) ? { label: t("jobDetail.helpdesk", { defaultValue: "Helpdesk" }), value: displayValue(view.helpdesk) } : null,
    showField(view.email) ? { label: t("jobDetail.email", { defaultValue: "Email" }), value: displayValue(view.email) } : null,
    showField(view.streetAddress || view.street_address)
      ? {
          label: t("jobDetail.officeAddress", { defaultValue: "Office address" }),
          value: displayValue(
            [view.streetAddress || view.street_address, view.postalCode || view.postal_code || view.pincode]
              .filter(Boolean)
              .join(" — ")
          ),
        }
      : null,
    ...(structured?.ageLimit || []).map((value) => ({
      label: t("jobDetail.ageLimit", { defaultValue: "Age limit" }),
      value,
    })),
    ...(structured?.salaryInfo || []).map((value) => ({
      label: t("jobDetail.salary", { defaultValue: "Salary" }),
      value,
    })),
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  const publishedDate = displayValue(
    view.publishedDate || String(view.published_at || "").slice(0, 10),
    ""
  );
  const verifiedAtText = useMemo(() => {
    const detail = job.detail && typeof job.detail === "object"
      ? (job.detail as Record<string, unknown>)
      : {};
    const raw = String(
      job.verified_at ||
      job.link_last_checked_at ||
      detail.detail_updated_at ||
      job.updated_at ||
      ""
    ).trim();
    if (!raw) return "";
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return "";
    return new Intl.DateTimeFormat(i18n.language, {
      timeZone: "Asia/Kolkata",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(parsed);
  }, [i18n.language, job]);

  const glanceFacts = buildGlanceFacts({
    postName,
    qualification: displayValue(view.qual, "—"),
    salary: displayValue(view.salary, "—"),
    age: displayValue(view.age, "—"),
    publishedDate,
    applyMode,
    vacancies: view.vacancies,
    countLocale,
    t,
  });

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.href;
  }, []);

  useEffect(() => {
    const panel = panelRef.current;
    const focusableSelector =
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

    const getFocusable = () =>
      panel
        ? Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector)).filter(
            (el) => !el.hasAttribute("disabled") && el.tabIndex !== -1
          )
        : [];

    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const nodes = getFocusable();
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    const prevOverflow = document.body.style.overflow;
    if (layout === "modal") {
      document.body.style.overflow = "hidden";
    }
    document.addEventListener("keydown", onKey);
    const nodes = getFocusable();
    (nodes[0] || panel)?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, layout]);

  const glancePanel = (
    <JobDetailGlancePanel
      dept={view.dept || ""}
      postName={postName}
      qualification={displayValue(view.qual, "—")}
      salary={displayValue(view.salary, "—")}
      age={displayValue(view.age, "—")}
      lastDate={displayValue(view.lastDate, "—")}
      vacancies={view.vacancies}
      publishedDate={publishedDate}
      applyMode={applyMode}
      daysLeft={daysLeft}
      isUrgent={isUrgent}
      countLocale={countLocale}
      primaryAction={primaryAction}
      actions={detailActions}
      t={t}
    />
  );

  const mainContent = (
    <>
      {highlights.length > 0 ? <JobDetailHighlights items={highlights} /> : null}

      <SocialAlertBar
        compact
        className="job-detail-social-alert job-detail-social-alert--desktop job-detail-social-alert--muted"
        shareTitle={view.title}
        shareUrl={shareUrl}
      />

      <dl className="job-detail-verification-meta" aria-label="Source verification">
        <div>
          <dt>Source</dt>
          <dd>Official organization website</dd>
        </div>
        {verifiedAtText ? (
          <div>
            <dt>Last checked</dt>
            <dd>{verifiedAtText} IST</dd>
          </div>
        ) : null}
        <div>
          <dt>Status</dt>
          <dd>{String(job.status || "live").toLowerCase() === "live" ? "Active" : "Expired"}</dd>
        </div>
      </dl>

      {job.id || job.slug ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <BookmarkButton
            jobId={String(job.id || job.slug)}
            jobSlug={String(job.slug || job.id || '')}
          />
          <ReportJobButton jobId={String(job.id || job.slug)} jobTitle={view.title} />
        </div>
      ) : null}

      <AdSlot slot="job-detail-mid" format="auto" />


      {translating ? (
        <p className="job-detail-translating" role="status">
          {t("jobDetail.translating", { defaultValue: "Loading notification text…" })}
        </p>
      ) : null}

      <p className="job-detail-language-note">
        {t("jobDetail.contentLanguageNote", {
          defaultValue:
            "Job notifications are shown in their original language. Only the site menus and labels are translated.",
        })}
      </p>

      {showSummaryLead ? (
        <Section
          title={t("jobDetail.aboutRecruitment", { defaultValue: "About this recruitment" })}
          className="job-detail-section--lead"
        >
          <div className="job-detail-lead">
            <p className="job-detail-summary job-detail-summary--lead">{summaryText}</p>
          </div>
        </Section>
      ) : null}

      {dateEntries.length > 0 ? (
        <Section title={t("jobDetail.importantDates")}>
          <ImportantDatesTimeline
            entries={dateEntries}
            translateEvent={(event) => translateDateKey(t, event)}
          />
        </Section>
      ) : null}

      {vacancyRows.length > 0 ? (
        <Section title={t("jobDetail.vacancyDetails", { defaultValue: "Vacancy details" })}>
          <div className="job-detail-table-wrap">
            <table className="job-detail-table job-detail-table--data">
              <thead>
                <tr>
                  <th>{t("jobDetail.postName")}</th>
                  <th>{t("job.posts")}</th>
                  {showPayLevel ? (
                    <th>{t("jobDetail.payLevel", { defaultValue: "Pay level" })}</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {vacancyRows.map((row) => (
                  <tr key={`${row.post}-${row.vacancies}`}>
                    <td>{row.post}</td>
                    <td>{row.vacancies}</td>
                    {showPayLevel ? <td>{"payLevel" in row ? row.payLevel || "—" : "—"}</td> : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      ) : null}

      {overviewFacts.length > 0 ? (
        <Section title={t("jobDetail.overview", { defaultValue: "Overview" })}>
          <FactsGrid
            items={overviewFacts.map((f) => ({
              label: translateFactLabel(t, f.label),
              value: f.value,
            }))}
          />
        </Section>
      ) : null}

      {eligibilityList.length > 0 || eligibilityRows.length > 0 ? (
        <Section title={t("jobDetail.eligibilityDetails", { defaultValue: "Eligibility details" })}>
          <EligibilityBlock items={eligibilityList} rows={eligibilityRows} />
        </Section>
      ) : null}

      {feeEntries.length > 0 ? (
        <Section title={t("jobDetail.applicationFee")}>
          <FeeGrid
            entries={feeEntries}
            translateKey={(key) => translateFeeKey(t, key)}
          />
        </Section>
      ) : null}

      {useStructured ? (
        <>
          <ContentSections
            sections={bodySections.filter(
              (s) =>
                !/full details are being verified/i.test((s.paragraphs || []).join(" ")) &&
                !/verification information/i.test(s.heading || "") &&
                !/^faqs?$/i.test(s.heading || "") &&
                !/frequently\s+asked/i.test(s.heading || "") &&
                !(/application\s*fee|exam\s*fee/i.test(s.heading || "") && feeEntries.length > 0) &&
                !(/important\s*dates/i.test(s.heading || "") && dateEntries.length > 0) &&
                !(/vacancy/i.test(s.heading || "") && vacancyRows.length > 0)
            )}
            skipDateTables
            actionUrls={actionUrls}
          />
          {!bodySections.some((s) => /selection/i.test(s.heading || "")) && view.selection?.length > 0 ? (
            <Section title={t("jobDetail.selectionProcess")}>
              <ol className="job-detail-steps">
                {view.selection.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </Section>
          ) : null}
          {!bodySections.some((s) => /how\s*to\s*apply|application\s+procedure/i.test(s.heading || "")) &&
          view.howApply?.length > 0 ? (
            <Section title={t("jobDetail.howToApply")}>
              <ol className="job-detail-steps">
                {view.howApply.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </Section>
          ) : null}
          {Array.isArray(view.documentsRequired) &&
          view.documentsRequired.length > 0 &&
          !bodySections.some((s) => /documents?/i.test(s.heading || "")) ? (
            <Section title={t("jobDetail.documentsRequired", { defaultValue: "Documents required" })}>
              <ul className="job-detail-bullets">
                {view.documentsRequired.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </Section>
          ) : null}
        </>
      ) : (
        <>
          {view.selection?.length > 0 ? (
            <Section title={t("jobDetail.selectionProcess")}>
              <ol className="job-detail-steps">
                {view.selection.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </Section>
          ) : null}
          {view.howApply?.length > 0 ? (
            <Section title={t("jobDetail.howToApply")}>
              <ol className="job-detail-steps">
                {view.howApply.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </Section>
          ) : null}
          {Array.isArray(view.documentsRequired) && view.documentsRequired.length > 0 ? (
            <Section title={t("jobDetail.documentsRequired", { defaultValue: "Documents required" })}>
              <ul className="job-detail-bullets">
                {view.documentsRequired.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </Section>
          ) : null}
        </>
      )}

      {extraDetails.length > 0 ? (
        <Section title={t("jobDetail.additionalInfo", { defaultValue: "Additional information" })}>
          <ExtraDetailsGrid items={extraDetails} />
        </Section>
      ) : null}

      <JobDetailFaq
        job={job}
        postName={postName}
        lastDate={displayValue(view.lastDate, "—")}
        qualification={displayValue(view.qual, "—")}
        vacancies={view.vacancies}
      />

      {job?.id && job?.slug ? (
        <JobComments jobId={String(job.id)} jobSlug={String(job.slug)} />
      ) : null}

      {job ? (
        <RelatedJobs
          jobs={relatedJobs}
          onSelect={onRelatedJobClick ?? (() => {})}
          sourceJob={job}
        />
      ) : null}

      <div className="job-detail-disclaimer">⚠️ {t("jobDetail.disclaimer")}</div>

      <JobDetailActions
        actions={detailActions}
        emptyLabel={t("jobDetail.noOfficialLink", {
          defaultValue: "No official link available for this listing.",
        })}
      />
    </>
  );

  const detailBody = (
    <>
      <div ref={panelRef} className="job-detail-scroll" tabIndex={-1}>
        <div className="job-detail-toolbar">
          <button type="button" onClick={onClose} className="job-detail-back-btn">
            {t("jobDetail.back")}
          </button>
          {applyMode ? <span className="job-detail-toolbar-chip">{applyMode}</span> : null}
          {primaryAction ? (
            <a
              href={primaryAction.url}
              target="_blank"
              rel="noopener noreferrer"
              className="job-detail-toolbar-apply"
              data-testid="official-apply-link"
            >
              {primaryAction.label}
            </a>
          ) : null}
        </div>

        <header className={`job-detail-hero job-detail-hero--premium${isPageLayout ? " job-detail-hero--page" : ""}`}>
          <div className="job-detail-hero__accent" aria-hidden />
          <div className="job-detail-hero__glow" aria-hidden />
          <div className="job-detail-hero__shimmer" aria-hidden />
          <div className="job-detail-hero__inner">
            <div className="job-detail-hero__top">
              <div className="job-detail-badges">
                <span
                  className="job-detail-badge"
                  style={{ color: catColor, borderColor: `${catColor}40`, background: `${catColor}18` }}
                >
                  {t(`category.${view.category}`).toUpperCase()}
                </span>
                {view.state ? (
                  <span className="job-detail-badge job-detail-badge-muted">{view.state}</span>
                ) : null}
                {view.vacancies > 0 ? (
                  <span className="job-detail-badge job-detail-badge-vacancy">
                    {view.vacancies.toLocaleString(countLocale)} {t("job.posts")}
                  </span>
                ) : null}
                {isUrgent ? (
                  <span className="job-detail-badge job-detail-badge-urgent">
                    ⚠️ {t("jobDetail.closingIn", { count: daysLeft })}
                  </span>
                ) : null}
              </div>

              {view.vacancies > 0 ? (
                <div className="job-detail-hero__vacancy-pill" aria-hidden>
                  <span className="job-detail-hero__vacancy-num">
                    {view.vacancies.toLocaleString(countLocale)}
                  </span>
                  <span className="job-detail-hero__vacancy-label">{t("job.posts")}</span>
                </div>
              ) : null}
            </div>

            <h1 className="job-detail-title">{view.title}</h1>
            {postName && !view.title.toLowerCase().includes(postName.toLowerCase()) ? (
              <p className="job-detail-post-name">{postName}</p>
            ) : null}
            {view.dept ? <p className="job-detail-dept">{view.dept}</p> : null}
          </div>
        </header>

        <JobDetailKeyFactsPanel
          dept={view.dept || ""}
          facts={glanceFacts}
          lastDate={displayValue(view.lastDate, "—")}
          daysLeft={daysLeft}
          isUrgent={isUrgent}
          primaryAction={primaryAction}
          t={t}
        />

        {isPageLayout ? mainContent : (
          <>
            {glancePanel}
            {mainContent}
          </>
        )}
      </div>
      <JobDetailStickyBar
        primaryAction={primaryAction}
        shareTitle={view.title}
        shareUrl={shareUrl}
        t={t}
      />
    </>
  );

  if (layout === "page") {
    return (
      <article className="job-detail-page job-detail-page--premium" aria-label={view.title}>
        <div className="job-detail-page__shell">{detailBody}</div>
      </article>
    );
  }

  return (
    <div
      className="job-detail-overlay"
      style={{ background: DS.overlayScrim }}
      role="dialog"
      aria-modal="true"
      aria-label={view.title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="job-detail-shell" onClick={(e) => e.stopPropagation()}>
        {detailBody}
      </div>
    </div>
  );
}
