import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import BrowseScrollRow from "@/components/layout/BrowseScrollRow";
import { STATES, toSvgStateId } from "@/data/states";
import { prefetchStateSvg } from "@/utils/mapUtils";
import stateColors from "@/data/stateColors";
import { useStateLabel } from "@/utils/stateLabels";

type StateGridProps = {
  selected: string | null
  onSelect: (stateId: string | null) => void
  onAllIndiaBrowse?: () => void
  stateCounts?: Record<string, number>
  loading?: boolean
}

function stateBadgeColor(stateId: string): string {
  return stateColors[toSvgStateId(stateId)] ?? "#94A3B8";
}

export default function StateGrid({ selected, onSelect, onAllIndiaBrowse, stateCounts, loading = false }: StateGridProps) {
  const { t } = useTranslation();
  const stateLabel = useStateLabel();

  const sorted = [...STATES]
    .filter((state) => (stateCounts?.[state.id] || 0) > 0 || selected === state.id)
    .sort((a, b) => (stateCounts?.[b.id] || 0) - (stateCounts?.[a.id] || 0));

  return (
    <div className="state-grid">
      <div className="state-grid__header">
        <div>
          <h2 className="state-grid__title">{t("stateGrid.title")}</h2>
          <p className="state-grid__subtitle">
            {t("stateGrid.subtitle", { defaultValue: "Pick a state to narrow the live listings." })}
          </p>
        </div>
        {selected && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="state-grid__clear"
          >
            {t("stateGrid.clearFilter")}
          </button>
        )}
      </div>
      <BrowseScrollRow
        className="state-grid__cards"
        ariaLabel={t("stateGrid.title")}
        aria-busy={loading || undefined}
      >
        <button
          type="button"
          className={`state-grid-card state-grid-card--all${!selected ? " state-grid-card--active" : ""}`}
          onClick={() => (onAllIndiaBrowse ? onAllIndiaBrowse() : onSelect(null))}
        >
          <span className="state-grid-card__icon">🇮🇳</span>
          <span className="state-grid-card__body">
            <span className="state-grid-card__name">{t("stateStrip.allIndia")}</span>
          </span>
        </button>
        {sorted.map((s) => {
          const active = selected === s.id;
          const cnt = Number(stateCounts?.[s.id]) || 0;
          return (
            <button
              key={s.id}
              type="button"
              className={`state-grid-card${active ? " state-grid-card--active" : ""}${loading ? " state-grid-card--loading" : ""}`}
              onClick={() => onSelect(s.id)}
              onMouseEnter={() => prefetchStateSvg(toSvgStateId(s.id))}
              onFocus={() => prefetchStateSvg(toSvgStateId(s.id))}
              style={{ "--state-color": stateBadgeColor(s.id) } as CSSProperties}
              title={stateLabel(s.id)}
              aria-label={stateLabel(s.id)}
            >
              <span className="state-grid-card__icon">{s.ab}</span>
              <span className="state-grid-card__body">
                <span className="state-grid-card__name">{stateLabel(s.id)}</span>
                <span className={`state-grid-card__meta${loading ? " state-grid-card__meta--pending" : ""}`}>
                  {loading
                    ? "\u00a0"
                    : t("stateGrid.liveCount", { count: cnt, defaultValue: "{{count}} live" })}
                </span>
              </span>
              <span className="state-grid-card__count" aria-hidden={loading}>
                {loading ? "—" : cnt.toLocaleString()}
              </span>
            </button>
          );
        })}
      </BrowseScrollRow>
    </div>
  );
}
