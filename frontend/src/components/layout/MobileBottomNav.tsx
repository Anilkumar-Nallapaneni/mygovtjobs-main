import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { LATEST_NOTIFICATIONS_PATH, EXPLORE_HUB_PATH } from "@/utils/browseRoutes";
import { trackNavClick } from "@/lib/analytics";

const TABS = [
  {
    key: "home",
    href: "/",
    labelKey: "nav.home",
    icon: "⌂",
    isActive: (path: string) => path === "/" || path === "",
  },
  {
    key: "explore",
    href: EXPLORE_HUB_PATH,
    labelKey: "nav.explore",
    icon: "🧭",
    isActive: (path: string) => path.startsWith(EXPLORE_HUB_PATH),
  },
  {
    key: "latest",
    href: LATEST_NOTIFICATIONS_PATH,
    labelKey: "nav.latest",
    icon: "📰",
    isActive: (path: string) => path.startsWith(LATEST_NOTIFICATIONS_PATH),
  },
  {
    key: "results",
    href: "/results",
    labelKey: "nav.results",
    icon: "📊",
    isActive: (path: string) =>
      path === "/results" ||
      (path.startsWith("/results/") &&
        !path.startsWith("/results/admit-card") &&
        path !== "/results/topics"),
  },
  {
    key: "admit",
    href: "/results/admit-card",
    labelKey: "nav.admitCard",
    shortLabelKey: "nav.admitCardShort",
    icon: "🎫",
    isActive: (path: string) => path.startsWith("/results/admit-card"),
  },
] as const;

export default function MobileBottomNav() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const path = pathname.replace(/\/+$/, "") || "/";

  return (
    <nav
      className="mobile-bottom-nav"
      aria-label={t("nav.mobileBottom", { defaultValue: "Main navigation" })}
    >
      {TABS.map((tab) => {
        const active = tab.isActive(path);
        return (
          <Link
            key={tab.key}
            to={tab.href}
            className={`mobile-bottom-nav__tab${active ? " mobile-bottom-nav__tab--active" : ""}`}
            aria-current={active ? "page" : undefined}
            onClick={() => trackNavClick(tab.key, tab.href)}
          >
            <span className="mobile-bottom-nav__icon" aria-hidden>
              {tab.icon}
            </span>
            <span className="mobile-bottom-nav__label mobile-bottom-nav__label--full">
              {t(tab.labelKey)}
            </span>
            {"shortLabelKey" in tab ? (
              <span className="mobile-bottom-nav__label mobile-bottom-nav__label--short">
                {t(tab.shortLabelKey, { defaultValue: "Admit" })}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
