import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import BrandLogo from "@/components/layout/BrandLogo";
import BuildStamp from "@/components/layout/BuildStamp";
import TrackedLink from "@/components/TrackedLink";
import { STATES } from "@/data/states";
import { SITE_LINKS, SOCIAL_LINKS } from "@/data/siteLinks";
import {
  boardRoutePath,
  EXAM_CALENDAR_PATH,
  LATEST_NOTIFICATIONS_PATH,
} from "@/utils/browseRoutes";

import type { FooterLinkTarget } from "@/hooks/browseStateTypes";

type FooterProps = {
  onFooterLink?: (target: FooterLinkTarget) => void;
};

const FOOTER_LINK_KEYS = {
  quickLinks: ["latestJobs", "results", "admitCards", "syllabus", "examCalendar", "answerKeys"],
  categories: ["upsc", "ssc", "railways", "banking", "defence", "police", "teaching"],
  topStates: ["up", "br", "rj", "mh", "mp", "jh"],
  company: ["about", "advertise", "privacy", "terms", "contact", "disclaimerLink", "sitemap"],
};

const TOP_STATE_LABELS = Object.fromEntries(STATES.map((s) => [s.id, s.n]));

/** Footer links map to dedicated pages for better SEO, analytics, and time-on-site. */
const FOOTER_LINK_HREFS: Record<string, string> = {
  latestJobs: LATEST_NOTIFICATIONS_PATH,
  results: "/results",
  admitCards: "/results/admit-card",
  syllabus: "/results/syllabus",
  examCalendar: EXAM_CALENDAR_PATH,
  answerKeys: "/results/answer-key",
  upsc: boardRoutePath("upsc"),
  ssc: boardRoutePath("ssc"),
  railways: boardRoutePath("railways"),
  banking: boardRoutePath("banking"),
  defence: boardRoutePath("defence"),
  police: boardRoutePath("police"),
  teaching: boardRoutePath("teaching"),
  up: "/state/up",
  br: "/state/br",
  rj: "/state/rj",
  mh: "/state/mh",
  mp: "/state/mp",
  jh: "/state/jh",
  about: SITE_LINKS.about,
  advertise: SITE_LINKS.advertise,
  privacy: SITE_LINKS.privacy,
  terms: SITE_LINKS.terms,
  contact: SITE_LINKS.contact,
  disclaimerLink: SITE_LINKS.disclaimer,
  sitemap: "/sitemap",
};

export default function Footer({ onFooterLink }: FooterProps) {
  void onFooterLink;
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  const columns = [
    { heading: t("footer.quickLinks"), keys: FOOTER_LINK_KEYS.quickLinks, ns: "footer" },
    { heading: t("footer.categories"), keys: FOOTER_LINK_KEYS.categories, ns: "category" },
    { heading: t("footer.topStates"), keys: FOOTER_LINK_KEYS.topStates, ns: "state" },
    { heading: t("footer.company"), keys: FOOTER_LINK_KEYS.company, ns: "footer" },
  ];

  const renderFooterLink = (key: string, label: string) => {
    const href = FOOTER_LINK_HREFS[key];
    if (!href) return null;
    return (
      <TrackedLink
        to={href}
        trackId={`footer-${key}`}
        trackSource="footer"
        trackLabel={label}
        className="footer__link"
      >
        {label}
      </TrackedLink>
    );
  };

  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__grid">
          <div id="footer-about">
            <div className="footer__brand-row">
              <BrandLogo height={68} className="footer__logo" />
            </div>
            <p className="footer__blurb">{t("footer.blurb")}</p>
            <div id="footer-disclaimer" className="footer__disclaimer">
              ⚠️ {t("footer.disclaimer")}{" "}
              <Link to={SITE_LINKS.disclaimer} className="footer__inline-link">
                {t("footer.disclaimerLink")}
              </Link>
            </div>
          </div>
          {columns.map(({ heading, keys, ns }) => (
            <div key={heading}>
              <h4 className="footer__col-heading">{heading}</h4>
              <ul className="footer__links">
                {keys.map((key) => (
                  <li key={key}>
                    {renderFooterLink(key, ns === "state" ? TOP_STATE_LABELS[key] : t(`${ns}.${key}`))}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="footer__bottom">
          <span className="footer__copyright">{t("footer.copyright", { year })}</span>
          <BuildStamp />
          <div className="footer__social">
            {SOCIAL_LINKS.map(({ id, label, href }) => (
              <a
                key={id}
                href={href}
                className="footer__link footer__social-link"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                data-track={`social-${id}`}
                data-track-source="footer"
                data-track-label={label}
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
