import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import Footer from "@/components/layout/Footer";
import { applyBrowseSeo } from "@/utils/browseSeo";

export type StaticPageSection = {
  heading: string;
  paragraphs: string[];
};

type StaticPageProps = {
  title: string;
  description: string;
  path: string;
  sections: StaticPageSection[];
  onFooterLink?: (target: Record<string, unknown>) => void;
};

export default function StaticPage({ title, description, path, sections, onFooterLink }: StaticPageProps) {
  const { t } = useTranslation();

  useEffect(() => {
    return applyBrowseSeo(path);
  }, [path]);

  useEffect(() => {
    document.title = `${title} | My Govt Jobs`;
    const el = document.head.querySelector('meta[name="description"]');
    if (el) el.setAttribute("content", description);
  }, [title, description]);

  return (
    <div className="static-page">
      <header className="static-page__header">
        <Link to="/" className="static-page__back">
          {t("jobDetail.back", { defaultValue: "Back" })}
        </Link>
        <h1 className="static-page__title">{title}</h1>
        <p className="static-page__lede">{description}</p>
      </header>

      <div className="static-page__body">
        {sections.map((section) => (
          <section key={section.heading} className="static-page__section">
            <h2>{section.heading}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 48)}>{paragraph}</p>
            ))}
          </section>
        ))}
      </div>

      <Footer onFooterLink={onFooterLink} />
    </div>
  );
}
