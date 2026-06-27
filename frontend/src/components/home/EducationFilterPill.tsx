type EducationFilterPillProps = {
  filterKey: string;
  active: boolean;
  counts: { listings: number; vacancies: number };
  locale: string;
  onClick: () => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
  compact?: boolean;
};

export default function EducationFilterPill({
  filterKey,
  active,
  counts,
  locale,
  onClick,
  t,
  compact = false,
}: EducationFilterPillProps) {
  const meta =
    counts.vacancies > 0
      ? t("home.browseEducationPillMeta", {
          count: counts.listings.toLocaleString(locale),
          vacancies: counts.vacancies.toLocaleString(locale),
          defaultValue: "{{count}} jobs · {{vacancies}} posts",
        })
      : t("home.browseEducationPillMetaJobs", {
          count: counts.listings.toLocaleString(locale),
          defaultValue: "{{count}} jobs",
        });

  return (
    <button
      type="button"
      onClick={onClick}
      title={meta}
      className={`home-edu-pill${active ? " home-edu-pill--active" : ""}${compact ? " home-edu-pill--compact" : ""}`}
    >
      <span className="home-edu-pill__title">{t(`quickFilter.${filterKey}`)}</span>
      <span className="home-edu-pill__meta">{meta}</span>
    </button>
  );
}
