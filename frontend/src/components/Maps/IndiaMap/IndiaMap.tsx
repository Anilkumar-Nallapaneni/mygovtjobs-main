import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { IndiaMapProps, defaultMapStyle } from "@/types/MapTypes";
import {
  fetchSVGContent,
  fetchStateSvgContent,
  normalizeIndiaMapSvg,
  paintIsolatedStateMapPaths,
  resetIndiaMapToFullView,
  fitSvgViewBoxToContent,
  prefetchStateSvg,
} from "@/utils/mapUtils";
import stateColors from '@/data/stateColors';
import { jobCountFromStateData } from '@/components/Maps/IndiaMap/mapStateJobCount';
import '@/styles/map.css';

interface HoverInfo {
  name: string;
  id: string;
  title: string;
}

function canUseHoverTooltip(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

export const IndiaMap: React.FC<IndiaMapProps> = ({
  mapStyle = defaultMapStyle,
  stateData = [],
  onStateHover,
  onStateClick,
  isolateStateId = null,
  selectionSyncKey = null,
}) => {
  const [svgContent, setSvgContent] = useState<string>("");
  const [loadError, setLoadError] = useState(false);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [showTooltip, setShowTooltip] = useState(false);
  const [hoverTooltipEnabled, setHoverTooltipEnabled] = useState(canUseHoverTooltip);
  const [focusedPathId, setFocusedPathId] = useState<string | null>(null);

  const originalColors = useRef<Map<string, string>>(new Map());
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const pathIdsRef = useRef<string[]>([]);
  const hoverTooltipEnabledRef = useRef(canUseHoverTooltip());
  const isIsolated = Boolean(isolateStateId);

  const dismissTooltip = useCallback(() => {
    setHoverInfo(null);
    setShowTooltip(false);
    onStateHover?.("");
  }, [onStateHover]);

  const baseFillFor = useCallback(
    (id: string) =>
      originalColors.current.get(id) || stateColors[id] || mapStyle.backgroundColor || "#ffffff",
    [mapStyle.backgroundColor]
  );

  const jobCountById = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of stateData) {
      counts.set(entry.id, jobCountFromStateData(entry));
    }
    return counts;
  }, [stateData]);

  const jobCountForPath = useCallback(
    (id: string) => jobCountById.get(id) ?? 0,
    [jobCountById]
  );

  const applyPathStyle = useCallback(
    (path: SVGPathElement, hovered: boolean) => {
      if (isIsolated) return;

      const id = path.getAttribute("id") || "";
      const base = baseFillFor(id);
      const isSelected = Boolean(selectionSyncKey && id === selectionSyncKey);

      path.setAttribute(
        "fill",
        hovered && hoverTooltipEnabledRef.current ? mapStyle.hoverColor || base : base
      );
      path.setAttribute("data-has-jobs", jobCountForPath(id) > 0 ? "true" : "false");
      path.setAttribute("data-hot-jobs", jobCountForPath(id) >= 8 ? "true" : "false");
      path.setAttribute("data-job-count", String(jobCountForPath(id)));
      path.style.opacity = "1";

      if (isSelected) {
        path.setAttribute("data-selected", "true");
        path.setAttribute("aria-pressed", "true");
        path.removeAttribute("aria-selected");
        path.setAttribute("stroke", mapStyle.stroke || "#000000");
        path.setAttribute("stroke-width", String(mapStyle.strokeWidth || 1));
      } else {
        path.removeAttribute("data-selected");
        path.setAttribute("aria-pressed", "false");
        path.removeAttribute("aria-selected");
        path.setAttribute("stroke", mapStyle.stroke || "#000000");
        path.setAttribute("stroke-width", String(mapStyle.strokeWidth || 1));
      }
    },
    [baseFillFor, isIsolated, jobCountForPath, mapStyle.hoverColor, mapStyle.stroke, mapStyle.strokeWidth, selectionSyncKey]
  );

  const resetAllPathStyles = useCallback(() => {
    if (!mapContainerRef.current) return;
    if (isIsolated) {
      paintIsolatedStateMapPaths(mapContainerRef.current);
      return;
    }
    mapContainerRef.current.querySelectorAll("path").forEach((path) => {
      applyPathStyle(path as SVGPathElement, false);
    });
  }, [applyPathStyle, isIsolated]);

  useEffect(() => {
    let cancelled = false;
    const loadSVG = async () => {
      if (!isolateStateId) setLoadError(false);
      const content = isolateStateId
        ? await fetchStateSvgContent(isolateStateId)
        : await fetchSVGContent();
      if (cancelled) return;
      if (content?.includes("<svg")) {
        setSvgContent(content);
        setLoadError(false);
      } else if (!isolateStateId) {
        setSvgContent("");
        setLoadError(true);
      }
    };
    loadSVG();
    return () => {
      cancelled = true;
    };
  }, [isolateStateId]);

  useEffect(() => {
    const media = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => {
      const enabled = media.matches;
      hoverTooltipEnabledRef.current = enabled;
      setHoverTooltipEnabled(enabled);
      if (!enabled) dismissTooltip();
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [dismissTooltip]);

  useEffect(() => {
    if (!svgContent || !mapContainerRef.current) return;

    normalizeIndiaMapSvg(mapContainerRef.current);

    const paths = mapContainerRef.current.querySelectorAll("path");
    if (!paths.length) return;

    const ids: string[] = [];
    paths.forEach((path) => {
      const pathElement = path as SVGPathElement;
      const id = pathElement.getAttribute("id") || "";
      if (id) ids.push(id);

      if (!isIsolated) {
        const fillColor = stateColors[id] || mapStyle.backgroundColor || "#ffffff";
        try {
          pathElement.setAttribute("fill", fillColor);
          pathElement.setAttribute("stroke", mapStyle.stroke || "#000000");
          pathElement.setAttribute("stroke-width", String(mapStyle.strokeWidth || 1));
          pathElement.setAttribute("role", "button");
          originalColors.current.set(id, fillColor);
        } catch {
          // Ignore DOM exceptions
        }
      }
    });
    pathIdsRef.current = ids;

    if (isIsolated) {
      paintIsolatedStateMapPaths(mapContainerRef.current);
      fitSvgViewBoxToContent(mapContainerRef.current);
    } else {
      resetIndiaMapToFullView(mapContainerRef.current);
      resetAllPathStyles();
    }
  }, [svgContent, isIsolated, mapStyle.backgroundColor, mapStyle.stroke, mapStyle.strokeWidth, resetAllPathStyles]);

  useEffect(() => {
    if (!svgContent || !mapContainerRef.current) return undefined;

    const node = mapContainerRef.current;
    const syncLayout = () => {
      normalizeIndiaMapSvg(node);
      if (isIsolated) {
        fitSvgViewBoxToContent(node);
        return;
      }
      resetIndiaMapToFullView(node);
    };

    syncLayout();

    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(syncLayout) : null;
    observer?.observe(node);

    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", syncLayout);
    window.addEventListener("resize", syncLayout);

    return () => {
      observer?.disconnect();
      viewport?.removeEventListener("resize", syncLayout);
      window.removeEventListener("resize", syncLayout);
    };
  }, [svgContent, isIsolated]);

  useEffect(() => {
    if (!svgContent || !mapContainerRef.current) return;
    resetAllPathStyles();
    dismissTooltip();
  }, [isolateStateId, svgContent, resetAllPathStyles, dismissTooltip]);

  useEffect(() => {
    if (!svgContent || !mapContainerRef.current || isIsolated) return;
    mapContainerRef.current.querySelectorAll("path").forEach((path) => {
      const id = path.getAttribute("id") || "";
      const count = jobCountById.get(id) ?? 0;
      path.setAttribute("data-has-jobs", count > 0 ? "true" : "false");
      path.setAttribute("data-hot-jobs", count >= 8 ? "true" : "false");
      path.setAttribute("data-job-count", String(count));
    });
  }, [jobCountById, svgContent, isIsolated]);

  useEffect(() => {
    if (!svgContent || !mapContainerRef.current) return;

    const paths = mapContainerRef.current.querySelectorAll("path");
    const data = stateData;
    const focusTarget = focusedPathId || selectionSyncKey || pathIdsRef.current[0] || "";

    paths.forEach((path) => {
      const pathElement = path as SVGPathElement;
      const id = pathElement.getAttribute("id") || "";
      const stateInfo = data.find((s) => s.id === id);
      const stateName =
        pathElement.getAttribute("data-name") ||
        stateInfo?.customData?.name ||
        stateInfo?.name;
      if (stateName) {
        pathElement.setAttribute("data-name", stateName);
        pathElement.setAttribute(
          "aria-label",
          isIsolated ? stateName : `Select ${stateName}`
        );
      } else if (id) {
        pathElement.setAttribute("aria-label", isIsolated ? id : `Select ${id}`);
      }
      if (!isIsolated) {
        pathElement.setAttribute("role", "button");
        pathElement.setAttribute("tabindex", id === focusTarget ? "0" : "-1");
      } else {
        pathElement.removeAttribute("role");
        pathElement.removeAttribute("tabindex");
      }
    });
  }, [svgContent, stateData, focusedPathId, selectionSyncKey, isIsolated]);

  const handleMouseEnter = (e: React.MouseEvent, element: SVGPathElement) => {
    if (!hoverTooltipEnabledRef.current || isIsolated) return;

    const pathId = element.getAttribute("id") || "";
    prefetchStateSvg(pathId);
    const title = element.getAttribute("data-name") || "";

    setHoverInfo({ name: title, id: pathId, title });
    setTooltipPos({ x: e.clientX, y: e.clientY });
    setShowTooltip(true);
    onStateHover?.(pathId);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (showTooltip && hoverTooltipEnabledRef.current) {
      setTooltipPos({ x: e.clientX, y: e.clientY });
    }
  };

  const activatePath = useCallback(
    (path: SVGPathElement) => {
      const id = path.getAttribute("id") || "";
      if (!id || isIsolated) return;
      dismissTooltip();
      applyPathStyle(path, false);
      path.setAttribute("data-tapped", "true");
      window.setTimeout(() => path.removeAttribute("data-tapped"), 320);
      onStateClick?.(id);
    },
    [applyPathStyle, dismissTooltip, isIsolated, onStateClick]
  );

  const focusPathById = useCallback((id: string) => {
    setFocusedPathId(id);
    const el = mapContainerRef.current?.querySelector(`path[id="${id}"]`) as SVGPathElement | null;
    el?.focus();
  }, []);

  const handleMapKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (isIsolated) return;
      const path = e.target as SVGPathElement;
      if (path?.tagName !== "path") return;
      const currentId = path.getAttribute("id") || "";
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        activatePath(path);
        return;
      }
      const ids = pathIdsRef.current;
      const idx = ids.indexOf(currentId);
      if (idx < 0) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        focusPathById(ids[(idx + 1) % ids.length]);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        focusPathById(ids[(idx - 1 + ids.length) % ids.length]);
      }
    },
    [activatePath, focusPathById, isIsolated]
  );

  const currentStateData = hoverInfo ? stateData.find((s) => s.id === hoverInfo.id) : undefined;

  const getTooltipStyles = () => ({
    position: "fixed" as const,
    left: `${tooltipPos.x + 15}px`,
    top: `${tooltipPos.y + 15}px`,
    backgroundColor: mapStyle.tooltipConfig?.backgroundColor || "rgba(0, 0, 0, 0.8)",
    color: mapStyle.tooltipConfig?.textColor || "#ffffff",
    padding: "8px 12px",
    borderRadius: "4px",
    fontSize: "14px",
    zIndex: 1000,
    pointerEvents: "none" as const,
    boxShadow: "0 2px 10px rgba(0, 0, 0, 0.2)",
    minWidth: "150px",
    maxWidth: "250px",
  });

  return (
    <div
      className={`india-map-container${isIsolated ? " india-map-container--isolated" : ""}`}
      onMouseMove={handleMouseMove}
      onTouchStart={dismissTooltip}
    >
      {showTooltip && hoverInfo && hoverTooltipEnabled && !isIsolated && (
        <div className="state-tooltip" style={getTooltipStyles()}>
          <div className="state-tooltip-header">
            {hoverInfo.title || currentStateData?.customData?.name || hoverInfo.id}
          </div>
          {currentStateData?.customData && (
            <div className="state-tooltip-custom-data">
              {Object.entries(currentStateData.customData)
                .filter(([key]) => key !== "name" && key !== "region" && key !== "jobCount")
                .map(([key, value]) => (
                  <div key={key} className="state-tooltip-row">
                    <span>{key}:</span>
                    <span>{String(value)}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {loadError && !svgContent && (
        <p style={{ padding: 24, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
          Map could not load. Please refresh the page.
        </p>
      )}

      <div
        ref={mapContainerRef}
        className="india-map-svg-container"
        role="group"
        aria-label={isIsolated ? "Selected state map" : "India map — select a state"}
        dangerouslySetInnerHTML={{ __html: svgContent }}
        onKeyDown={handleMapKeyDown}
        onMouseOver={(e) => {
          if (isIsolated) return;
          const path = e.target as SVGPathElement;
          if (path?.tagName !== "path") return;
          if (hoverTooltipEnabledRef.current) {
            applyPathStyle(path, true);
            handleMouseEnter(e, path);
          }
        }}
        onClick={(e) => {
          if (isIsolated) return;
          const path = e.target as SVGPathElement;
          if (path.tagName === "path") activatePath(path);
        }}
        onMouseOut={(e) => {
          if (isIsolated) return;
          const path = e.target as SVGPathElement;
          if (path?.tagName === "path" && hoverTooltipEnabledRef.current) {
            applyPathStyle(path, false);
          }
          dismissTooltip();
        }}
      />
    </div>
  );
};
