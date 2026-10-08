import { useMemo } from "react";
import { STATE_GLANCE_AS_OF_YEAR, STATE_GLANCE_SECTIONS } from "@/data/stateFacts";
import { getStateGlanceValueMap } from "@/utils/stateGlanceMetrics";

type StateGlancePanelProps = {
  stateId: string;
  stateName: string;
  t: (key: string, opts?: Record<string, unknown>) => string;
};

export default function StateGlancePanel({ stateId, stateName, t }: StateGlancePanelProps) {
  const valueByKey = useMemo(() => getStateGlanceValueMap(stateId), [stateId]);
  const sections = STATE_GLANCE_SECTIONS.map((section) => ({
    ...section,
    facts: section.facts.filter((key) => valueByKey[key] !== "—"),
  })).filter((section) => section.facts.length > 0);

  return (
    <aside
      className="state-glance india-glance"
      aria-label={t("home.stateGlance.aria", { state: stateName, defaultValue: "{{state}} at a glance" })}
    >
      <header className="india-glance__head">
        <h2 className="india-glance__title">
          {t("home.stateGlance.title", { state: stateName, defaultValue: "{{state}} at a glance" })}
        </h2>
        <span className="india-glance__year">
          {t("home.stateGlance.asOf", { year: STATE_GLANCE_AS_OF_YEAR, defaultValue: "As of {{year}}" })}
        </span>
      </header>

      {sections.map((section) => (
        <section key={section.id} className="india-glance__section">
          <h3 className="india-glance__section-title">
            {t(`home.stateGlance.${section.labelKey}`, { defaultValue: section.labelKey })}
          </h3>
          <dl className="india-glance__grid">
            {section.facts.map((key) => (
              <div key={key} className="india-glance__item">
                <dt className="india-glance__label">
                  {t(`home.stateGlance.${key}`, { defaultValue: key })}
                </dt>
                <dd className="india-glance__value">{valueByKey[key]}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}

      <p className="india-glance__note">
        {t("home.stateGlance.note", {
          state: stateName,
          defaultValue:
            "Each colour on the map is a district of {{state}}. Live jobs for this state are listed below.",
        })}
      </p>
    </aside>
  );
}
