import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import BrowseScrollRow from "@/components/layout/BrowseScrollRow";
import { useOfficialFeed } from "@/hooks/useOfficialFeed";
import type { OfficialFeedItem } from "@/lib/officialFeed";
import { buildEmploymentNewsItems, type EmploymentNewsItem } from "@/utils/employmentNewsItems";
import { numberLocale } from "@/utils/formatLocale";
import type { JobRecord } from "@/types/job";

/** Readable crawl speed — slightly faster so long tickers never look frozen. */
const MARQUEE_PX_PER_SEC = 48;
/** Cap half-cycle so a full loop stays under ~2 minutes even with 48 long headlines. */
const MAX_MARQUEE_HALF_CYCLE_SEC = 55;
const MIN_MARQUEE_HALF_CYCLE_SEC = 18;

type EmploymentNewsBarProps = {
  jobs?: JobRecord[];
  liveCount?: number;
};

function NewsScrollItem({ item }: { item: EmploymentNewsItem }) {
  const content = (
    <>
      <span className="employment-news-bar__headline">{item.title}</span>
      {item.board ? <span className="employment-news-bar__board">{item.board}</span> : null}
    </>
  );

  if (item.external && item.href !== "#") {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className="employment-news-bar__item"
      >
        {content}
      </a>
    );
  }

  if (!item.external && item.href !== "#") {
    return (
      <Link to={item.href} className="employment-news-bar__item">
        {content}
      </Link>
    );
  }

  return <span className="employment-news-bar__item">{content}</span>;
}

function newsContentKey(items: EmploymentNewsItem[]): string {
  if (!items.length) return "0";
  return `${items.length}:${items[0]?.id ?? ""}:${items[items.length - 1]?.id ?? ""}`;
}

export default function EmploymentNewsBar({
  jobs = [],
  liveCount = 0,
}: EmploymentNewsBarProps) {
  const { t, i18n } = useTranslation();
  const locale = numberLocale(i18n.language);
  const trackRef = useRef<HTMLDivElement>(null);
  const [marqueeReady, setMarqueeReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [feedEnabled, setFeedEnabled] = useState(false);

  useEffect(() => {
    const enable = () => setFeedEnabled(true);
    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(enable, { timeout: 2500 });
      return () => cancelIdleCallback(id);
    }
    const timer = setTimeout(enable, 1200);
    return () => clearTimeout(timer);
  }, []);

  const { items: feedItems, loading: feedLoading } = useOfficialFeed(feedEnabled);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const newsItems = useMemo(
    () => buildEmploymentNewsItems(jobs, feedItems as OfficialFeedItem[]),
    [jobs, feedItems]
  );

  const itemsKey = useMemo(() => newsContentKey(newsItems), [newsItems]);

  const marqueeItems = useMemo(
    () => (newsItems.length > 1 ? [...newsItems, ...newsItems] : newsItems),
    [newsItems]
  );

  const trackedCount = newsItems.length > 0 ? newsItems.length : liveCount > 0 ? liveCount : jobs.length;
  const useManualNewsScroll = reducedMotion || newsItems.length <= 1;

  useEffect(() => {
    const el = trackRef.current;
    if (!el || reducedMotion || newsItems.length < 2) {
      setMarqueeReady(false);
      return;
    }

    let cancelled = false;
    let raf1 = 0;
    let raf2 = 0;

    const syncDuration = () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          if (cancelled) return;
          const halfWidth = el.scrollWidth / 2;
          if (halfWidth <= 0) return;
          const natural = halfWidth / MARQUEE_PX_PER_SEC;
          const durationSec = Math.min(
            MAX_MARQUEE_HALF_CYCLE_SEC,
            Math.max(natural, MIN_MARQUEE_HALF_CYCLE_SEC)
          );
          el.style.setProperty("--employment-news-duration", `${durationSec}s`);
          // Only turn animation on — never toggle off on resize/job refresh (that restarts at 0).
          setMarqueeReady(true);
        });
      });
    };

    syncDuration();
    const observer = window.ResizeObserver ? new ResizeObserver(syncDuration) : null;
    observer?.observe(el);
    window.addEventListener("resize", syncDuration);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      observer?.disconnect();
      window.removeEventListener("resize", syncDuration);
    };
  }, [itemsKey, reducedMotion, newsItems.length]);

  if (!newsItems.length && !feedLoading) return null;

  return (
    <aside
      className="employment-news-bar"
      aria-label={t("home.employmentNews.aria", { defaultValue: "Daily employment news update" })}
    >
      <div className="employment-news-bar__inner">
        <div className="employment-news-bar__badge">
          <span className="employment-news-bar__dot" aria-hidden="true" />
          <span className="employment-news-bar__label">
            {t("home.employmentNews.title", { defaultValue: "Daily employment news update" })}
          </span>
          <span className="employment-news-bar__count">
            {t("home.employmentNews.liveCount", {
              count: trackedCount.toLocaleString(locale),
              defaultValue: "{{count}} live",
            })}
          </span>
        </div>

      {newsItems.length ? (
        useManualNewsScroll ? (
          <BrowseScrollRow
            className="employment-news-bar__manual-track"
            ariaLabel={t("home.employmentNews.scrollAria", {
              defaultValue: "Latest employment notifications",
            })}
          >
            {newsItems.map((item) => (
              <NewsScrollItem key={item.id} item={item} />
            ))}
          </BrowseScrollRow>
        ) : (
          <div
            className="employment-news-bar__viewport"
            aria-label={t("home.employmentNews.scrollAria", {
              defaultValue: "Latest employment notifications",
            })}
          >
            <div
              ref={trackRef}
              className={`employment-news-bar__track${marqueeReady ? " employment-news-bar__track--ready" : ""}`}
            >
              {marqueeItems.map((item, index) => (
                <NewsScrollItem key={`${item.id}-${index}`} item={item} />
              ))}
            </div>
          </div>
        )
      ) : (
        <span className="employment-news-bar__loading">
          {t("ticker.live", { defaultValue: "LIVE" })}…
        </span>
      )}
      </div>
    </aside>
  );
}
