import { forwardRef, useMemo } from "react";
import {
  STATE_GLANCE_AS_OF_YEAR,
  STATE_GLANCE_SECTIONS,
  getStateGlanceRecord,
  type StateGlanceFactKey,
} from "@/data/stateFacts";
import { getStateGlanceHighlights } from "@/data/stateGlanceHighlights";
import { getStateCabinetFacts } from "@/data/stateCabinetFacts";
import { STATES } from "@/data/states";
import { useStateLabel } from "@/utils/stateLabels";

type StateGlancePanelProps = {
  stateId: string;
  stateName: string;
  t: (key: string, opts?: Record<string, unknown>) => string;
};

function formatRegion(reg: string | undefined): string {
  if (!reg) return "—";
  return reg.charAt(0).toUpperCase() + reg.slice(1);
}

const FACT_LABEL_DEFAULTS: Record<StateGlanceFactKey, string> = {
  administrativeType: "Administrative type",
  governor: "Governor",
  chiefMinister: "Chief Minister",
  legislature: "Legislature",
  lokSabhaSeats: "Lok Sabha",
  rajyaSabhaSeats: "Rajya Sabha",
  highCourt: "High Court",
  capital: "Capital",
  largestCity: "Largest city",
  districts: "Districts",
  landArea: "Land area",
  population: "Population",
  literacyRate: "Literacy rate",
  officialLanguage: "Official language",
  formed: "Formed",
  statePsc: "Recruitment body",
  famousFor: "Famous for",
  majorRiver: "Major rivers",
  stateSymbols: "State symbols",
  touristHighlight: "Top places to visit",
  deputyChiefMinister: "Deputy Chief Minister",
  homeMinister: "Home Minister",
  financeMinister: "Finance Minister",
  educationMinister: "Education Minister",
  healthMinister: "Health Minister",
  chiefSecretary: "Chief Secretary",
  directorGeneralOfPolice: "Director General of Police",
  rulingAlliance: "Ruling alliance",
};

const StateGlancePanel = forwardRef<HTMLElement, StateGlancePanelProps>(function StateGlancePanel(
  { stateId, stateName, t },
  ref
) {
  const stateLabel = useStateLabel();
  const record = getStateGlanceRecord(stateId);
  const highlights = getStateGlanceHighlights(stateId);
  const cabinet = getStateCabinetFacts(stateId);
  const meta = STATES.find((s) => s.id === stateId);

  const valueByKey = useMemo<Record<StateGlanceFactKey, string>>(
    () => ({
      administrativeType: record?.administrativeType ?? "—",
      governor: record?.governor ?? "—",
      chiefMinister: record?.chiefMinister ?? "—",
      legislature: record?.legislature ?? "—",
      lokSabhaSeats: record?.lokSabhaSeats ?? "—",
      rajyaSabhaSeats: record?.rajyaSabhaSeats ?? "—",
      highCourt: record?.highCourt ?? "—",
      capital: record?.capital ?? "—",
      largestCity: record?.largestCity ?? "—",
      districts: record?.districts ?? "—",
      landArea: record?.landArea ?? "—",
      population: record?.population ?? "—",
      literacyRate: record?.literacyRate ?? "—",
      officialLanguage: record?.officialLanguage ?? "—",
      formed: record?.formed ?? "—",
      statePsc: highlights?.statePsc ?? "—",
      famousFor: highlights?.famousFor ?? "—",
      majorRiver: highlights?.majorRiver ?? "—",
      stateSymbols: highlights?.stateSymbols ?? "—",
      touristHighlight: highlights?.touristHighlight ?? "—",
      deputyChiefMinister: cabinet?.deputyChiefMinister ?? "—",
      homeMinister: cabinet?.homeMinister ?? "—",
      financeMinister: cabinet?.financeMinister ?? "—",
      educationMinister: cabinet?.educationMinister ?? "—",
      healthMinister: cabinet?.healthMinister ?? "—",
      chiefSecretary: cabinet?.chiefSecretary ?? "—",
      directorGeneralOfPolice: cabinet?.directorGeneralOfPolice ?? "—",
      rulingAlliance: cabinet?.rulingAlliance ?? "—",
    }),
    [cabinet, highlights, record]
  );

  return (
    <aside
      ref={ref}
      className="state-glance india-glance"
      aria-label={t("home.stateGlance.aria", {
        state: stateLabel(stateId),
        defaultValue: "{{state}} at a glance",
      })}
    >
      <header className="india-glance__head state-glance__head">
        <h2 className="india-glance__title">
          {t("home.stateGlance.title", {
            state: stateName,
            defaultValue: "{{state}} at a glance",
          })}
        </h2>
        <span className="india-glance__year">
          {t("home.stateGlance.asOf", {
            year: STATE_GLANCE_AS_OF_YEAR,
            defaultValue: "As of {{year}}",
          })}
        </span>
      </header>

      {meta?.reg ? (
        <p className="state-glance__region">
          {t("home.stateGlance.regionZone", {
            region: formatRegion(meta.reg),
            defaultValue: "{{region}} India",
          })}
        </p>
      ) : null}

      {STATE_GLANCE_SECTIONS.map((section) => {
        const visibleFacts = section.facts.filter((key) => valueByKey[key] !== "—");
        if (!visibleFacts.length) return null;
        return (
        <section key={section.id} className="india-glance__section">
          <h3 className="india-glance__section-title">
            {t(`home.stateGlance.${section.labelKey}`, {
              defaultValue: section.labelKey.replace(/^section/, ""),
            })}
          </h3>
          <dl className="india-glance__grid">
            {visibleFacts.map((key) => (
              <div key={key} className="india-glance__item">
                <dt className="india-glance__label">
                  {t(`home.stateGlance.${key}`, {
                    defaultValue: FACT_LABEL_DEFAULTS[key],
                  })}
                </dt>
                <dd className="india-glance__value">{valueByKey[key]}</dd>
              </div>
            ))}
          </dl>
        </section>
        );
      })}
    </aside>
  );
});

StateGlancePanel.displayName = "StateGlancePanel";

export default StateGlancePanel;
