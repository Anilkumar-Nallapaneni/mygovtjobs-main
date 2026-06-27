import type { StateData } from "@/types/MapTypes";

/** Numeric live listing count from map state payload. */
export function jobCountFromStateData(stateInfo: StateData | undefined): number {
  if (!stateInfo?.customData) return 0;
  const raw = stateInfo.customData.jobCount;
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.max(0, raw);
  const listings = stateInfo.customData.listings;
  if (typeof listings === "string") {
    const parsed = Number.parseInt(listings.replace(/[^\d]/g, ""), 10);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  }
  return 0;
}
