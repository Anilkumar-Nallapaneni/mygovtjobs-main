import { useEffect, useRef, useState } from "react";
import { toSvgStateId } from "@/data/states";
import {
  fetchStateSvgContent,
  fitSvgViewBoxToContent,
  getIsolatedStateFill,
  normalizeIndiaMapSvg,
} from "@/utils/mapUtils";

type StateMapMiniProps = {
  stateId: string;
  className?: string;
};

/** Compact state silhouette for the glance panel header. */
export default function StateMapMini({ stateId, className = "" }: StateMapMiniProps) {
  const rootRef = useRef<HTMLElement>(null);
  const [markup, setMarkup] = useState("");

  const svgId = toSvgStateId(stateId);

  useEffect(() => {
    let cancelled = false;
    fetchStateSvgContent(svgId).then((content) => {
      if (!cancelled) setMarkup(content?.includes("<svg") ? content : "");
    });
    return () => {
      cancelled = true;
    };
  }, [svgId]);

  useEffect(() => {
    const root = rootRef.current;
    if (!markup || !root) return;

    normalizeIndiaMapSvg(root);
    const paths = root.querySelectorAll("path");
    paths.forEach((path) => {
      path.setAttribute("fill", getIsolatedStateFill());
      path.setAttribute("stroke", "none");
      path.setAttribute("stroke-width", "0");
    });
    fitSvgViewBoxToContent(root, 0.05);
  }, [markup]);

  if (!markup) {
    return <span className={`state-map-mini state-map-mini--placeholder ${className}`.trim()} aria-hidden />;
  }

  return (
    <span
      ref={rootRef}
      className={`state-map-mini ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: markup }}
      aria-hidden
    />
  );
}
