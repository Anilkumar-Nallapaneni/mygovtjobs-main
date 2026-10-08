import { useEffect, useRef, useState } from "react";
import { districtLabel, districtNamesMatch } from "@/data/stateDistricts";

type DistrictShape = { name: string; d: string };
type DistrictMapFile = { viewBox: string; districts: DistrictShape[] };

type StateDistrictMapProps = {
  stateId: string;
  selectedDistrict?: string | null;
  onDistrictSelect?: (name: string) => void;
};

function districtColor(index: number): string {
  const hue = Math.round((index * 137.508) % 360);
  return `hsl(${hue} 68% 64%)`;
}

const HOVER_HINT = "Hover a district";

export default function StateDistrictMap({
  stateId,
  selectedDistrict = null,
  onDistrictSelect,
}: StateDistrictMapProps) {
  const [data, setData] = useState<DistrictMapFile | null>(null);
  const labelRef = useRef<HTMLParagraphElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<SVGPathElement | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    fetch(`/maps/districts/${encodeURIComponent(stateId)}.json`)
      .then((response) => (response.ok ? response.json() : null))
      .then((value: DistrictMapFile | null) => {
        if (!cancelled) setData(value);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      });
    return () => {
      cancelled = true;
    };
  }, [stateId]);

  const districts = selectedDistrict
    ? (data?.districts.filter((district) => districtNamesMatch(district.name, selectedDistrict)) ?? [])
    : (data?.districts ?? []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !data) return;
    if (!selectedDistrict) {
      svg.setAttribute("viewBox", data.viewBox);
      return;
    }
    const path = svg.querySelector("path");
    if (!(path instanceof SVGPathElement)) return;
    const box = path.getBBox();
    if (!box.width || !box.height) return;
    const pad = Math.max(box.width, box.height) * 0.12;
    svg.setAttribute(
      "viewBox",
      `${box.x - pad} ${box.y - pad} ${box.width + pad * 2} ${box.height + pad * 2}`
    );
  }, [data, selectedDistrict, districts.length]);

  const clearHover = () => {
    activeRef.current?.classList.remove("is-active");
    activeRef.current = null;
    if (labelRef.current) {
      labelRef.current.textContent = selectedDistrict ? districtLabel(stateId, selectedDistrict) : HOVER_HINT;
    }
    if (tipRef.current) tipRef.current.hidden = true;
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const path = (event.target as Element).closest("path");
    const tip = tipRef.current;
    if (!(path instanceof SVGPathElement) || !tip) {
      clearHover();
      return;
    }
    if (activeRef.current !== path) {
      activeRef.current?.classList.remove("is-active");
      path.classList.add("is-active");
      activeRef.current = path;
      const name = districtLabel(stateId, path.dataset.name ?? "");
      if (labelRef.current) labelRef.current.textContent = name;
      tip.textContent = name;
    }
    const box = event.currentTarget.getBoundingClientRect();
    tip.hidden = false;
    tip.style.transform = `translate(${event.clientX - box.left + 14}px, ${event.clientY - box.top - 32}px)`;
  };

  const onClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (selectedDistrict) return;
    const path = (event.target as Element).closest("path");
    if (!(path instanceof SVGPathElement)) return;
    const name = path.dataset.name;
    if (name) onDistrictSelect?.(name);
  };

  if (!data?.districts.length || !districts.length) {
    return <div className="state-district-map state-district-map--pending" aria-hidden />;
  }

  return (
    <div className="state-district-map" onPointerMove={onPointerMove} onPointerLeave={clearHover} onClick={onClick}>
      <svg ref={svgRef} viewBox={data.viewBox} role="img" aria-label={selectedDistrict ? districtLabel(stateId, selectedDistrict) : "District borders"}>
        {districts.map((district) => (
          <path
            key={district.name}
            d={district.d}
            fill={districtColor(data.districts.findIndex((item) => item.name === district.name))}
            data-name={district.name}
          />
        ))}
      </svg>
      <div ref={tipRef} className="state-district-map__tip" hidden />
      <p ref={labelRef} className="state-district-map__label">
        {selectedDistrict ? districtLabel(stateId, selectedDistrict) : HOVER_HINT}
      </p>
    </div>
  );
}
