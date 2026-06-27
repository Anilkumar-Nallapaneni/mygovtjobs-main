import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LATEST_NOTIFICATIONS_PATH, EXPLORE_HUB_PATH } from "@/utils/browseRoutes";
import { trackNavClick } from "@/lib/analytics";

const NAV_KEYS = ["home", "explore", "latest", "results", "admitCard", "alert"] as const;

const NAV_ROUTES: Partial<Record<(typeof NAV_KEYS)[number], string>> = {
  explore: EXPLORE_HUB_PATH,
  latest: LATEST_NOTIFICATIONS_PATH,
  results: "/results",
  admitCard: "/results/admit-card",
  alert: "/alerts",
};

const toViewId = (key: (typeof NAV_KEYS)[number]) => (key === "admitCard" ? "admit-card" : key);

type MobileNavDrawerProps = {
  open: boolean;
  view: string;
  onClose: () => void;
  onNavigate?: (view: string) => void;
  showInstall?: boolean;
  onInstall?: () => void;
};

export default function MobileNavDrawer({
  open,
  view,
  onClose,
  onNavigate,
  showInstall = false,
  onInstall,
}: MobileNavDrawerProps) {
  const { t } = useTranslation();
  const { pathname } = useLocation();

  if (!open) return null;

  return (
    <div className="mobile-nav-drawer" role="dialog" aria-modal="true" aria-label={t("nav.mobilePrimary", { defaultValue: "Primary navigation" })}>
      <button type="button" className="mobile-nav-drawer__backdrop" aria-label={t("nav.closeMenu", { defaultValue: "Close menu" })} onClick={onClose} />
      <div className="mobile-nav-drawer__panel">
        <div className="mobile-nav-drawer__head">
          <h2 className="mobile-nav-drawer__title">{t("nav.menu", { defaultValue: "Menu" })}</h2>
          <button type="button" className="mobile-nav-drawer__close" onClick={onClose}>
            {t("nav.close", { defaultValue: "Close" })}
          </button>
        </div>

        <div className="mobile-nav-drawer__links">
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
                  className={`mobile-nav-drawer__link${active ? " mobile-nav-drawer__link--active" : ""}`}
                  aria-current={active ? "page" : undefined}
                  onClick={() => {
                    trackNavClick(key, route);
                    onClose();
                  }}
                >
                  {t(`nav.${key}`)}
                </Link>
              );
            }
            return (
              <button
                key={key}
                type="button"
                className={`mobile-nav-drawer__link${active ? " mobile-nav-drawer__link--active" : ""}`}
                aria-current={active ? "page" : undefined}
                onClick={() => {
                  onNavigate?.(id);
                  onClose();
                }}
              >
                {t(`nav.${key}`)}
              </button>
            );
          })}
          <Link to="/account" className="mobile-nav-drawer__link" onClick={onClose}>
            {t("nav.login")}
          </Link>
        </div>

        {showInstall ? (
          <div className="mobile-nav-drawer__utilities">
            <button type="button" className="mobile-nav-drawer__install" onClick={() => void onInstall?.()}>
              {t("pwa.install", { defaultValue: "Install app" })}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
