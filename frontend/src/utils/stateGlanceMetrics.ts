import {
  STATE_GLANCE_SECTIONS,
  getStateGlanceRecord,
  type StateGlanceFactKey,
} from "@/data/stateFacts";
import { getStateGlanceHighlights } from "@/data/stateGlanceHighlights";
import { getStateCabinetFacts } from "@/data/stateCabinetFacts";

function glanceValues(stateId: string): Record<StateGlanceFactKey, string> {
  const record = getStateGlanceRecord(stateId);
  const highlights = getStateGlanceHighlights(stateId);
  const cabinet = getStateCabinetFacts(stateId);

  return {
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
  };
}

export type StateGlanceMetrics = {
  sections: number;
  facts: number;
  sectionFacts: Record<string, number>;
};

/** Mirrors visible rows in `StateGlancePanel` — used for layout sync tests. */
export function countStateGlanceVisibleFacts(stateId: string): StateGlanceMetrics {
  const valueByKey = glanceValues(stateId);
  let sections = 0;
  let facts = 0;
  const sectionFacts: Record<string, number> = {};

  for (const section of STATE_GLANCE_SECTIONS) {
    const visibleFacts = section.facts.filter((key) => valueByKey[key] !== "—");
    if (!visibleFacts.length) continue;
    sections += 1;
    facts += visibleFacts.length;
    sectionFacts[section.id] = visibleFacts.length;
  }

  return { sections, facts, sectionFacts };
}
