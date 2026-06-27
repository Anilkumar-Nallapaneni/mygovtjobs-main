import { useEffect, useRef, useState, type RefObject } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import IndianLanguageSelector from "@/components/layout/IndianLanguageSelector";
import BrandLogo from "@/components/layout/BrandLogo";
import MobileNavDrawer from "@/components/layout/MobileNavDrawer";
import NavbarPreferenceRows from "@/components/layout/NavbarPreferenceRows";
import SearchMagnifyIcon from "@/components/layout/SearchMagnifyIcon";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { LATEST_NOTIFICATIONS_PATH, EXPLORE_HUB_PATH } from "@/utils/browseRoutes";
import { trackNavClick } from "@/lib/analytics";
import { dateTimeLocale } from "@/utils/formatLocale";

const NAV_KEYS = ["home", "explore", "latest", "results", "admitCard", "alert"] as const;

type ColorMode = "bw" | "dark";

type NavbarProps = {
  view: string;
  onNavigate?: (view: string) => void;
  search: string;
  setSearch: (value: string) => void;
  onSearch?: () => void;
  colorMode?: ColorMode;
  onColorModeChange?: (mode: ColorMode) => void;
};

function formatNavDate(d: Date, locale: string) {
  return d
    .toLocaleDateString(dateTimeLocale(locale), { day: "numeric", month: "short", year: "numeric" })
    .replace(/,/g, "")
    .trim();
}

function formatNavTime(d: Date, locale: string) {
  return d
    .toLocaleTimeString(dateTimeLocale(locale), { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true })
    .replace(/\s*a\.?m\.?/i, " am")
    .replace(/\s*p\.?m\.?/i, " pm")
    .toLowerCase();
}

const toViewId = (key: (typeof NAV_KEYS)[number]) => (key === "admitCard" ? "admit-card" : key);

const NAV_ROUTES: Partial<Record<(typeof NAV_KEYS)[number], string>> = {
  explore: EXPLORE_HUB_PATH,
  latest: LATEST_NOTIFICATIONS_PATH,
  results: "/results",
  admitCard: "/results/admit-card",
  alert: "/alerts",
};

function NavButtons({
  view,
  onNavigate,
  className = "",
}: {
  view: string;
  onNavigate?: (view: string) => void;
  className?: string;
}) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  return (
    <div className={className}>
      {NAV_KEYS.map((key) => {
        const id = toViewId(key);
        const active =
          (key === "explore" && pathname.startsWith(EXPLORE_HUB_PATH)) ||
          (key === "latest" && view === "latest-notifications") ||
          (key === "home" ? pathname === "/" : view === id);
        const route = NAV_ROUTES[key];
        if (route) {
          return (
            <Link
              key={key}
              to={route}
              className={`navbar__nav-btn${active ? " navbar__nav-btn--active" : ""}`}
              aria-current={active ? "page" : undefined}
              onClick={() => trackNavClick(key, route)}
            >
              {t(`nav.${key}`)}
            </Link>
          );
        }
        return (
          <button
            key={key}
            type="button"
            onClick={() => onNavigate?.(id)}
            className={`navbar__nav-btn${active ? " navbar__nav-btn--active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            {t(`nav.${key}`)}
          </button>
        );
      })}
    </div>
  );
}

function SearchForm({
  search,
  setSearch,
  onSearch,
  className = "",
  inputRef = null,
  mobile = false,
}: {
  search: string;
  setSearch: (value: string) => void;
  onSearch?: () => void;
  className?: string;
  inputRef?: RefObject<HTMLInputElement | null> | null;
  mobile?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <form
      role="search"
      className={`navbar__search ${className}`.trim()}
      onSubmit={(e) => {
        e.preventDefault();
        onSearch?.();
      }}
    >
      <div className="navbar__search-box">
        <SearchMagnifyIcon size={mobile ? 17 : 15} className="navbar__search-icon" />
        <input
          ref={inputRef ?? undefined}
          type={mobile ? "text" : "search"}
          name="q"
          inputMode="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("nav.searchPlaceholder")}
          aria-label={t("nav.searchPlaceholder")}
          className="navbar__search-input"
        />
      </div>
      <button type="submit" className="navbar__search-submit">
        {t("nav.search", { defaultValue: "Search" })}
      </button>
    </form>
  );
}

export default function Navbar({
  view,
  onNavigate,
  search,
  setSearch,
  onSearch,
  colorMode = "bw",
  onColorModeChange,
}: NavbarProps) {
  const { t, i18n } = useTranslation();
  const isLight = colorMode === "bw";
  const { canNativeInstall, canIosHint, installed, promptInstall } = usePwaInstall();
  const showInstall = !installed && (canNativeInstall || canIosHint);
  const [now, setNow] = useState(() => new Date());
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const mobileSearchRef = useRef<HTMLInputElement | null>(null);
  const isCompactNav = useMediaQuery("(max-width: 1024px)");

  useEffect(() => {
    if (isCompactNav) return undefined;
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [isCompactNav]);

  useEffect(() => {
    if (!searchOpen && !menuOpen) return;
    if (searchOpen) {
      const frame = requestAnimationFrame(() => mobileSearchRef.current?.focus());
      const onKey = (e: globalThis.KeyboardEvent) => {
        if (e.key === "Escape") {
          setSearchOpen(false);
          setMenuOpen(false);
        }
      };
      document.addEventListener("keydown", onKey);
      return () => {
        cancelAnimationFrame(frame);
        document.removeEventListener("keydown", onKey);
      };
    }
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [searchOpen, menuOpen]);

  const handleNavigate = (id: string) => {
    onNavigate?.(id);
    setSearchOpen(false);
    setMenuOpen(false);
  };

  const handleSearch = () => {
    onSearch?.();
    setSearchOpen(false);
  };

  return (
    <nav className={`navbar${searchOpen ? " navbar--search-open" : ""}`}>
      <div className="navbar__inner">
        <button
          type="button"
          className="navbar__brand"
          onClick={() => handleNavigate("home")}
          aria-label={t("brand.homeAria", {
            defaultValue: "govtjobs.me — home",
          })}
        >
          <BrandLogo height={58} className="navbar__logo" />
        </button>

        <NavButtons view={view} onNavigate={handleNavigate} className="navbar__nav navbar__nav--desktop" />

        <SearchForm search={search} setSearch={setSearch} onSearch={handleSearch} className="navbar__search--desktop" />

        <div className="navbar__clock" aria-live="polite" aria-atomic="true">
          <span className="navbar__clock-date">{formatNavDate(now, i18n.language)}</span>
          <span className="navbar__clock-time">{formatNavTime(now, i18n.language)}</span>
        </div>

        {!isCompactNav ? (
          <div className="navbar__utilities">
            <IndianLanguageSelector />

            <Link to="/account" className="navbar__account-link">
              {t("nav.login")}
            </Link>

            {showInstall ? (
              <button
                type="button"
                className="navbar__install-btn"
                onClick={() => void promptInstall()}
              >
                {t("pwa.install", { defaultValue: "Install" })}
              </button>
            ) : null}

            {typeof onColorModeChange === "function" && (
              <div className="navbar__theme" title="Theme">
                <span className="navbar__theme-label">{t("nav.light")}</span>
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
                <span className="navbar__theme-label">{t("nav.dark")}</span>
              </div>
            )}
          </div>
        ) : null}

        {isCompactNav ? (
          <div className="navbar__mobile-trailing">
            <button
              type="button"
              className="navbar__search-btn"
              aria-label={searchOpen ? t("nav.closeSearch", { defaultValue: "Close search" }) : t("nav.openSearch", { defaultValue: "Open search" })}
              aria-expanded={searchOpen}
              onClick={() => {
                setSearchOpen((v) => !v);
                setMenuOpen(false);
              }}
            >
              {searchOpen ? (
                <span aria-hidden>✕</span>
              ) : (
                <SearchMagnifyIcon size={17} />
              )}
            </button>

            <div className="navbar__mobile-header-prefs">
              <NavbarPreferenceRows colorMode={colorMode} onColorModeChange={onColorModeChange} />
            </div>

            <button
              type="button"
              className={`navbar__menu-btn${menuOpen ? " navbar__menu-btn--active" : ""}`}
              aria-label={menuOpen ? t("nav.closeMenu", { defaultValue: "Close menu" }) : t("nav.openMenu", { defaultValue: "Open menu" })}
              aria-expanded={menuOpen}
              onClick={() => {
                setMenuOpen((v) => !v);
                setSearchOpen(false);
              }}
            >
              <span className="navbar__menu-icon" aria-hidden>
                {menuOpen ? "✕" : "☰"}
              </span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="navbar__search-btn"
            aria-label={searchOpen ? t("nav.closeSearch", { defaultValue: "Close search" }) : t("nav.openSearch", { defaultValue: "Open search" })}
            aria-expanded={searchOpen}
            onClick={() => {
              setSearchOpen((v) => !v);
              setMenuOpen(false);
            }}
          >
            {searchOpen ? (
              <span aria-hidden>✕</span>
            ) : (
              <SearchMagnifyIcon size={17} />
            )}
          </button>
        )}
      </div>

      <div className="navbar__mobile-search" aria-hidden={!searchOpen}>
        <SearchForm
          search={search}
          setSearch={setSearch}
          onSearch={handleSearch}
          className="navbar__mobile-search-form"
          inputRef={mobileSearchRef}
          mobile
        />
      </div>

      {isCompactNav ? (
        <MobileNavDrawer
          open={menuOpen}
          view={view}
          onClose={() => setMenuOpen(false)}
          onNavigate={handleNavigate}
          showInstall={showInstall}
          onInstall={promptInstall}
        />
      ) : null}
    </nav>
  );
}
