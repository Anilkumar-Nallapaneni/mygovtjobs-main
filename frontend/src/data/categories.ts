/* Job category metadata — counts come from computeJobAggregates(live jobs). */
export const CATS = [
  { id: "upsc", name: "UPSC", icon: "🏛️", color: "#FF6B00" },
  { id: "ssc", name: "SSC", icon: "📋", color: "#FFAA00" },
  { id: "railways", name: "Railways", icon: "🚂", color: "#22C55E" },
  { id: "banking", name: "Banking", icon: "🏦", color: "#38BDF8" },
  { id: "police", name: "Police", icon: "🚔", color: "#EF4444" },
  { id: "teaching", name: "Teaching", icon: "📚", color: "#A78BFA" },
  { id: "defence", name: "Defence", icon: "⚔️", color: "#34D399" },
  { id: "psu", name: "PSU", icon: "⚙️", color: "#FB923C" },
  { id: "health", name: "Health", icon: "🏥", color: "#F472B6" },
  { id: "engineering", name: "Engineering", icon: "🔧", color: "#60A5FA" },
  { id: "state", name: "State PSC", icon: "🏢", color: "#67E8F9" },
] as const;

export type CategoryId = (typeof CATS)[number]["id"];

/** Board chips on results / admit hub pages (Week 5). */
export const RESULTS_HUB_BOARD_CAT_IDS = [
  "banking",
  "ssc",
  "upsc",
  "railways",
  "defence",
] as const satisfies readonly CategoryId[];

export type ResultsHubBoardCatId = (typeof RESULTS_HUB_BOARD_CAT_IDS)[number];
