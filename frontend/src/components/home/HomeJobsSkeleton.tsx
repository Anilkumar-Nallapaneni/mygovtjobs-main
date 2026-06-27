import JobCardSkeleton from '@/components/home/JobCardSkeleton'

type HomeJobsSkeletonProps = {
  count?: number
  className?: string
}

export default function HomeJobsSkeleton({ count = 4, className = '' }: HomeJobsSkeletonProps) {
  return (
    <div
      className={`home-jobs-section__panel home-jobs-skeleton${className ? ` ${className}` : ''}`}
      aria-busy="true"
      aria-label="Loading job listings"
    >
      <div className="home-jobs-grid home-jobs-grid--scroll home-jobs-skeleton__grid">
        {Array.from({ length: count }, (_, i) => (
          <JobCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
