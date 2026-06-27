import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CATS, RESULTS_HUB_BOARD_CAT_IDS, type CategoryId } from "@/data/categories";
import { STATES } from "@/data/states";
import { asOfficialFeedItems } from "@/lib/officialFeed";
import { useOfficialArchive } from "@/hooks/useOfficialArchive";
import { useOfficialFeed } from "@/hooks/useOfficialFeed";
import { getArchiveFileForTopic } from "@/data/resultTopics";
import { filterOfficialItems } from "@/utils/officialFilters";
import { numberLocale } from "@/utils/formatLocale";

type ResultsHubFiltersProps = {
  topicKey: string | null;
  stateId: string | null;
  categoryId: CategoryId | null;
  onStateSelect: (stateId: string | null) => void;
  onCategorySelect: (categoryId: CategoryId | null) => void;
};

export default function ResultsHubFilters({
  topicKey,
  stateId,
  categoryId,
  onStateSelect,
  onCategorySelect,
}: ResultsHubFiltersProps) {
  const { t, i18n } = useTranslation();
  const locale = numberLocale(i18n.language);
  const { items: feedItems } = useOfficialFeed();
  const archiveTopic = getArchiveFileForTopic(topicKey);
  const archive = useOfficialArchive(archiveTopic);

  const topicItems = useMemo(() => {
    const feedRows = asOfficialFeedItems(feedItems);
    const archiveRows = asOfficialFeedItems(archive.items);
    const seen = new Set<string>();
    const out = [];
    for (const row of [...archiveRows, ...feedRows]) {
      const link = row.link || row.id;
      if (!link || seen.has(link)) continue;
      seen.add(link);
      out.push(row);
    }
    return filterOfficialItems(out, { topicKey }) as typeof feedRows;
  }, [archive.items, feedItems, topicKey]);

  const stateCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const st of STATES) {
      counts[st.id] = filterOfficialItems(topicItems, { stateId: st.id, topicKey }).length;
    }
    return counts;
  }, [topicItems, topicKey]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const catId of RESULTS_HUB_BOARD_CAT_IDS) {
      counts[catId] = filterOfficialItems(topicItems, { categoryId: catId, topicKey }).length;
    }
    return counts;
  }, [topicItems, topicKey]);

  const total = topicItems.length;

  return (
    <div className="results-hub-filters" aria-label={t("results.filtersLabel")}>
      <div className="results-hub-filters__group">
        <span className="results-hub-filters__label">
          {t("results.filterByState")}
        </span>
        <div className="results-hub-filters__pills" role="tablist" aria-label={t("results.filterByState")}>
          <button
            type="button"
            role="tab"
            aria-selected={!stateId}
            className={`results-hub-filters__pill${!stateId ? " results-hub-filters__pill--active" : ""}`}
            onClick={() => onStateSelect(null)}
          >
            {t("latestNotif.allStates", { defaultValue: "All" })}
            <span className="results-hub-filters__pill-count">({total.toLocaleString(locale)})</span>
          </button>
          {STATES.map((st) => {
            const cnt = stateCounts[st.id] ?? 0;
            const active = stateId === st.id;
            return (
              <button
                key={st.id}
                type="button"
                role="tab"
                aria-selected={active}
                title={st.n}
                className={`results-hub-filters__pill${active ? " results-hub-filters__pill--active" : ""}${cnt === 0 ? " results-hub-filters__pill--empty" : ""}`}
                onClick={() => onStateSelect(active ? null : st.id)}
              >
                {st.ab}
                <span className="results-hub-filters__pill-count">({cnt.toLocaleString(locale)})</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="results-hub-filters__group">
        <span className="results-hub-filters__label">
          {t("results.filterByBoard")}
        </span>
        <div className="results-hub-filters__pills" role="tablist" aria-label={t("results.filterByBoard")}>
          <button
            type="button"
            role="tab"
            aria-selected={!categoryId}
            className={`results-hub-filters__pill results-hub-filters__pill--board${!categoryId ? " results-hub-filters__pill--active" : ""}`}
            onClick={() => onCategorySelect(null)}
          >
            {t("latestNotif.allStates", { defaultValue: "All" })}
          </button>
          {RESULTS_HUB_BOARD_CAT_IDS.map((catId) => {
            const cat = CATS.find((c) => c.id === catId);
            if (!cat) return null;
            const cnt = categoryCounts[catId] ?? 0;
            const active = categoryId === catId;
            return (
              <button
                key={catId}
                type="button"
                role="tab"
                aria-selected={active}
                className={`results-hub-filters__pill results-hub-filters__pill--board${active ? " results-hub-filters__pill--active" : ""}${cnt === 0 ? " results-hub-filters__pill--empty" : ""}`}
                onClick={() => onCategorySelect(active ? null : catId)}
              >
                <span aria-hidden>{cat.icon}</span> {cat.name}
                <span className="results-hub-filters__pill-count">({cnt.toLocaleString(locale)})</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
