import { useCallback, useEffect, useRef } from "react";
import { fromSvgStateId, toSvgStateId } from "@/data/states";
import { IndiaMap } from "@/components/Maps/IndiaMap/IndiaMap";
import StateGlancePanel from "@/components/home/StateGlancePanel";
import type { IndiaMapProps } from "@/types/MapTypes";

const STATE_MAP_SYNC_MQ = "(min-width: 1181px)";

type HomeMapBlockProps = {
  mapStateData: IndiaMapProps["stateData"];
  selectedState: string | null;
  stateName: string;
  onStateSelect: (stateId: string | null) => void;
  onClearState: () => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
};

export default function HomeMapBlock({
  mapStateData,
  selectedState,
  stateName,
  onStateSelect,
  onClearState,
  t,
}: HomeMapBlockProps) {
  const glanceRowRef = useRef<HTMLDivElement>(null);
  const glancePanelRef = useRef<HTMLElement>(null);
  const isolatedSvgId = selectedState ? toSvgStateId(selectedState) : null;

  const handleMapStateClick = useCallback(
    (svgId: string) => {
      const stateId = fromSvgStateId(svgId);
      if (stateId) onStateSelect(stateId);
    },
    [onStateSelect]
  );

  useEffect(() => {
    if (!selectedState) return undefined;

    const row = glanceRowRef.current;
    const glance = glancePanelRef.current;
    if (!row || !glance) return undefined;

    const mq = window.matchMedia(STATE_MAP_SYNC_MQ);
    let frame = 0;

    const syncMapToGlance = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!mq.matches) {
          row.style.removeProperty("--state-map-sync-height");
          return;
        }
        const glanceHeight = Math.ceil(glance.getBoundingClientRect().height);
        if (glanceHeight > 0) {
          row.style.setProperty("--state-map-sync-height", `${glanceHeight}px`);
        }
      });
    };

    syncMapToGlance();

    const observer =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(syncMapToGlance) : null;
    observer?.observe(glance);
    mq.addEventListener("change", syncMapToGlance);
    window.addEventListener("resize", syncMapToGlance);

    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      mq.removeEventListener("change", syncMapToGlance);
      window.removeEventListener("resize", syncMapToGlance);
      row.style.removeProperty("--state-map-sync-height");
    };
  }, [selectedState, stateName]);

  return (
    <div className="home-map-block">
      <div className="home-map-block__head">
        <div className="home-map-block__title-row">
          <span className="home-map-block__dot" aria-hidden />
          <span className="home-map-block__title">
            {stateName ? t("home.jobMap", { state: stateName }) : t("home.allIndiaJobMap")}
          </span>
        </div>
        {selectedState && (
          <button type="button" className="home-map-block__clear" onClick={onClearState}>
            {t("home.clear")}
          </button>
        )}
      </div>

      <div
        className={selectedState ? "home-state-map-glance-row" : undefined}
        ref={selectedState ? glanceRowRef : undefined}
      >
        <div className={`home-map-shell${selectedState ? " home-map-shell--isolated" : ""}`}>
          <IndiaMap
            stateData={mapStateData}
            isolateStateId={isolatedSvgId}
            onStateClick={handleMapStateClick}
          />
        </div>
        {selectedState ? (
          <StateGlancePanel
            ref={glancePanelRef}
            stateId={selectedState}
            stateName={stateName}
            t={t}
          />
        ) : null}
      </div>

      <p className="home-map-block__hint">
        {selectedState
          ? t("home.mapStateGlanceHint", {
              defaultValue: "State map and facts — live jobs listed below",
            })
          : t("home.mapTapHint", { defaultValue: "Tap a state to filter live vacancies" })}
      </p>
    </div>
  );
}
