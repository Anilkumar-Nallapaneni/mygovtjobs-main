import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getArchiveFileForTopic } from "@/data/resultTopics";
import { useOfficialArchive } from "@/hooks/useOfficialArchive";
import { useOfficialFeed } from "@/hooks/useOfficialFeed";
import { asOfficialFeedItems, type OfficialFeedItem } from "@/lib/officialFeed";
import {
  filterOfficialItems,
  describeActiveFilters,
  toHeadlineRows,
  parseHeadlineStatus,
  type HeadlineTableSortKey,
} from "@/utils/officialFilters";
import { sitesForStateAndCategory } from "@/data/officialSites";
import { dateTimeLocale } from "@/utils/formatLocale";
import OfficialHeadlinesTable from "@/components/home/OfficialHeadlinesTable";
import QuickLinksGrid from "@/components/home/QuickLinksGrid";
import HeadlineStatusBadge from "@/components/home/HeadlineStatusBadge";

import type { HeadlinesViewMode } from "@/lib/officialFeed";

type OfficialHeadlinesSectionProps = {
  stateId?: string | null;
  categoryId?: string | null;
  topicKey?: string | null;
  search?: string;
  onClearTopic?: () => void;
  resultsHubMode?: boolean;
  viewMode?: HeadlinesViewMode;
  onViewModeChange?: (mode: HeadlinesViewMode) => void;
};

const QUICK_LINK_TOPICS = new Set(["admit-card", "sarkari-result"]);

export default function OfficialHeadlinesSection({
  stateId = null,
  categoryId = null,
  topicKey = null,
  search = "",
  onClearTopic,
  resultsHubMode = false,
  viewMode: controlledViewMode,
  onViewModeChange,
}: OfficialHeadlinesSectionProps) {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { items, generatedAt, error } = useOfficialFeed();
  const [internalViewMode, setInternalViewMode] = useState<HeadlinesViewMode>("feed");
  const [tableSort, setTableSort] = useState<HeadlineTableSortKey>("newest");

  const viewMode = controlledViewMode ?? internalViewMode;
  const setViewMode = (mode: HeadlinesViewMode) => {
    onViewModeChange?.(mode);
    if (controlledViewMode === undefined) setInternalViewMode(mode);
  };

  const archiveTopic = useMemo(() => {
    if (topicKey) {
      return getArchiveFileForTopic(topicKey);
    }
    if (location.pathname === "/results/admit-card") return "admit-cards";
    if (location.pathname === "/results" || location.pathname.startsWith("/results/")) return "results";
    return null;
  }, [location.pathname, topicKey]);

  const archive = useOfficialArchive(archiveTopic);

  const mergedItems = useMemo(() => {
    const feedRows = asOfficialFeedItems(items);
    if (!archive.items.length) return feedRows;
    const seen = new Set<string>();
    const out: OfficialFeedItem[] = [];
    for (const row of [...asOfficialFeedItems(archive.items), ...feedRows]) {
      const link = row.link || row.id;
      if (!link || seen.has(link)) continue;
      seen.add(link);
      out.push(row);
    }
    return out;
  }, [archive.items, items]);

  const filtered = useMemo(
    () => filterOfficialItems(mergedItems, { stateId, categoryId, topicKey, search }) as OfficialFeedItem[],
    [mergedItems, stateId, categoryId, topicKey, search]
  );

  const headlineRows = useMemo(
    () => toHeadlineRows(filtered, topicKey),
    [filtered, topicKey]
  );

  const showQuickLinks = resultsHubMode && topicKey && QUICK_LINK_TOPICS.has(topicKey);
  const showViewToggle = resultsHubMode;
  const hubSectionClass = resultsHubMode ? " official-headlines--hub" : "";

  const fallbackSites = useMemo(
    () => sitesForStateAndCategory(stateId, categoryId),
    [stateId, categoryId]
  );

  const activeLabel = describeActiveFilters({ stateId, categoryId, topicKey, search });

  if (error && items.length === 0) {
    return (
      <section id="official-headlines" className="official-headlines official-headlines--compact" aria-label="Official headlines">
        <div className="official-headlines__muted">{t("headlines.feedError", { error })}</div>
        <OfficialPortalGrid sites={fallbackSites} t={t} />
      </section>
    );
  }

  if (items.length === 0 && !generatedAt && !error) {
    return (
      <section id="official-headlines" className="official-headlines official-headlines--compact" aria-label="Official headlines">
        <div className="official-headlines__muted">{t("headlines.loading")}</div>
      </section>
    );
  }

  const showFallback = filtered.length === 0;

  return (
    <section id="official-headlines" className={`official-headlines${hubSectionClass}`} aria-label="Official headlines">
      <div className="official-headlines__head">
        <div>
          {!resultsHubMode ? (
            <>
              <h2 className="official-headlines__title">{t("headlines.wireTitle")}</h2>
              <p className="official-headlines__desc">
                {t("headlines.wireDesc")}
                {activeLabel ? (
                  <>
                    {" "}
                    {t("headlines.filteredBy")}{" "}
                    <strong className="official-headlines__filter-strong">{activeLabel}</strong>.
                  </>
                ) : null}
              </p>
            </>
          ) : (
            <p className="official-headlines__hub-meta">
              {t("headlines.hubCount", {
                count: headlineRows.length,
                defaultValue: "{{count}} official links",
              })}
              {activeLabel ? (
                <>
                  {" · "}
                  <strong className="official-headlines__filter-strong">{activeLabel}</strong>
                </>
              ) : null}
            </p>
          )}
        </div>
        <div className="official-headlines__actions">
          {showViewToggle ? (
            <div
              className="official-headlines__view-toggle"
              role="group"
              aria-label={t("headlines.viewMode", { defaultValue: "View mode" })}
            >
              <button
                type="button"
                className={`official-headlines__view-btn${
                  viewMode === "feed" ? " official-headlines__view-btn--active" : ""
                }`}
                aria-pressed={viewMode === "feed"}
                onClick={() => setViewMode("feed")}
              >
                {t("headlines.viewFeed", { defaultValue: "Feed" })}
              </button>
              <button
                type="button"
                className={`official-headlines__view-btn${
                  viewMode === "table" ? " official-headlines__view-btn--active" : ""
                }`}
                aria-pressed={viewMode === "table"}
                onClick={() => setViewMode("table")}
              >
                {t("headlines.viewTable", { defaultValue: "Table" })}
              </button>
            </div>
          ) : null}
          {topicKey && typeof onClearTopic === "function" && (
            <button type="button" onClick={onClearTopic} className="official-headlines__clear-btn">
              {t("headlines.clearTopic")}
            </button>
          )}
          {(archive.generatedAt || generatedAt) && (
            <span className="official-headlines__snapshot">
              {t("headlines.snapshot")}{" "}
              {new Date(archive.generatedAt || generatedAt).toLocaleString(
                dateTimeLocale(i18n.language),
                { dateStyle: "medium", timeStyle: "short" }
              )}
              {archiveTopic ? ` · ${t("headlines.archive", { defaultValue: "archive" })}` : ""}
            </span>
          )}
        </div>
      </div>

      {showQuickLinks && headlineRows.length > 0 ? (
        <QuickLinksGrid rows={headlineRows} />
      ) : null}

      {showFallback ? (
        <>
          <div className="official-headlines__notice">
            {t("headlines.noSnapshot", { label: activeLabel ? ` (${activeLabel})` : "" })}
          </div>
          <OfficialPortalGrid sites={fallbackSites} t={t} />
        </>
      ) : viewMode === "table" ? (
        <OfficialHeadlinesTable
          rows={headlineRows}
          sort={tableSort}
          onSortChange={setTableSort}
          compact={resultsHubMode}
        />
      ) : (
        <FeedList items={filtered} t={t} hub={resultsHubMode} />
      )}
    </section>
  );
}

function FeedList({
  items,
  t,
  hub = false,
}: {
  items: OfficialFeedItem[];
  t: (key: string, opts?: Record<string, unknown>) => string;
  hub?: boolean;
}) {
  return (
    <div className={`official-headlines__feed${hub ? " official-headlines__feed--hub" : ""}`}>
      {items.map((it) => {
        const statusBadge = parseHeadlineStatus(it.title || "");
        return (
          <article key={it.id} className="official-headlines__article">
            <div className="official-headlines__source">
              <span>{it.sourceName || it.sourceId}</span>
              {it.state && it.state !== "All India" && (
                <span className="official-headlines__state">· {it.state}</span>
              )}
            </div>
            <a href={it.link} target="_blank" rel="noopener noreferrer" className="official-headlines__link">
              {it.title}
              <HeadlineStatusBadge badge={statusBadge} />
              <span className="official-headlines__link-arrow"> ↗</span>
            </a>
            {it.pdfUrls?.length > 0 && (
              <div className="official-headlines__pdfs">
                {it.pdfUrls.map((pdf, pi) => {
                  let label = t("headlines.pdf");
                  try {
                    const seg = decodeURIComponent(pdf.split("/").pop() || "");
                    if (seg && seg.length < 42) label = seg;
                  } catch {
                    /* ignore */
                  }
                  return (
                    <a
                      key={pdf}
                      href={pdf}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={pdf}
                      className="official-headlines__pdf"
                    >
                      {it.pdfUrls!.length > 1 ? `${label} (${pi + 1})` : `${label}`} ↗
                    </a>
                  );
                })}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

function OfficialPortalGrid({
  sites,
  t,
}: {
  sites: ReturnType<typeof sitesForStateAndCategory>;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  if (!sites.length) {
    return <div className="official-headlines__notice">{t("headlines.noPortals")}</div>;
  }

  return (
    <div className="official-headlines__portal-grid">
      {sites.map((s) => (
        <a
          key={s.id}
          href={s.latestUrl || s.url}
          target="_blank"
          rel="noopener noreferrer"
          className="official-headlines__portal-card"
        >
          <span className="official-headlines__portal-scope">{s.scope}</span>
          <span className="official-headlines__portal-name">
            {s.name} <span className="official-headlines__link-arrow">↗</span>
          </span>
          <span className="official-headlines__portal-host">{hostFromUrl(s.latestUrl || s.url)}</span>
        </a>
      ))}
    </div>
  );
}

function hostFromUrl(u: string) {
  try {
    return new URL(u).host;
  } catch {
    return u;
  }
}
