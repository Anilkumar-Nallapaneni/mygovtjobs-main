import { useMemo } from "react";
import IndiaGlancePanel from "@/components/home/IndiaGlancePanel";
import { useCountUp } from "@/hooks/useCountUp";
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

function HeroStatValue({
  value,
  locale,
  enabled,
}: {
  value: number;
  locale: string;
  enabled: boolean;
}) {
  const animated = useCountUp(value, { enabled });
  return <>{animated.toLocaleString(locale)}</>;
}

export default function HomeHeroMarketing({
  totalListings: _totalListings,
  heroStats,
  heroStatFilter,
  locale,
  onHeroStatClick,
  statsPending = false,
  t,
}: HomeHeroMarketingProps) {
  const statsReady = !statsPending;
  const statItems = useMemo(
    () =>
      [
        {
          key: "vacancies",
          value: heroStats.posts,
          l: t("home.verifiedVacancyPosts", { count: heroStats.withPostCount }),
          i: "📋",
        },
        {
          key: "live",
          value: heroStats.live,
          l: t("home.openListingsHero"),
          i: "📰",
        },
        { key: "hotNew", value: heroStats.hotNew, l: t("home.hotNewTags"), i: "🔥" },
        {
          key: "states",
          value: heroStats.states,
          l: t("home.statesMap", { count: heroStats.stateListings }),
          i: "🗺️",
        },
      ] as const,
    [heroStats, t]
  );

  return (
    <>
      <div className="home-hero-marketing">
        <h1 className="home-hero-marketing__title">
          {t("home.heroHeading", {
            defaultValue: "Live government job notifications across India",
          })}
        </h1>
        <p className="home-hero-marketing__lede">
          {t("home.tagline", {
            defaultValue: "LIVE GOVERNMENT JOB NOTIFICATIONS · INDIA",
          })}
        </p>
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
          {statItems.map(({ key, value, l, i }) => {
            const on = heroStatFilter === key;
            return (
              <button
                key={key}
                type="button"
                className={`home-hero-stat${on ? " home-hero-stat--active" : ""}${statsReady ? " home-hero-stat--animate" : ""}`}
                aria-pressed={on}
                onClick={() => onHeroStatClick(key as HeroStatFilterKey)}
                title={on ? t("home.clearFilter") : l}
              >
                <div className="home-hero-stat__icon">{i}</div>
                <div className="home-hero-stat__value">
                  <HeroStatValue value={value} locale={locale} enabled={statsReady} />
                </div>
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
