import type { JobRecord } from '@/types/job'
import type { StateData } from '@/types/MapTypes'
import type { CatalogStats } from '@/utils/liveJobsPipeline'
import type { computeJobAggregates } from '@/utils/jobAggregates'

type JobAggregates = ReturnType<typeof computeJobAggregates>

export type HomePageProps = {
  jobs?: JobRecord[]
  jobsLoading?: boolean
  liveCount?: number
  catalogStats?: CatalogStats | null
  onJobClick: (job: JobRecord) => void
  mapStateData: StateData[]
  dailySyncLine?: string
  stateCounts?: JobAggregates['stateCounts']
  categoryCounts?: JobAggregates['categoryCounts']
}
