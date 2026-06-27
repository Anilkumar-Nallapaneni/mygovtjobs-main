import IndiaGlancePanel from "@/components/home/IndiaGlancePanel";
import type { HeroStatFilterKey } from "@/utils/homePageFilters";

type HomeHeroMarketingProps = {
  totalListings: number;
  heroStats: {
    posts: number;
    withPostCount: number;
    hotNew: number;
    states: number;
    stateListings: number;
    live: number;
  };
  heroStatFilter: HeroStatFilterKey | null;
  locale: string;
  onHeroStatClick: (key: HeroStatFilterKey) => void;
  statsPending?: boolean;
  t: (key: string, opts?: Record<string, unknown>) => string;
};

export default function HomeHeroMarketing({
  totalListings: _totalListings,
  heroStats,
  heroStatFilter,
  locale,
  onHeroStatClick,
  statsPending = false,
  t,
}: HomeHeroMarketingProps) {
  return (
    <>
      <div className="home-hero-marketing">
        <div className="home-first-visit home-first-visit--lead">
          <strong>{t("home.firstVisitTitle", { defaultValue: "New here?" })}</strong>
          <span>
            {t("home.firstVisitText", {
              defaultValue:
                "Start with the map, sector cards, or education filters. Every listing links back to an official notification.",
            })}
          </span>
        </div>
        <div className={`home-hero-stats${statsPending ? " home-hero-stats--pending" : ""}`} aria-busy={statsPending || undefined}>
          {[
            {
              key: "vacancies",
              v: heroStats.posts.toLocaleString(locale),
              l: t("home.verifiedVacancyPosts", { count: heroStats.withPostCount }),
              i: "📋",
            },
            {
              key: "live",
              v: heroStats.live.toLocaleString(locale),
              l: t("home.openListingsHero"),
              i: "📰",
            },
            { key: "hotNew", v: heroStats.hotNew.toLocaleString(locale), l: t("home.hotNewTags"), i: "🔥" },
            {
              key: "states",
              v: heroStats.states.toLocaleString(locale),
              l: t("home.statesMap", { count: heroStats.stateListings }),
              i: "🗺️",
            },
          ].map(({ key, v, l, i }) => {
            const on = heroStatFilter === key;
            return (
              <button
                key={key}
                type="button"
                className={`home-hero-stat${on ? " home-hero-stat--active" : ""}`}
                aria-pressed={on}
                onClick={() => onHeroStatClick(key as HeroStatFilterKey)}
                title={on ? t("home.clearFilter") : l}
              >
                <div className="home-hero-stat__icon">{i}</div>
                <div className="home-hero-stat__value">{v}</div>
                <div className="home-hero-stat__label">{l}</div>
              </button>
            );
          })}
        </div>
        <div className="home-hero-panels">
          <IndiaGlancePanel />
        </div>
      </div>
    </>
  );
}
