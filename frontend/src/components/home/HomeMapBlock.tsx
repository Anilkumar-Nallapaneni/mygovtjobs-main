import { useCallback, useEffect, useRef, useState } from "react";
import { fromSvgStateId } from "@/data/states";
import { IndiaMap } from "@/components/Maps/IndiaMap/IndiaMap";
import StateDistrictMap from "@/components/home/StateDistrictMap";
import { formatDistrictName } from "@/data/stateDistricts";
import type { IndiaMapProps } from "@/types/MapTypes";

type HomeMapBlockProps = {
  mapStateData: IndiaMapProps["stateData"];
  selectedState: string | null;
  stateName: string;
  onStateSelect: (stateId: string | null) => void;
  onClearState: () => void;
  selectedDistrict?: string | null;
  onDistrictSelect?: (name: string) => void;
  onClearDistrict?: () => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
};

export default function HomeMapBlock({
  mapStateData,
  selectedState,
  stateName,
  onStateSelect,
  onClearState,
  selectedDistrict = null,
  onDistrictSelect,
  onClearDistrict,
  t,
}: HomeMapBlockProps) {
  const shellRef = useRef<HTMLDivElement>(null);
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

  return (
    <div className={`home-map-block${selectedState ? " home-map-block--with-districts" : ""}`}>
      <div className="home-map-block__head">
        <div className="home-map-block__title-row">
          <span className="home-map-block__dot" aria-hidden />
          <span className="home-map-block__title">
            {selectedDistrict
              ? t("home.jobMap", { state: formatDistrictName(selectedDistrict) })
              : stateName
                ? t("home.jobMap", { state: stateName })
                : t("home.allIndiaJobMap")}
          </span>
        </div>
        {selectedState && (
          <button
            type="button"
            className="home-map-block__clear"
            onClick={selectedDistrict ? onClearDistrict : onClearState}
          >
            {t("home.clear")}
          </button>
        )}
      </div>

      <div
        ref={shellRef}
        className={`home-map-shell${selectedState ? " home-map-shell--isolated" : ""}`}
        style={mapReady ? undefined : { minHeight: 280 }}
      >
        {selectedState ? (
          <StateDistrictMap
            stateId={selectedState}
            selectedDistrict={selectedDistrict}
            onDistrictSelect={onDistrictSelect}
          />
        ) : mapReady ? (
          <IndiaMap stateData={mapStateData} onStateClick={handleMapStateClick} />
        ) : (
          <div className="home-map-shell__placeholder" aria-hidden />
        )}
      </div>

      <p className="home-map-block__hint">
        {selectedDistrict
          ? t("home.mapDistrictHint", {
              district: formatDistrictName(selectedDistrict),
              state: stateName,
              defaultValue: "{{district}} in {{state}}. Jobs for this district are listed below.",
            })
          : selectedState
            ? t("home.mapStateGlanceHint", {
                defaultValue: "Click a district to open it. Hover to see its name.",
                state: stateName,
              })
            : t("home.mapTapHint", { defaultValue: "Tap a state to see its districts, facts, and jobs" })}
      </p>
    </div>
  );
}
