/* Centralized design tokens — dark and light (saffron brand on both). */

const DARK = {
  bg0: "#03060D",
  bg1: "#080D1A",
  bg2: "#0C1220",
  bg3: "#101828",
  border: "#131D2E",
  borderHi: "#1E2D42",
  saffron: "#FF6B00",
  saffronHi: "#FF8C35",
  gold: "#FFAA00",
  goldHi: "#FFD54F",
  goldChampagne: "#FFE082",
  goldSoftBg: "rgba(255,170,0,0.12)",
  goldSoftBorder: "rgba(255,170,0,0.38)",
  goldGlow: "rgba(255,170,0,0.16)",
  gradientGoldPremium: "linear-gradient(135deg,#FF6B00 0%,#FFAA00 48%,#FFD54F 100%)",
  shadowGold: "0 4px 24px rgba(255,170,0,0.2)",
  shadowGoldLg: "0 8px 40px rgba(255,107,0,0.22)",
  white: "#EDF2FF",
  muted: "#3D5068",
  mutedHi: "#6B829A",
  green: "#22C55E",
  red: "#EF4444",
  blue: "#38BDF8",
  /* Semantic UI (no hardcoded orange in components) */
  accentSoft: "rgba(255,107,0,0.12)",
  accentSoftMid: "rgba(255,107,0,0.1)",
  accentBorder: "rgba(255,107,0,0.35)",
  accentBorderHi: "rgba(255,107,0,0.45)",
  accentBorderLo: "rgba(255,107,0,0.25)",
  accentBorderNav: "rgba(255,107,0,0.3)",
  accentGlow: "rgba(255,107,0,0.07)",
  gradientBrand: "linear-gradient(135deg,#FF6B00,#FFAA00)",
  gradientRule: "linear-gradient(to right,#FF6B00,#FFAA00)",
  inkOnBrand: "#060A00",
  panelWarm: "linear-gradient(135deg,#1A0E00,#0A1228)",
  sheetBg: "rgba(3,6,13,0.98)",
  navScrim: "rgba(3,6,13,0.97)",
  jobCardHoverBg: "#0E1828",
  alertPanelBg: "linear-gradient(135deg,#0C1828,#1A0E00)",
  switchKnobShadow: "0 0 8px rgba(255,107,0,0.35)",
  accentChipActiveBg: "rgba(255,107,0,0.15)",
  accentChipActiveBorder: "rgba(255,107,0,0.5)",
  textBody: "#EDF2FF",
  textMuted: "#6B829A",
  textSubtle: "#6B829A",
  overlayScrim: "rgba(0,0,0,0.88)",
  shadowCard: "0 1px 2px rgba(0,0,0,0.28), 0 4px 16px rgba(0,0,0,0.38)",
  shadowCardHover: "0 10px 30px rgba(0,0,0,0.5)",
  mutedSoftBg: "rgba(107,130,154,0.14)",
  jobsGridBg: "color-mix(in srgb, var(--ds-bg0) 92%, transparent)",
  greenSoftBg: "rgba(34,197,94,0.12)",
  greenSoftBorder: "rgba(34,197,94,0.3)",
  redSoftBg: "rgba(239,68,68,0.12)",
  redSoftBorder: "rgba(239,68,68,0.3)",
  tableRowBorder: "rgba(19,29,46,0.6)",
  /** Isolated single-state map silhouette */
  mapStateFill: "#243348",
};

/** Light theme — clean white surfaces with saffron brand accents. */
const BW = {
  bg0: "#F4F6FA",
  bg1: "#FFFFFF",
  bg2: "#F8FAFC",
  bg3: "#EEF1F6",
  border: "#DDE3ED",
  borderHi: "#C5CDD9",
  saffron: "#E85D00",
  saffronHi: "#FF7A1A",
  gold: "#F59E0B",
  goldHi: "#FBBF24",
  goldChampagne: "#FDE68A",
  goldSoftBg: "rgba(245,158,11,0.1)",
  goldSoftBorder: "rgba(245,158,11,0.35)",
  goldGlow: "rgba(245,158,11,0.14)",
  gradientGoldPremium: "linear-gradient(135deg,#E85D00 0%,#F59E0B 48%,#FBBF24 100%)",
  shadowGold: "0 4px 20px rgba(245,158,11,0.18)",
  shadowGoldLg: "0 8px 32px rgba(232,93,0,0.16)",
  white: "#0F172A",
  muted: "#64748B",
  mutedHi: "#475569",
  green: "#15803D",
  red: "#DC2626",
  blue: "#0369A1",
  accentSoft: "rgba(232,93,0,0.08)",
  accentSoftMid: "rgba(232,93,0,0.06)",
  accentBorder: "rgba(232,93,0,0.28)",
  accentBorderHi: "rgba(232,93,0,0.42)",
  accentBorderLo: "rgba(232,93,0,0.18)",
  accentBorderNav: "rgba(232,93,0,0.26)",
  accentGlow: "rgba(232,93,0,0.07)",
  gradientBrand: "linear-gradient(135deg,#E85D00,#F59E0B)",
  gradientRule: "linear-gradient(to right,#E85D00,#F59E0B)",
  inkOnBrand: "#FFFFFF",
  panelWarm: "linear-gradient(135deg,#FFF7ED,#F8FAFC)",
  sheetBg: "rgba(255,255,255,0.97)",
  navScrim: "rgba(255,255,255,0.96)",
  jobCardHoverBg: "#FFF7ED",
  alertPanelBg: "linear-gradient(135deg,#FFF7ED,#F8FAFC)",
  switchKnobShadow: "0 1px 4px rgba(232,93,0,0.35)",
  accentChipActiveBg: "rgba(232,93,0,0.12)",
  accentChipActiveBorder: "rgba(232,93,0,0.45)",
  textBody: "#0F172A",
  textMuted: "#64748B",
  textSubtle: "#475569",
  overlayScrim: "rgba(15,23,42,0.65)",
  shadowCard: "0 1px 3px rgba(15,23,42,0.06), 0 4px 14px rgba(15,23,42,0.07)",
  shadowCardHover: "0 8px 24px rgba(232,93,0,0.12), 0 4px 12px rgba(15,23,42,0.08)",
  mutedSoftBg: "rgba(100,116,139,0.1)",
  jobsGridBg:
    "linear-gradient(180deg, var(--ds-bg2) 0%, color-mix(in srgb, var(--ds-bg0) 55%, transparent) 42%, transparent 100%)",
  greenSoftBg: "rgba(21,128,61,0.1)",
  greenSoftBorder: "rgba(21,128,61,0.3)",
  redSoftBg: "rgba(220,38,38,0.08)",
  redSoftBorder: "rgba(220,38,38,0.28)",
  tableRowBorder: "rgba(221,227,237,0.85)",
  /** Isolated single-state map silhouette */
  mapStateFill: "#DDE3ED",
};

/** Push current palette to `html` as `--ds-*` for CSS (see `src/styles/app.css`). */
export function syncDesignTokensToDom() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  for (const key of Object.keys(active)) {
    const val = active[key];
    if (val != null) root.style.setProperty(`--ds-${key}`, String(val));
  }
  root.style.setProperty("--ds-text-body", active.textBody || active.white);
  root.style.setProperty("--ds-text-muted", active.textMuted || active.muted);
  root.style.setProperty("--ds-text-subtle", active.textSubtle || active.mutedHi);
  root.style.setProperty("--ds-text", active.textBody || active.white);
  root.style.setProperty("--ds-ink", active.textBody || active.white);
  root.style.setProperty("--ds-accent", active.saffron);
}

/**
 * @param {"dark" | "bw"} mode — `bw` is the light theme (stored key unchanged for compatibility).
 */
export function applyColorMode(mode: "dark" | "bw") {
  active = mode === "bw" ? { ...BW } : { ...DARK };
  syncDesignTokensToDom();
}

export type DesignTokens = typeof DARK;

let active: DesignTokens = { ...DARK };

export const DS = new Proxy({} as DesignTokens, {
  get(_, prop: keyof DesignTokens) {
    return active[prop];
  },
});

if (typeof document !== "undefined") {
  syncDesignTokensToDom();
}
