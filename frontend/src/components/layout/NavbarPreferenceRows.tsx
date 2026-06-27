import IndianLanguageSelector from "@/components/layout/IndianLanguageSelector";

type ColorMode = "bw" | "dark";

type NavbarPreferenceRowsProps = {
  colorMode?: ColorMode;
  onColorModeChange?: (mode: ColorMode) => void;
};

export default function NavbarPreferenceRows({
  colorMode = "bw",
  onColorModeChange,
}: NavbarPreferenceRowsProps) {
  const isLight = colorMode === "bw";

  return (
    <div className="navbar__mobile-header-prefs-grid">
      <div className="navbar__preference-row">
        <IndianLanguageSelector />
      </div>
      {typeof onColorModeChange === "function" ? (
        <div className="navbar__preference-row">
          <div className="navbar__theme navbar__theme--compact" title="Theme">
            <button
              type="button"
              role="switch"
              aria-checked={!isLight}
              aria-label={isLight ? "Switch to dark theme" : "Switch to light theme"}
              onClick={() => onColorModeChange(isLight ? "dark" : "bw")}
              className="navbar__theme-switch"
            >
              <span className={`navbar__theme-knob${isLight ? "" : " navbar__theme-knob--dark"}`} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
