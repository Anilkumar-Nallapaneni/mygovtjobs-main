type JobCardSkeletonProps = {
  className?: string
}

export default function JobCardSkeleton({ className = '' }: JobCardSkeletonProps) {
  return (
    <div
      className={`job-card job-card-skeleton${className ? ` ${className}` : ''}`}
      aria-hidden
    >
      <div className="job-card-skeleton__inner">
        <div className="job-card-skeleton__line job-card-skeleton__line--title skeleton-shimmer" />
        <div className="job-card-skeleton__line job-card-skeleton__line--subtitle skeleton-shimmer" />
        <div className="job-card-skeleton__stats">
          <div className="job-card-skeleton__stat skeleton-shimmer" />
          <div className="job-card-skeleton__stat skeleton-shimmer" />
          <div className="job-card-skeleton__stat skeleton-shimmer" />
        </div>
        <div className="job-card-skeleton__footer">
          <div className="job-card-skeleton__chip skeleton-shimmer" />
          <div className="job-card-skeleton__chip skeleton-shimmer" />
        </div>
      </div>
    </div>
  )
}
