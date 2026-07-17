import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import Footer from "@/components/layout/Footer";
import { pageTitle } from "@/data/siteMeta";
import type { FooterLinkTarget } from "@/hooks/browseStateTypes";
import { applyBrowseSeo } from "@/utils/browseSeo";
import {
  EXPLORE_HUB_PATH,
  LATEST_NOTIFICATIONS_PATH,
  STATES_INDEX_PATH,
} from "@/utils/browseRoutes";

type NotFoundPageProps = {
  onFooterLink?: (target: FooterLinkTarget) => void;
};

export default function NotFoundPage({ onFooterLink }: NotFoundPageProps) {
  const { t } = useTranslation();
  const title = t("notFound.title", { defaultValue: "Page not found" });
  const description = t("notFound.description", {
    defaultValue: "That link does not match a page on this site. Try home, latest notifications, or explore.",
  });

  useEffect(() => {
    return applyBrowseSeo("/404");
  }, []);

  useEffect(() => {
    document.title = pageTitle(title);
    const el = document.head.querySelector('meta[name="description"]');
    if (el) el.setAttribute("content", description);
    // Explicit noindex even if browseSeo path mapping misses
    let robots = document.head.querySelector('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement("meta");
      robots.setAttribute("name", "robots");
      document.head.appendChild(robots);
    }
    robots.setAttribute("content", "noindex, nofollow");
  }, [title, description]);

  return (
    <div className="static-page not-found-page">
      <header className="static-page__header">
        <p className="not-found-page__code" aria-hidden="true">
          404
        </p>
        <h1 className="static-page__title">{title}</h1>
        <p className="static-page__lede">{description}</p>
      </header>

      <div className="static-page__body not-found-page__links">
        <p>
          <Link to="/">{t("nav.home", { defaultValue: "Home" })}</Link>
          {" · "}
          <Link to={LATEST_NOTIFICATIONS_PATH}>
            {t("nav.latest", { defaultValue: "Latest" })}
          </Link>
          {" · "}
          <Link to={EXPLORE_HUB_PATH}>{t("nav.explore", { defaultValue: "Explore" })}</Link>
          {" · "}
          <Link to={STATES_INDEX_PATH}>
            {t("browse.statesIndex", { defaultValue: "States" })}
          </Link>
        </p>
      </div>

      <Footer onFooterLink={onFooterLink} />
    </div>
  );
}
