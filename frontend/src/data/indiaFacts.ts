/** Curated India facts for the homepage glance panel. */
export const INDIA_GLANCE = {
  asOfYear: 2026,
  officialName: "Republic of India",
  president: "Droupadi Murmu",
  vicePresident: "C. P. Radhakrishnan",
  primeMinister: "Narendra Modi",
  governmentType: "Federal parliamentary democratic republic",
  legislature: "Parliament (Lok Sabha & Rajya Sabha)",
  lokSabhaSeats: "543 elected seats",
  rajyaSabhaSeats: "Up to 245 members",
  judiciary: "Supreme Court of India",
  constitutionAdopted: "26 November 1949",
  capital: "New Delhi",
  largestCity: "Mumbai",
  statesCount: "28 states",
  unionTerritories: "8 union territories",
  districts: "766 districts (approx.)",
  /** Total geographic area (sq km). */
  landAreaSqKm: 3_287_263,
  coastlineKm: 7_516,
  geographicRegion: "South Asia",
  landBorders: "7 countries — Pakistan to Myanmar",
  highestPeak: "Kangchenjunga — 8,586 m",
  longestRiver: "Ganga — 2,525 km",
  majorPorts: "12 major ports",
  population: "1.4 billion+",
  literacyRate: "77.7% (2011 Census base)",
  officialLanguages: "Hindi & English (22 scheduled languages)",
  currency: "Indian Rupee (INR)",
  timeZone: "IST (UTC+5:30)",
  callingCode: "+91",
  nationalAnthem: "Jana Gana Mana",
  nationalEmblem: "Lion Capital of Ashoka",
  nationalAnimal: "Bengal Tiger",
  nationalBird: "Indian Peafowl",
  nationalFlower: "Lotus",
  independence: "15 August 1947",
  republicDay: "26 January 1950",
} as const;

export type IndiaGlanceFactKey =
  | "officialName"
  | "president"
  | "vicePresident"
  | "primeMinister"
  | "governmentType"
  | "legislature"
  | "lokSabhaSeats"
  | "rajyaSabhaSeats"
  | "judiciary"
  | "constitutionAdopted"
  | "capital"
  | "largestCity"
  | "statesUts"
  | "statesCount"
  | "unionTerritories"
  | "districts"
  | "landArea"
  | "coastline"
  | "geographicRegion"
  | "landBorders"
  | "highestPeak"
  | "longestRiver"
  | "majorPorts"
  | "population"
  | "literacyRate"
  | "officialLanguages"
  | "currency"
  | "timeZone"
  | "callingCode"
  | "nationalAnthem"
  | "nationalEmblem"
  | "nationalAnimal"
  | "nationalBird"
  | "nationalFlower"
  | "independence"
  | "republicDay";

export type IndiaGlanceSection = {
  id: string;
  labelKey: string;
  facts: IndiaGlanceFactKey[];
};

export const INDIA_GLANCE_SECTIONS: IndiaGlanceSection[] = [
  {
    id: "leadership",
    labelKey: "sectionLeadership",
    facts: [
      "officialName",
      "president",
      "vicePresident",
      "primeMinister",
      "governmentType",
      "legislature",
      "lokSabhaSeats",
      "rajyaSabhaSeats",
      "judiciary",
      "constitutionAdopted",
    ],
  },
  {
    id: "geography",
    labelKey: "sectionGeography",
    facts: [
      "capital",
      "largestCity",
      "statesUts",
      "statesCount",
      "unionTerritories",
      "districts",
      "landArea",
      "coastline",
      "geographicRegion",
      "landBorders",
      "highestPeak",
      "longestRiver",
      "majorPorts",
      "population",
      "literacyRate",
    ],
  },
  {
    id: "identity",
    labelKey: "sectionIdentity",
    facts: [
      "officialLanguages",
      "currency",
      "timeZone",
      "callingCode",
      "nationalAnthem",
      "nationalEmblem",
      "nationalAnimal",
      "nationalBird",
      "nationalFlower",
      "independence",
      "republicDay",
    ],
  },
];

export function formatIndiaLandArea(sqKm: number, locale = "en-IN"): string {
  return `${sqKm.toLocaleString(locale)} km²`;
}

export function formatCoastline(km: number, locale = "en-IN"): string {
  return `${km.toLocaleString(locale)} km`;
}
