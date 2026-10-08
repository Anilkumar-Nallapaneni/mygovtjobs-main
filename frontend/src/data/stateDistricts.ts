import districtsByState from "@/data/stateDistricts.json";
import lgdDistrictIndex from "@/data/lgdDistrictIndex.json";

const DISTRICTS = districtsByState as Record<string, string[]>;

export type LgdDistrictIdentity = {
  name: string;
  lgd: string;
  c11: string;
  c01: string;
};

const LGD_INDEX = lgdDistrictIndex as Record<string, Record<string, LgdDistrictIdentity>>;

export function districtsForState(stateId: string | null | undefined): string[] {
  if (!stateId) return [];
  return DISTRICTS[stateId.toLowerCase()] ?? [];
}

export function formatDistrictName(name: string): string {
  return name
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

export function normalizeDistrictKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function districtNamesMatch(left: string, right: string): boolean {
  return normalizeDistrictKey(left) === normalizeDistrictKey(right);
}

/** Spelling on the map that points at an existing Local Government Directory key. */
const MAP_KEY_ALIASES: Record<string, Record<string, string>> = {
  od: { baudh: "baudhbauda", bauda: "baudhbauda" },
};

/**
 * Readable names for map shapes that are not their own row in this LGD extract.
 * These do not invent a census or LGD code.
 */
const MAP_DISPLAY_NAMES: Record<string, Record<string, string>> = {
  dl: { shahadra: "Shahdara" },
  ka: { ramanagaram: "Ramanagara" },
  py: { mahe: "Mahe", yanam: "Yanam" },
  sk: { east: "East Sikkim", north: "North Sikkim", south: "South Sikkim", west: "West Sikkim" },
  jk: { mirpur: "Mirpur", muzaffarabad: "Muzaffarabad" },
  mp: { disputedratlammandsaur: "Disputed area (Ratlam and Mandsaur)" },
};

export function lookupLgdDistrict(stateId: string, mapName: string): LgdDistrictIdentity | null {
  const state = stateId.toLowerCase();
  const table = LGD_INDEX[state];
  if (!table) return null;
  const parts = mapName.split(/[()]/).map(normalizeDistrictKey).filter(Boolean);
  const keys = [normalizeDistrictKey(mapName), ...parts];
  for (const key of keys) {
    const alias = MAP_KEY_ALIASES[state]?.[key];
    const match = table[alias ?? key];
    if (match) return match;
  }
  return null;
}

export function districtLabel(stateId: string, mapName: string): string {
  const identity = lookupLgdDistrict(stateId, mapName);
  if (identity?.name) return identity.name;
  const display = MAP_DISPLAY_NAMES[stateId.toLowerCase()]?.[normalizeDistrictKey(mapName)];
  return display ?? formatDistrictName(mapName);
}
