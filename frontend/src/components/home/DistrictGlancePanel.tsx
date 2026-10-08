import { useEffect, useState } from "react";
import { STATE_GLANCE_AS_OF_YEAR } from "@/data/stateFacts";
import { formatDistrictName, lookupLgdDistrict } from "@/data/stateDistricts";
import { neighboringDistricts, type DistrictShape } from "@/utils/districtBorders";

type DistrictGlancePanelProps = {
  stateId: string;
  stateName: string;
  districtName: string;
  t: (key: string, opts?: Record<string, unknown>) => string;
};

function censusCode(code: string | undefined): string | null {
  if (!code || code === "0") return null;
  return code;
}

function displayName(stateId: string, mapName: string): string {
  return lookupLgdDistrict(stateId, mapName)?.name ?? formatDistrictName(mapName);
}

export default function DistrictGlancePanel({
  stateId,
  stateName,
  districtName,
  t,
}: DistrictGlancePanelProps) {
  const identity = lookupLgdDistrict(stateId, districtName);
  const name = identity?.name ?? formatDistrictName(districtName);
  const [borders, setBorders] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    setBorders([]);
    fetch(`/maps/districts/${encodeURIComponent(stateId)}.json`)
      .then((response) => (response.ok ? response.json() : null))
      .then((value: { districts?: DistrictShape[] } | null) => {
        if (cancelled || !value?.districts) return;
        setBorders(neighboringDistricts(value.districts, districtName));
      })
      .catch(() => {
        if (!cancelled) setBorders([]);
      });
    return () => {
      cancelled = true;
    };
  }, [stateId, districtName]);

  const identityRows = [
    { key: "name", label: "Official name", value: name },
    { key: "state", label: "State", value: stateName },
    { key: "type", label: "Type", value: "District" },
    { key: "lgd", label: "LGD district code", value: identity?.lgd ?? null },
  ].filter((row) => row.value);
  const censusRows = [
    { key: "c11", label: "Census 2011 code", value: censusCode(identity?.c11) },
    { key: "c01", label: "Census 2001 code", value: censusCode(identity?.c01) },
  ].filter((row) => row.value);

  return (
    <aside className="state-glance india-glance" aria-label={`${name} at a glance`}>
      <header className="india-glance__head">
        <h2 className="india-glance__title">{name} at a glance</h2>
        <span className="india-glance__year">
          {t("home.stateGlance.asOf", { year: STATE_GLANCE_AS_OF_YEAR, defaultValue: "As of {{year}}" })}
        </span>
      </header>

      <section className="india-glance__section">
        <h3 className="india-glance__section-title">This district</h3>
        <dl className="india-glance__grid">
          {identityRows.map((row) => (
            <div key={row.key} className="india-glance__item">
              <dt className="india-glance__label">{row.label}</dt>
              <dd className="india-glance__value">{row.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {censusRows.length > 0 ? (
        <section className="india-glance__section">
          <h3 className="india-glance__section-title">Census codes</h3>
          <dl className="india-glance__grid">
            {censusRows.map((row) => (
              <div key={row.key} className="india-glance__item">
                <dt className="india-glance__label">{row.label}</dt>
                <dd className="india-glance__value">{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {borders.length > 0 ? (
        <section className="india-glance__section">
          <h3 className="india-glance__section-title">Districts on its border</h3>
          <dl className="india-glance__grid">
            {borders.map((border) => (
              <div key={border} className="india-glance__item">
                <dt className="india-glance__label">Border</dt>
                <dd className="india-glance__value">{displayName(stateId, border)}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <p className="india-glance__note">
        These facts are for {name} only, from the Local Government Directory and this district map.
      </p>
    </aside>
  );
}
