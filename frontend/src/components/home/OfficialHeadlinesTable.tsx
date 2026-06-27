import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { OfficialHeadlineRow } from "@/lib/officialFeed";
import {
  sortHeadlineRows,
  type HeadlineTableSortKey,
} from "@/utils/officialFilters";
import { dateTimeLocale } from "@/utils/formatLocale";
import HeadlineStatusBadge from "@/components/home/HeadlineStatusBadge";

type OfficialHeadlinesTableProps = {
  rows: OfficialHeadlineRow[];
  sort?: HeadlineTableSortKey;
  onSortChange?: (sort: HeadlineTableSortKey) => void;
  compact?: boolean;
};

function formatPostDate(value: string | null, locale: string) {
  if (!value) return "—";
  const d = new Date(value);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleDateString(dateTimeLocale(locale), {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  return value;
}

export default function OfficialHeadlinesTable({
  rows,
  sort = "newest",
  onSortChange,
  compact = false,
}: OfficialHeadlinesTableProps) {
  const { t, i18n } = useTranslation();
  const locale = dateTimeLocale(i18n.language);

  const sortedRows = useMemo(() => sortHeadlineRows(rows, sort), [rows, sort]);

  return (
    <div className={`official-headlines__table-wrap${compact ? " official-headlines__table-wrap--hub" : ""}`}>
      {onSortChange ? (
        <div className="official-headlines__toolbar">
          <span className="official-headlines__sort-label">
            {t("headlines.sortBy", { defaultValue: "Sort by" })}
          </span>
          <div
            className="official-headlines__sort-toggle"
            role="group"
            aria-label={t("headlines.sortBy", { defaultValue: "Sort by" })}
          >
            {(["newest", "board"] as const).map((key) => (
              <button
                key={key}
                type="button"
                className={`official-headlines__sort-btn${
                  sort === key ? " official-headlines__sort-btn--active" : ""
                }`}
                aria-pressed={sort === key}
                onClick={() => onSortChange(key)}
              >
                {key === "newest"
                  ? t("headlines.sortNewest", { defaultValue: "Newest" })
                  : t("headlines.sortBoard", { defaultValue: "Board" })}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="latest-notif__wrap">
        <table className="latest-notif__table latest-notif__table--simple official-headlines__table">
          <thead>
            <tr>
              <th>{t("headlines.colPostDate", { defaultValue: "Post Date" })}</th>
              <th>{t("headlines.colBoard", { defaultValue: "Board" })}</th>
              <th>{t("headlines.colTitle", { defaultValue: "Title" })}</th>
              <th>{t("headlines.colTopic", { defaultValue: "Topic" })}</th>
              <th>{t("headlines.colLink", { defaultValue: "Link" })}</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => (
              <tr key={row.id} className="official-headlines__row">
                <td className="official-headlines__date">
                  {formatPostDate(row.postDate, locale)}
                </td>
                <td className="official-headlines__board">{row.board}</td>
                <td className="official-headlines__title-cell">
                  <span className="official-headlines__title-text">{row.title}</span>
                  <HeadlineStatusBadge badge={row.statusBadge} />
                </td>
                <td className="official-headlines__topic">{row.topicLabel}</td>
                <td>
                  <a
                    href={row.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="official-headlines__table-link"
                  >
                    {t("headlines.openLink", { defaultValue: "Open" })} ↗
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
