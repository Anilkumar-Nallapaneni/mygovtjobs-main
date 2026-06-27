import { useCallback, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { trackHomepageRowClick } from "@/lib/analytics";
import BrowseScrollRow from "@/components/layout/BrowseScrollRow";
import ExamLifecycleTimeline, {
  LIFECYCLE_STEPS,
  type LifecycleStepId,
} from "@/components/home/ExamLifecycleTimeline";
import HeadlineStatusBadge from "@/components/home/HeadlineStatusBadge";
import { useOfficialArchivesBatch, type OfficialArchiveItem } from "@/hooks/useOfficialArchivesBatch";
import { useOfficialFeed } from "@/hooks/useOfficialFeed";
import type { HeadlineStatusBadge as StatusBadge } from "@/lib/officialFeed";
import {
  buildLatestNotificationsData,
  sortNotificationRows,
  type NotificationRow,
} from "@/utils/latestNotificationsTable";
import { filterOfficialItems, parseHeadlineStatus } from "@/utils/officialFilters";
import { LATEST_NOTIFICATIONS_PATH, RESULTS_TOPICS_INDEX_PATH } from "@/utils/browseRoutes";
import { jobDetailPath } from "@/utils/jobRoutes";
import type { JobRecord } from "@/types/job";

const ROW_LIMIT = 12;
const FEED_TAB_LIMIT = 16;

const LATEST_TAB = {
  id: "latest",
  tabTitleKey: "home.examRows.tabLatest",
  tabTitleDefault: "Latest",
  panelTitleKey: "sidebar.latestJobs",
  panelTitleDefault: "Latest Job Notifications",
  viewAllPath: LATEST_NOTIFICATIONS_PATH,
  trackId: "latest-notifications",
} as const;

const FEED_ROWS = [
  {
    id: "admit-card",
    topicKey: "admit-card",
    archiveTopic: "admit-cards",
    tabTitleKey: "sidebar.admitCard",
    tabTitleDefault: "Admit Card",
    panelTitleKey: "sidebar.admitCard",
    panelTitleDefault: "Admit Cards",
    viewAllPath: "/results/admit-card",
    trackId: "admit-card",
  },
  {
    id: "sarkari-result",
    topicKey: "sarkari-result",
    archiveTopic: "results",
    tabTitleKey: "sidebar.sarkariResult",
    tabTitleDefault: "Government Result",
    panelTitleKey: "sidebar.sarkariResult",
    panelTitleDefault: "Government Results",
    viewAllPath: "/results",
    trackId: "sarkari-result",
  },
  {
    id: "answer-key",
    topicKey: "answer-key",
    archiveTopic: "answer-keys",
    tabTitleKey: "sidebar.answerKey",
    tabTitleDefault: "Answer Key",
    panelTitleKey: "sidebar.answerKey",
    panelTitleDefault: "Answer Keys",
    viewAllPath: "/results/answer-key",
    trackId: "answer-key",
  },
  {
    id: "syllabus",
    topicKey: "syllabus",
    archiveTopic: "syllabus",
    tabTitleKey: "sidebar.syllabus",
    tabTitleDefault: "Syllabus",
    panelTitleKey: "sidebar.syllabus",
    panelTitleDefault: "Syllabus",
    viewAllPath: "/results/syllabus",
    trackId: "syllabus",
  },
] as const;

type FeedRowId = (typeof FEED_ROWS)[number]["id"];
type TabId = typeof LATEST_TAB.id | FeedRowId;

type DiscoveryChip = {
  key: string;
  title: string;
  meta?: string;
  href: string;
  external: boolean;
  onActivate?: () => void;
  statusBadge?: StatusBadge;
  vacancies?: number;
  lastDate?: string | null;
  qualification?: string | null;
  stateName?: string | null;
  topic?: string;
};

function formatChipDeadline(value: string | null | undefined): string | null {
  if (!value || value === "—") return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

type HomeExamUpdatesRowProps = {
  jobs?: JobRecord[];
  jobsLoading?: boolean;
  onJobClick?: (job: JobRecord) => void;
};

function isOfficialGovLink(href: string): boolean {
  try {
    const host = new URL(href).hostname.toLowerCase();
    return host.endsWith(".gov.in") || host.endsWith(".nic.in") || host.endsWith(".gov");
  } catch {
    return false;
  }
}

function mergeFeedItems(archiveItems: OfficialArchiveItem[], feedItems: unknown[]) {
  const seen = new Set<string>();
  const out: OfficialArchiveItem[] = [];

  for (const row of [...archiveItems, ...feedItems]) {
    const item = row as OfficialArchiveItem;
    const link = item.link || item.id;
    if (!link || seen.has(link)) continue;
    seen.add(link);
    out.push(item);
  }

  return out;
}

function feedItemsToChips(items: OfficialArchiveItem[], limit: number, topic: string): DiscoveryChip[] {
  return items.slice(0, limit).map((item) => ({
    key: item.id || item.link || item.title || "item",
    title: String(item.title || "Official update").trim(),
    meta: item.sourceName || item.dept || undefined,
    href: String(item.link || "#"),
    external: true,
    statusBadge: parseHeadlineStatus(String(item.title || "")),
    topic,
  }));
}

function notificationToChip(
  row: NotificationRow,
  onJobClick?: (job: JobRecord) => void
): DiscoveryChip {
  const internal = row._job ? jobDetailPath(row._job) : null;
  const externalUrl = row.detailUrl || null;
  return {
    key: String(row.id),
    title: row.postName,
    meta: row.board,
    href: internal || externalUrl || "#",
    external: !internal && Boolean(externalUrl),
    onActivate:
      !internal && !externalUrl && row._job
        ? () => onJobClick?.(row._job as JobRecord)
        : undefined,
    vacancies: row.vacancies > 0 ? row.vacancies : undefined,
    lastDate: row.lastDate,
    qualification: row.qualification ? String(row.qualification) : null,
    stateName:
      row.stateName && String(row.stateName) !== "All India" ? String(row.stateName) : null,
    topic: "latest",
  };
}

function DiscoveryChipLink({
  chip,
  rowType,
  featured = false,
}: {
  chip: DiscoveryChip;
  rowType?: string;
  featured?: boolean;
}) {
  const { t } = useTranslation();
  const topicClass = chip.topic ? ` home-discovery-chip--topic-${chip.topic}` : "";
  const className = `home-discovery-chip${topicClass}${featured ? " home-discovery-chip--featured" : ""}`;
  const isLatest = chip.topic === "latest";
  const deadline = formatChipDeadline(chip.lastDate);
  const verified = chip.external && isOfficialGovLink(chip.href);

  const factParts: string[] = [];
  if (chip.stateName) factParts.push(chip.stateName);
  if (chip.qualification) factParts.push(chip.qualification);
  if (chip.vacancies) {
    factParts.push(
      t("home.examRows.chipVacancies", {
        count: chip.vacancies,
        defaultValue: "{{count}} posts",
      })
    );
  }

  const content = (
    <>
      {featured ? (
        <span className="home-discovery-chip__flag">
          {t("home.examRows.featuredLatest", { defaultValue: "Featured" })}
        </span>
      ) : null}
      <span className="home-discovery-chip__title">{chip.title}</span>
      {isLatest ? (
        <>
          {chip.meta ? <span className="home-discovery-chip__meta">{chip.meta}</span> : null}
          {factParts.length ? (
            <span className="home-discovery-chip__facts">{factParts.join(" · ")}</span>
          ) : null}
          {deadline ? (
            <span className="home-discovery-chip__deadline">
              {t("home.examRows.chipDeadline", {
                date: deadline,
                defaultValue: "Apply by {{date}}",
              })}
            </span>
          ) : null}
        </>
      ) : (
        <span className="home-discovery-chip__footer">
          {chip.meta ? <span className="home-discovery-chip__meta">{chip.meta}</span> : null}
          {verified ? (
            <span className="home-discovery-chip__verified">
              {t("home.examRows.officialSource", { defaultValue: ".gov.in verified" })}
            </span>
          ) : null}
          {chip.statusBadge ? <HeadlineStatusBadge badge={chip.statusBadge} /> : null}
        </span>
      )}
    </>
  );

  const onTrack = () => {
    if (rowType) trackHomepageRowClick(rowType);
  };

  if (chip.external) {
    return (
      <a
        href={chip.href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        onClick={onTrack}
      >
        {content}
      </a>
    );
  }

  if (chip.onActivate) {
    return (
      <button
        type="button"
        className={className}
        onClick={() => {
          onTrack();
          chip.onActivate?.();
        }}
      >
        {content}
      </button>
    );
  }

  return (
    <Link to={chip.href} className={className} onClick={onTrack}>
      {content}
    </Link>
  );
}

function ExamUpdateTabs({
  activeTab,
  onTabChange,
  latestChips,
  latestEmptyLabel,
  feedRowChips,
  feedEmptyLabel,
  viewAllLabel,
}: {
  activeTab: TabId;
  onTabChange: (id: TabId) => void;
  latestChips: DiscoveryChip[];
  latestEmptyLabel: string;
  feedRowChips: Map<string, DiscoveryChip[]>;
  feedEmptyLabel: (archiveTopic: string) => string;
  viewAllLabel: string;
}) {
  const { t } = useTranslation();
  const isLatest = activeTab === "latest";
  const activeFeedRow = FEED_ROWS.find((row) => row.id === activeTab);

  const panelTitle = isLatest
    ? t(LATEST_TAB.panelTitleKey, { defaultValue: LATEST_TAB.panelTitleDefault })
    : t(activeFeedRow!.panelTitleKey, { defaultValue: activeFeedRow!.panelTitleDefault });

  const viewAllPath = isLatest ? LATEST_TAB.viewAllPath : activeFeedRow!.viewAllPath;
  const trackId = isLatest ? LATEST_TAB.trackId : activeFeedRow!.trackId;
  const feedChips = activeFeedRow ? (feedRowChips.get(activeFeedRow.id) ?? []) : [];

  return (
    <div id="home-exam-tabs" className="home-exam-tabs">
      <div
        className="home-exam-tabs__nav"
        role="tablist"
        aria-label={t("home.examRows.tabsAria", { defaultValue: "Exam update topics" })}
      >
        <button
          type="button"
          role="tab"
          id="home-exam-tab-latest"
          aria-selected={isLatest}
          aria-controls="home-exam-panel-latest"
          className={`home-exam-tabs__tab home-exam-tabs__tab--latest${
            isLatest ? " home-exam-tabs__tab--active" : ""
          }`}
          onClick={() => onTabChange("latest")}
        >
          {t(LATEST_TAB.tabTitleKey, { defaultValue: LATEST_TAB.tabTitleDefault })}
        </button>
        {FEED_ROWS.map((row) => (
          <button
            key={row.id}
            type="button"
            role="tab"
            id={`home-exam-tab-${row.id}`}
            aria-selected={activeTab === row.id}
            aria-controls={`home-exam-panel-${row.id}`}
            className={`home-exam-tabs__tab home-exam-tabs__tab--${row.id}${
              activeTab === row.id ? " home-exam-tabs__tab--active" : ""
            }`}
            onClick={() => onTabChange(row.id)}
          >
            {t(row.tabTitleKey, { defaultValue: row.tabTitleDefault })}
          </button>
        ))}
      </div>

      <div
        id={`home-exam-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`home-exam-tab-${activeTab}`}
        className={`home-exam-tabs__panel${isLatest ? " home-exam-tabs__panel--latest" : ""}`}
      >
        <header className="home-exam-tabs__panel-head">
          <h3 className="home-exam-tabs__panel-title">{panelTitle}</h3>
          <Link
            to={viewAllPath}
            className="home-exam-tabs__view-all"
            onClick={() => trackHomepageRowClick(`${trackId}:view-all`)}
          >
            {viewAllLabel}
          </Link>
        </header>

        {isLatest ? (
          latestChips.length ? (
            <BrowseScrollRow
              className="home-exam-tabs__track home-exam-tabs__track--latest"
              ariaLabel={t("home.examRows.latestAria", { defaultValue: "Latest notifications" })}
            >
              {latestChips.map((chip, index) => (
                <DiscoveryChipLink
                  key={chip.key}
                  chip={chip}
                  rowType="latest-notifications"
                  featured={index === 0}
                />
              ))}
            </BrowseScrollRow>
          ) : (
            <p className="home-exam-tabs__empty">{latestEmptyLabel}</p>
          )
        ) : feedChips.length ? (
          <BrowseScrollRow
            className="home-exam-tabs__track"
            ariaLabel={panelTitle}
          >
            {feedChips.map((chip) => (
              <DiscoveryChipLink key={chip.key} chip={chip} rowType={activeTab} />
            ))}
          </BrowseScrollRow>
        ) : (
          <p className="home-exam-tabs__empty">{feedEmptyLabel(activeFeedRow!.archiveTopic)}</p>
        )}
      </div>
    </div>
  );
}

export default function HomeExamUpdatesRow({
  jobs = [],
  jobsLoading = false,
  onJobClick,
}: HomeExamUpdatesRowProps) {
  const { t } = useTranslation();
  const tabsRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState<LifecycleStepId>("latest");
  const [activeTab, setActiveTab] = useState<TabId>("latest");

  const { items: feedItems, loading: feedLoading } = useOfficialFeed();
  const archives = useOfficialArchivesBatch(FEED_ROWS.map((row) => row.archiveTopic));

  const latestChips = useMemo(() => {
    const { items } = buildLatestNotificationsData(jobs);
    return sortNotificationRows(items, "newest")
      .slice(0, ROW_LIMIT)
      .map((row) => notificationToChip(row, onJobClick));
  }, [jobs, onJobClick]);

  const feedRowChips = useMemo(() => {
    const byId = new Map<string, DiscoveryChip[]>();

    for (const row of FEED_ROWS) {
      const archiveItems = archives[row.archiveTopic] ?? [];
      const merged = mergeFeedItems(archiveItems, feedItems);
      const filtered = filterOfficialItems(merged, { topicKey: row.topicKey });
      byId.set(row.id, feedItemsToChips(filtered as OfficialArchiveItem[], FEED_TAB_LIMIT, row.id));
    }

    return byId;
  }, [archives, feedItems]);

  const scrollToTabs = useCallback(() => {
    tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  const handleStepSelect = useCallback(
    (stepId: LifecycleStepId) => {
      setActiveStep(stepId);
      setActiveTab(stepId);
      scrollToTabs();
    },
    [scrollToTabs]
  );

  const handleTabChange = useCallback((tabId: TabId) => {
    setActiveTab(tabId);
    setActiveStep(tabId);
  }, []);

  const viewAllLabel = t("home.examRows.viewAll", { defaultValue: "View all →" });
  const loadingFeedLabel = t("home.examRows.emptyFeed", {
    defaultValue: "Official updates loading…",
  });
  const emptyTopicLabel = t("home.examRows.emptyTopic", {
    defaultValue: "No official updates in this topic yet.",
  });

  const feedEmptyLabel = (archiveTopic: string) => {
    const hasArchive = (archives[archiveTopic] ?? []).length > 0;
    if (feedLoading && !hasArchive) return loadingFeedLabel;
    return emptyTopicLabel;
  };

  const latestEmptyLabel =
    jobsLoading && !jobs.length
      ? t("latestNotif.loading", { defaultValue: "Loading latest notifications…" })
      : t("latestNotif.empty", { defaultValue: "No official listings yet." });

  return (
    <section
      className="home-exam-updates"
      aria-label={t("home.examRows.sectionAria", { defaultValue: "Exam updates" })}
    >
      <header className="home-exam-updates__head">
        <h2 className="home-exam-updates__title">
          {t("home.examRows.heading", { defaultValue: "Government exam lifecycle" })}
        </h2>
        <Link to={RESULTS_TOPICS_INDEX_PATH} className="home-exam-updates__topics-link">
          {t("results.allTopics", { defaultValue: "All exam updates" })}
        </Link>
      </header>

      <ExamLifecycleTimeline activeStep={activeStep} onStepSelect={handleStepSelect} />

      <div ref={tabsRef} className="home-exam-updates__body">
        <ExamUpdateTabs
          activeTab={activeTab}
          onTabChange={handleTabChange}
          latestChips={latestChips}
          latestEmptyLabel={latestEmptyLabel}
          feedRowChips={feedRowChips}
          feedEmptyLabel={feedEmptyLabel}
          viewAllLabel={viewAllLabel}
        />
      </div>
    </section>
  );
}

export { FEED_ROWS, LIFECYCLE_STEPS };
