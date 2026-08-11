import { useEffect, useState } from 'react'
import {
  fetchEventsByType,
  fetchUpcomingCalendar,
  type RecruitmentEventType,
  type RecruitmentWithEvents,
} from '@/lib/recruitmentEventsApi'

export function useRecruitmentEventsByType(eventType: RecruitmentEventType, limit = 100) {
  const [rows, setRows] = useState<RecruitmentWithEvents[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void fetchEventsByType(eventType, limit).then((data) => {
      if (cancelled) return
      setRows(data)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [eventType, limit])

  return { rows, loading }
}

export function useUpcomingRecruitmentCalendar(limit = 60) {
  const [rows, setRows] = useState<RecruitmentWithEvents[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void fetchUpcomingCalendar(limit).then((data) => {
      if (cancelled) return
      setRows(data)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [limit])

  return { rows, loading }
}
