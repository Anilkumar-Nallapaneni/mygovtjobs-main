let svgCache: string | null = null;
let svgInflight: Promise<string> | null = null;
const stateSvgCache = new Map<string, string>();
const stateSvgInflight = new Map<string, Promise<string>>();

/** Isolated state fill — synced from `--ds-mapStateFill` when in the browser. */
export const ISOLATED_STATE_FILL = "#DDE3ED";

export function getIsolatedStateFill(): string {
  if (typeof document === "undefined") return ISOLATED_STATE_FILL;
  const fromToken = window.getComputedStyle(document.documentElement)
    .getPropertyValue("--ds-mapStateFill")
    .trim();
  return fromToken || ISOLATED_STATE_FILL;
}

/** Remove fixed pixel width/height so the SVG scales with its container and browser zoom. */
export function prepareResponsiveSvgMarkup(svgText: string): string {
  if (!svgText.includes("<svg")) return svgText;
  return svgText.replace(/<svg\b([^>]*)>/i, (_match, attrs: string) => {
    const cleaned = attrs.replace(/\s(width|height)="[^"]*"/gi, "");
    return `<svg${cleaned}>`;
  });
}

export const INDIA_MAP_VIEWBOX = "0 0 611.85999 695.70178";

/** Zoom the SVG viewport to a single state path with padding. */
export function fitSvgViewBoxToPath(
  svg: SVGSVGElement,
  path: SVGPathElement,
  paddingRatio = 0.08
): void {
  const bbox = path.getBBox();
  const padX = Math.max(10, bbox.width * paddingRatio);
  const padY = Math.max(10, bbox.height * paddingRatio);
  const x = bbox.x - padX;
  const y = bbox.y - padY;
  const w = bbox.width + padX * 2;
  const h = bbox.height + padY * 2;
  svg.setAttribute("viewBox", `${x} ${y} ${w} ${h}`);
}

/** Fit viewBox to the union of all paths (composite NE / merged UT maps). */
export function fitSvgViewBoxToContent(
  root: HTMLElement | null | undefined,
  paddingRatio = 0.08
): void {
  if (!root) return;
  const svg = root.querySelector("svg");
  if (!svg) return;
  const paths = Array.from(root.querySelectorAll("path")) as SVGPathElement[];
  if (!paths.length) return;
  if (paths.length === 1) {
    fitSvgViewBoxToPath(svg, paths[0], paddingRatio);
    return;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const path of paths) {
    const bbox = path.getBBox();
    minX = Math.min(minX, bbox.x);
    minY = Math.min(minY, bbox.y);
    maxX = Math.max(maxX, bbox.x + bbox.width);
    maxY = Math.max(maxY, bbox.y + bbox.height);
  }

  const w = maxX - minX;
  const h = maxY - minY;
  if (!(w > 0 && h > 0)) return;

  const padX = Math.max(10, w * paddingRatio);
  const padY = Math.max(10, h * paddingRatio);
  svg.setAttribute(
    "viewBox",
    `${minX - padX} ${minY - padY} ${w + padX * 2} ${h + padY * 2}`
  );
}

/** Show one state path, or restore all paths when `visibleId` is null. */
export function setIndiaMapPathVisibility(root: HTMLElement, visibleId: string | null): void {
  root.querySelectorAll("path").forEach((path) => {
    const id = path.getAttribute("id") || "";
    if (!visibleId) {
      path.style.display = "";
      return;
    }
    path.style.display = id === visibleId ? "" : "none";
  });
}

export function restoreIndiaMapViewBox(
  svg: SVGSVGElement,
  viewBox: string = INDIA_MAP_VIEWBOX
): void {
  svg.setAttribute("viewBox", viewBox);
}

/** Restore all state paths and the full-India viewport after isolated state view. */
export function resetIndiaMapToFullView(root: HTMLElement): void {
  setIndiaMapPathVisibility(root, null);
  const svg = root.querySelector("svg");
  if (svg) restoreIndiaMapViewBox(svg);
}

/** Apply responsive sizing to an inline India map SVG node. */
export function normalizeIndiaMapSvg(root: HTMLElement | null | undefined): void {
  if (!root) return;
  const svg = root.querySelector("svg");
  if (!svg) return;

  if (!svg.getAttribute("viewBox")) {
    const w = svg.getAttribute("width");
    const h = svg.getAttribute("height");
    if (w && h) {
      svg.setAttribute("viewBox", `0 0 ${parseFloat(w)} ${parseFloat(h)}`);
    }
  }

  svg.removeAttribute("width");
  svg.removeAttribute("height");
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.style.width = "100%";
  svg.style.height = "auto";
  svg.style.maxWidth = "100%";
  svg.style.display = "block";
}

/**
 * Loads the India map SVG markup. The SVG lives in `public/india.svg` so it is
 * served as a static asset instead of being bundled into the JS payload.
 * Cached in memory so remounts (e.g. route changes) do not re-fetch.
 */
export const fetchSVGContent = async (): Promise<string> => {
  if (svgCache) return svgCache;
  if (!svgInflight) {
    svgInflight = (async () => {
      try {
        const res = await fetch("/india.svg");
        if (!res.ok) return "";
        const text = await res.text();
        if (text.includes("<path")) {
          svgCache = prepareResponsiveSvgMarkup(text);
        }
        return svgCache ?? "";
      } catch {
        return "";
      } finally {
        svgInflight = null;
      }
    })();
  }
  return svgInflight;
};

/** Load a single-state SVG from `public/maps/states/{svgId}.svg`. */
export const fetchStateSvgContent = async (svgId: string): Promise<string> => {
  const cached = stateSvgCache.get(svgId);
  if (cached) return cached;

  let inflight = stateSvgInflight.get(svgId);
  if (!inflight) {
    inflight = (async () => {
      try {
        const res = await fetch(`/maps/states/${encodeURIComponent(svgId)}.svg`);
        if (!res.ok) return "";
        const text = await res.text();
        if (!text.includes("<svg")) return "";
        const prepared = prepareResponsiveSvgMarkup(text);
        stateSvgCache.set(svgId, prepared);
        return prepared;
      } catch {
        return "";
      } finally {
        stateSvgInflight.delete(svgId);
      }
    })();
    stateSvgInflight.set(svgId, inflight);
  }
  return inflight;
};

/** Apply ash fill and no border on isolated state map paths. */
export function paintIsolatedStateMapPaths(root: HTMLElement | null | undefined): void {
  if (!root) return;
  root.querySelectorAll("path").forEach((path) => {
    path.setAttribute("fill", getIsolatedStateFill());
    path.setAttribute("stroke", "none");
    path.setAttribute("stroke-width", "0");
    path.style.opacity = "1";
    path.removeAttribute("data-selected");
  });
}

/** Prefetch India + per-state map SVGs during idle time so state picks feel instant. */
export function warmStateMapCache(stateIds: string[] = []): void {
  if (typeof window === "undefined") return;
  const run = () => {
    void fetchSVGContent();
    const unique = [...new Set(stateIds.filter(Boolean))];
    void Promise.all(unique.map((id) => fetchStateSvgContent(id)));
  };
  if (window.requestIdleCallback) {
    window.requestIdleCallback(run, { timeout: 3000 });
  } else {
    window.setTimeout(run, 800);
  }
}

/** Hint the browser to fetch a state silhouette before the user clicks. */
export function prefetchStateSvg(svgId: string | null | undefined): void {
  const id = String(svgId || "").trim();
  if (!id) return;
  void fetchStateSvgContent(id);
}

/** Reset module cache between Vitest cases. */
export function resetMapSvgCacheForTests() {
  svgCache = null;
  svgInflight = null;
  stateSvgCache.clear();
  stateSvgInflight.clear();
}
