import { useEffect, useRef, useState } from "react";
import HomeExamUpdatesRow from "@/components/home/HomeExamUpdatesRow";
import HomeBrowseStrips from "@/components/home/HomeBrowseStrips";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { JobRecord } from "@/types/job";

type HomeDiscoveryBlockProps = {
  jobs?: JobRecord[];
  jobsLoading?: boolean;
  onJobClick?: (job: JobRecord) => void;
  onQualificationSelect?: (slug: string) => void;
  onProfessionSelect?: (slug: string) => void;
  onOrgSelect?: (slug: string) => void;
};

/** Below-the-fold discovery rows — defer until near viewport or idle so map/hero paint first. */
export default function HomeDiscoveryBlock({
  jobs = [],
  jobsLoading = false,
  onJobClick,
  onQualificationSelect,
  onProfessionSelect,
  onOrgSelect,
}: HomeDiscoveryBlockProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const isMobileLayout = useMediaQuery("(max-width: 768px)");
  const [shouldMount, setShouldMount] = useState(Boolean(import.meta.env.VITEST));

  useEffect(() => {
    if (shouldMount) return;

    let cancelled = false;
    const mount = () => {
      if (!cancelled) setShouldMount(true);
    };

    const node = rootRef.current;
    if (!node) return;

    let clearIdle: (() => void) | undefined;

    if (isMobileLayout) {
      const timer = window.setTimeout(mount, 600);
      return () => {
        cancelled = true;
        window.clearTimeout(timer);
      };
    }

    if (typeof IntersectionObserver !== "undefined") {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) {
            mount();
            observer.disconnect();
          }
        },
        { rootMargin: "320px 0px" }
      );
      observer.observe(node);

      if (typeof requestIdleCallback === "function") {
        const idleId = requestIdleCallback(mount, { timeout: 3500 });
        clearIdle = () => cancelIdleCallback(idleId);
      } else {
        const timer = setTimeout(mount, 2500);
        clearIdle = () => clearTimeout(timer);
      }

      return () => {
        cancelled = true;
        observer.disconnect();
        clearIdle?.();
      };
    }

    mount();
  }, [shouldMount, isMobileLayout]);

  return (
    <div ref={rootRef} className="home-discovery-block">
      {shouldMount ? (
        <>
          <HomeExamUpdatesRow jobs={jobs} jobsLoading={jobsLoading} onJobClick={onJobClick} />
          <HomeBrowseStrips
            jobs={jobs}
            onQualificationSelect={onQualificationSelect}
            onProfessionSelect={onProfessionSelect}
            onOrgSelect={onOrgSelect}
          />
        </>
      ) : (
        <div className="home-discovery-block__placeholder" aria-hidden />
      )}
    </div>
  );
}
