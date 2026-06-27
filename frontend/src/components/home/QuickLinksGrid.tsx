import { useTranslation } from "react-i18next";
import type { OfficialHeadlineRow } from "@/lib/officialFeed";
import HeadlineStatusBadge from "@/components/home/HeadlineStatusBadge";

const GRID_SIZE = 9;

type QuickLinksGridProps = {
  rows: OfficialHeadlineRow[];
  ariaLabel?: string;
};

export default function QuickLinksGrid({ rows, ariaLabel }: QuickLinksGridProps) {
  const { t } = useTranslation();
  const links = rows.slice(0, GRID_SIZE);

  if (!links.length) return null;

  return (
    <nav
      className="quick-links-grid"
      aria-label={ariaLabel || t("headlines.quickLinksAria", { defaultValue: "Quick links" })}
    >
      <h3 className="quick-links-grid__title">
        {t("headlines.quickLinksTitle", { defaultValue: "Quick links" })}
      </h3>
      <div className="quick-links-grid__cells">
        {links.map((row) => (
          <a
            key={row.id}
            href={row.link}
            target="_blank"
            rel="noopener noreferrer"
            className="quick-links-grid__cell"
            title={row.title}
          >
            <span className="quick-links-grid__board">{row.board}</span>
            <span className="quick-links-grid__label">
              {row.title}
              <HeadlineStatusBadge badge={row.statusBadge} />
            </span>
          </a>
        ))}
      </div>
    </nav>
  );
}
