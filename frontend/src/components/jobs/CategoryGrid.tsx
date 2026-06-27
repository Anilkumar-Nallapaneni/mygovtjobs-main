import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import BrowseScrollRow from "@/components/layout/BrowseScrollRow";
import { CATS, type CategoryId } from "@/data/categories";

type CategoryGridProps = {
  activeCat: CategoryId | null
  onSelectCategory: (categoryId: CategoryId | null) => void
  counts?: Partial<Record<CategoryId, number>>
  loading?: boolean
}

export default function CategoryGrid({ activeCat, onSelectCategory, counts, loading = false }: CategoryGridProps) {
  const { t } = useTranslation();

  return (
    <div className="category-grid">
      <div className="category-grid__header">
        <div>
          <h2 className="category-grid__title">{t("categoryGrid.title")}</h2>
          <p className="category-grid__subtitle">
            {t("categoryGrid.subtitle", { defaultValue: "Pick a sector to narrow the live listings." })}
          </p>
        </div>
        {activeCat && (
          <button
            type="button"
            onClick={() => onSelectCategory(null)}
            className="category-grid__clear"
          >
            {t("categoryGrid.clearFilter")}
          </button>
        )}
      </div>
      <BrowseScrollRow
        className="category-grid__cards"
        ariaLabel={t("categoryGrid.title")}
        aria-busy={loading || undefined}
      >
        {CATS.map((c) => {
          const active = activeCat === c.id;
          const cnt = Number(counts?.[c.id]) || 0;
          const showCount = !loading;
          return (
            <button
              key={c.id}
              type="button"
              className={`category-grid-card${active ? " category-grid-card--active" : ""}${loading ? " category-grid-card--loading" : ""}`}
              onClick={() => onSelectCategory(c.id)}
              style={{ "--cat-color": c.color } as CSSProperties}
            >
              <span className="category-grid-card__icon">{c.icon}</span>
              <span className="category-grid-card__body">
                <span className="category-grid-card__name">{t(`category.${c.id}`)}</span>
                <span className={`category-grid-card__meta${loading ? " category-grid-card__meta--pending" : ""}`}>
                  {loading
                    ? "\u00a0"
                    : t("categoryGrid.liveCount", { count: cnt, defaultValue: "{{count}} live" })}
                </span>
              </span>
              <span className="category-grid-card__count" aria-hidden={loading}>
                {showCount ? cnt.toLocaleString() : "—"}
              </span>
            </button>
          );
        })}
      </BrowseScrollRow>
    </div>
  );
}
