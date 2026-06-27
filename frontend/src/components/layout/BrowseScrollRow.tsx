import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

type BrowseScrollRowProps = {
  className?: string
  ariaLabel?: string
  children: ReactNode
}

export default function BrowseScrollRow({ className = "", ariaLabel, children }: BrowseScrollRowProps) {
  const { t } = useTranslation();
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    const overflow = maxScroll > 2;
    setHasOverflow((prev) => (prev === overflow ? prev : overflow));
    const nextLeft = overflow && el.scrollLeft > 2;
    const nextRight = overflow && el.scrollLeft < maxScroll - 2;
    setCanScrollLeft((prev) => (prev === nextLeft ? prev : nextLeft));
    setCanScrollRight((prev) => (prev === nextRight ? prev : nextRight));
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return undefined;
    let frame = 0;
    const scheduleUpdate = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateScrollState);
    };
    scheduleUpdate();
    el.addEventListener("scroll", scheduleUpdate, { passive: true });
    const observer = new ResizeObserver(scheduleUpdate);
    observer.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("scroll", scheduleUpdate);
      observer.disconnect();
    };
  }, [updateScrollState]);

  const scrollBy = (direction: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * Math.max(160, el.clientWidth * 0.6), behavior: "smooth" });
  };

  return (
    <div className={`browse-scroll-row${hasOverflow ? " browse-scroll-row--overflow" : ""}`}>
      <div
        ref={trackRef}
        className={`browse-scroll-row__track ${className}`.trim()}
        aria-label={ariaLabel}
      >
        {children}
      </div>
      {hasOverflow && (
        <div className="browse-scroll-row__controls" aria-hidden={!hasOverflow}>
          <button
            type="button"
            className="browse-scroll-row__btn browse-scroll-row__btn--prev"
            aria-label={t("a11y.scrollLeft", { defaultValue: "Scroll left" })}
            disabled={!canScrollLeft}
            onClick={() => scrollBy(-1)}
          >
            ‹
          </button>
          <button
            type="button"
            className="browse-scroll-row__btn browse-scroll-row__btn--next"
            aria-label={t("a11y.scrollRight", { defaultValue: "Scroll right" })}
            disabled={!canScrollRight}
            onClick={() => scrollBy(1)}
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
