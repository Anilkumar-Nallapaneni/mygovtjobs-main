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

export function lookupLgdDistrict(stateId: string, mapName: string): LgdDistrictIdentity | null {
  const table = LGD_INDEX[stateId.toLowerCase()];
  if (!table) return null;
  const keys = mapName.split(/[()]/).map(normalizeDistrictKey).filter(Boolean);
  for (const key of keys) {
    const match = table[key];
    if (match) return match;
  }
  return null;
}
