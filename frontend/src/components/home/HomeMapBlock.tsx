import { useCallback, useEffect, useRef, useState } from "react";
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
  const shellRef = useRef<HTMLDivElement>(null);
  const isolatedSvgId = selectedState ? toSvgStateId(selectedState) : null;
  // Defer SVG fetch so logo/bootstrap paint first (PSI mobile LCP/TBT).
  const [mapReady, setMapReady] = useState(Boolean(import.meta.env.VITEST));

  const handleMapStateClick = useCallback(
    (svgId: string) => {
      const stateId = fromSvgStateId(svgId);
      if (stateId) onStateSelect(stateId);
    },
    [onStateSelect]
  );

  useEffect(() => {
    if (mapReady) return undefined;

    let cancelled = false;
    const mount = () => {
      if (!cancelled) setMapReady(true);
    };

    const node = shellRef.current;
    if (node && typeof IntersectionObserver !== "undefined") {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) {
            mount();
            observer.disconnect();
          }
        },
        { rootMargin: "80px 0px" }
      );
      observer.observe(node);

      const idleHandle =
        typeof requestIdleCallback === "function"
          ? requestIdleCallback(mount, { timeout: 4_000 })
          : null;
      const timerHandle = idleHandle == null ? window.setTimeout(mount, 1_200) : null;

      return () => {
        cancelled = true;
        observer.disconnect();
        if (idleHandle != null && typeof cancelIdleCallback === "function") {
          cancelIdleCallback(idleHandle);
        }
        if (timerHandle != null) window.clearTimeout(timerHandle);
      };
    }

    const timer = window.setTimeout(mount, 800);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [mapReady]);

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
        <div
          ref={shellRef}
          className={`home-map-shell${selectedState ? " home-map-shell--isolated" : ""}`}
          style={mapReady ? undefined : { minHeight: 280 }}
        >
          {mapReady ? (
            <IndiaMap
              stateData={mapStateData}
              isolateStateId={isolatedSvgId}
              onStateClick={handleMapStateClick}
            />
          ) : (
            <div className="home-map-shell__placeholder" aria-hidden />
          )}
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
