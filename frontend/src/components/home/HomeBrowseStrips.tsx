import { useCallback, useMemo, type MouseEvent } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import BrowseScrollRow from "@/components/layout/BrowseScrollRow";
import { ORG_INDEX } from "@/data/orgIndex";
import { QUALIFICATIONS } from "@/data/qualifications";
import { computeProfessionCounts, PROFESSIONS } from "@/data/professions";
import { trackHomepageRowClick } from "@/lib/analytics";
import {
  ORGANIZATIONS_INDEX_PATH,
  PROFESSIONS_INDEX_PATH,
  QUALIFICATIONS_INDEX_PATH,
  orgRoutePath,
  professionRoutePath,
  qualificationRoutePath,
} from "@/utils/browseRoutes";
import { computeEducationVacancySummary } from "@/utils/educationVacancySummary";
import { numberLocale } from "@/utils/formatLocale";
import type { JobRecord } from "@/types/job";

const ORG_CHIP_LIMIT = 16;
const PROFESSION_CHIP_LIMIT = 16;

type BrowseChip = {
  key: string;
  label: string;
  meta: string;
  href: string;
  chipClass: string;
  trackId: string;
  kind: "education" | "profession" | "board";
};

type BrowseStripCarouselProps = {
  title: string;
  viewAllHref: string;
  ariaLabel: string;
  trackClass: string;
  chips: BrowseChip[];
  onChipClick: (chip: BrowseChip, event: MouseEvent<HTMLAnchorElement>) => void;
};

function BrowseStripCarousel({
  title,
  viewAllHref,
  ariaLabel,
  trackClass,
  chips,
  onChipClick,
}: BrowseStripCarouselProps) {
  const { t } = useTranslation();

  return (
    <section className="home-browse-strip home-browse-strip--panel" aria-label={title}>
      <header className="home-browse-strip__head">
        <h3 className="home-browse-strip__title">{title}</h3>
        <Link to={viewAllHref} className="home-browse-strip__view-all">
          {t("home.examRows.viewAll", { defaultValue: "View all →" })}
        </Link>
      </header>
      {chips.length ? (
        <BrowseScrollRow className={`home-browse-strip__track ${trackClass}`.trim()} ariaLabel={ariaLabel}>
          {chips.map((chip) => (
            <Link
              key={chip.key}
              to={chip.href}
              className={`home-discovery-chip ${chip.chipClass}`}
              onClick={(event) => onChipClick(chip, event)}
            >
              <span className="home-discovery-chip__title">{chip.label}</span>
              <span className="home-discovery-chip__meta">{chip.meta}</span>
            </Link>
          ))}
        </BrowseScrollRow>
      ) : null}
    </section>
  );
}

type HomeBrowseStripsProps = {
  jobs?: JobRecord[];
  onQualificationSelect?: (slug: string) => void;
  onProfessionSelect?: (slug: string) => void;
  onOrgSelect?: (slug: string) => void;
};

export default function HomeBrowseStrips({
  jobs = [],
  onQualificationSelect,
  onProfessionSelect,
  onOrgSelect,
}: HomeBrowseStripsProps) {
  const { t, i18n } = useTranslation();
  const locale = numberLocale(i18n.language);

  const formatMeta = useCallback(
    (count: number, vacancies: number) =>
      vacancies > 0
        ? t("home.browseEducationPillMeta", {
            count: count.toLocaleString(locale),
            vacancies: vacancies.toLocaleString(locale),
            defaultValue: "{{count}} jobs · {{vacancies}} posts",
          })
        : t("home.browseEducationPillMetaJobs", {
            count: count.toLocaleString(locale),
            defaultValue: "{{count}} jobs",
          }),
    [locale, t]
  );

  const educationChips = useMemo(() => {
    const summary = computeEducationVacancySummary(jobs);
    const summaryByBucket = new Map(summary.map((row) => [row.id, row]));

    return QUALIFICATIONS.map((qual) => {
      const row = qual.bucketId ? summaryByBucket.get(qual.bucketId) : null;
      const count = row?.listings ?? 0;
      const vacancies = row?.vacancies ?? 0;
      const label = qual.title.replace(/\s+20\d{2}$/, "");

      return {
        key: qual.slug,
        label,
        meta: formatMeta(count, vacancies),
        href: qualificationRoutePath(qual.slug),
        chipClass: "home-discovery-chip--topic-edu",
        trackId: `qualification:${qual.slug}`,
        kind: "education" as const,
      };
    });
  }, [formatMeta, jobs]);

  const professionChips = useMemo(() => {
    const counts = computeProfessionCounts(jobs);

    return [...PROFESSIONS]
      .sort((a, b) => (counts[b.slug]?.listings ?? 0) - (counts[a.slug]?.listings ?? 0))
      .slice(0, PROFESSION_CHIP_LIMIT)
      .map((prof) => {
        const row = counts[prof.slug] ?? { listings: 0, vacancies: 0 };

        return {
          key: prof.slug,
          label: t(prof.labelKey, { defaultValue: prof.title ?? prof.slug }),
          meta: formatMeta(row.listings, row.vacancies),
          href: professionRoutePath(prof.slug),
          chipClass: "home-discovery-chip--topic-prof",
          trackId: `profession:${prof.slug}`,
          kind: "profession" as const,
        };
      });
  }, [formatMeta, jobs, t]);

  const orgChips = useMemo(
    () =>
      ORG_INDEX.slice(0, ORG_CHIP_LIMIT).map((org) => ({
        key: org.slug,
        label: org.dept,
        meta: t("organization.cardMeta", {
          count: org.count.toLocaleString(locale),
          vacancies: org.vacancies.toLocaleString(locale),
          defaultValue: "{{count}} notifications · {{vacancies}} posts",
        }),
        href: orgRoutePath(org.slug),
        chipClass: "home-discovery-chip--topic-org",
        trackId: `org:${org.slug}`,
        kind: "board" as const,
      })),
    [locale, t]
  );

  const handleChipClick = (chip: BrowseChip, event: MouseEvent<HTMLAnchorElement>) => {
    trackHomepageRowClick(chip.trackId);
    if (chip.kind === "education" && onQualificationSelect) {
      event.preventDefault();
      onQualificationSelect(chip.key);
      return;
    }
    if (chip.kind === "profession" && onProfessionSelect) {
      event.preventDefault();
      onProfessionSelect(chip.key);
      return;
    }
    if (chip.kind === "board" && onOrgSelect) {
      event.preventDefault();
      onOrgSelect(chip.key);
    }
  };

  const strips: Array<{ id: string; props: Omit<BrowseStripCarouselProps, "onChipClick"> }> = [
    {
      id: "education",
      props: {
        title: t("home.browseEducation", { defaultValue: "Browse by Education" }),
        viewAllHref: QUALIFICATIONS_INDEX_PATH,
        ariaLabel: t("qualification.indexTitle", { defaultValue: "Browse by education" }),
        trackClass: "home-browse-strip__track--edu",
        chips: educationChips,
      },
    },
    {
      id: "profession",
      props: {
        title: t("home.browseProfession", { defaultValue: "Browse by Profession" }),
        viewAllHref: PROFESSIONS_INDEX_PATH,
        ariaLabel: t("profession.indexTitle", { defaultValue: "Browse by profession" }),
        trackClass: "home-browse-strip__track--prof",
        chips: professionChips,
      },
    },
    {
      id: "board",
      props: {
        title: t("home.browseBoards", { defaultValue: "Browse by Recruitment Board" }),
        viewAllHref: ORGANIZATIONS_INDEX_PATH,
        ariaLabel: t("organization.indexTitle", { defaultValue: "Browse by recruitment board" }),
        trackClass: "home-browse-strip__track--org",
        chips: orgChips,
      },
    },
  ];

  return (
    <div className="home-browse-strips">
      {strips.map(({ id, props }) => (
        <BrowseStripCarousel key={id} {...props} onChipClick={handleChipClick} />
      ))}
    </div>
  );
}
