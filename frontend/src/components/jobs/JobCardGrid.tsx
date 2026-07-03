import { useRef } from "react";
import type { CSSProperties } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import JobCard from "@/components/jobs/JobCard";
import { useMediaQuery } from "@/hooks/useMediaQuery";

/** Desktop card height + row gap — must match styles/app.css virtual grid */
const DESKTOP_CARD_HEIGHT = 252;
/** Initial mobile row estimate — fixed height avoids virtual-list remeasure jitter on touch */
const MOBILE_ROW_ESTIMATE = 320;
const ROW_GAP = 16;
const MOBILE_ROW_GAP = 12;

/**
 * Responsive virtualized grid inside `.home-jobs-section__panel`.
 * One column on mobile, two on wider screens. Scroll is confined to this panel.
 */
export default function JobCardGrid({ jobs, onJobClick, jobCardFilterProps = {}, animateList = false }) {
  const isMobile = useMediaQuery("(max-width: 640px)");
  const colsPerRow = isMobile ? 1 : 2;
  const rowGap = isMobile ? MOBILE_ROW_GAP : ROW_GAP;
  const desktopRowSize = DESKTOP_CARD_HEIGHT + rowGap;
  const mobileRowEstimate = MOBILE_ROW_ESTIMATE + rowGap;

  const parentRef = useRef<HTMLDivElement>(null);
  const rowCount = Math.ceil(jobs.length / colsPerRow) || 0;

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => (isMobile ? mobileRowEstimate : desktopRowSize),
    overscan: isMobile ? 2 : 4,
  });

  const totalHeight = virtualizer.getTotalSize();

  return (
    <div ref={parentRef} className="home-jobs-grid-virtual" role="list">
      <div className="home-jobs-grid-virtual__track" style={{ height: totalHeight }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const i0 = virtualRow.index * colsPerRow;
          const rowJobs = jobs.slice(i0, i0 + colsPerRow);
          const rowEnterIndex = Math.min(virtualRow.index, 8);
          const rowStyle: CSSProperties = {
            height: isMobile ? mobileRowEstimate : desktopRowSize,
            transform: `translateY(${virtualRow.start}px)`,
            ...(animateList ? { "--mgj-enter-index": rowEnterIndex } : {}),
          };
          return (
            <div
              key={`${colsPerRow}-${virtualRow.key}`}
              data-index={virtualRow.index}
              className={`home-jobs-grid-virtual__row${isMobile ? " home-jobs-grid-virtual__row--single" : ""}`}
              role="listitem"
              style={rowStyle}
            >
              {rowJobs.map((job, colIdx) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onClick={() => onJobClick(job)}
                  enterIndex={rowEnterIndex * colsPerRow + colIdx}
                  {...jobCardFilterProps}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
