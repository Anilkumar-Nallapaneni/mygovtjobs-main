import { useEffect, useState } from 'react'
import type { JobRecord } from '@/types/job'
import { jobNeedsNormalization, normalizeJobRecordToEnglish } from '@/utils/jobContentTranslate'

/**
 * Job listings and detail body are always shown in English (canonical original).
 * Regional-script PDF text is normalized to English when needed.
 */
export function useTranslatedJob(job: JobRecord | null | undefined) {
  const [displayJob, setDisplayJob] = useState<JobRecord | null | undefined>(job)
  const [normalizing, setNormalizing] = useState(false)

  useEffect(() => {
    if (!job) {
      setDisplayJob(null)
      setNormalizing(false)
      return
    }

    if (!jobNeedsNormalization(job)) {
      setDisplayJob(job)
      setNormalizing(false)
      return
    }

    let cancelled = false
    setNormalizing(true)
    setDisplayJob(job)

    normalizeJobRecordToEnglish(job)
      .then((normalized) => {
        if (!cancelled) setDisplayJob(normalized)
      })
      .finally(() => {
        if (!cancelled) setNormalizing(false)
      })

    return () => {
      cancelled = true
    }
  }, [job])

  return {
    job: displayJob ?? job,
    translating: normalizing,
    language: 'en',
  }
}
