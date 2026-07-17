/** @vitest-environment happy-dom */
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n from '@/i18n'
import LatestNotificationsTable from '@/components/home/LatestNotificationsTable'
import type { JobRecord } from '@/types/job'
import { parseLatestNotifQuery } from '@/utils/browseRoutes'
import { filterLatestNotificationJobs } from '@/utils/latestNotificationsFilters'

const officialJob: JobRecord = {
  id: '1',
  slug: 'ssc-cgl',
  title: 'SSC CGL 2026',
  dept: 'Staff Selection Commission',
  category: 'ssc',
  state: 'Uttar Pradesh',
  stateIds: ['up'],
  vacancies: 500,
  qual: 'Graduate',
  lastDate: '2030-08-01',
  status: 'live',
  applyUrl: 'https://ssc.gov.in/apply',
  detailUrl: 'https://ssc.gov.in/notification',
} as JobRecord

const medicalJob: JobRecord = {
  id: '2',
  slug: 'aiims-medical',
  title: 'AIIMS Medical Officer Recruitment 2026',
  dept: 'AIIMS',
  category: 'health',
  state: 'Delhi',
  stateIds: ['dl'],
  vacancies: 20,
  qual: 'MBBS',
  lastDate: '2030-09-01',
  status: 'live',
  applyUrl: 'https://www.aiims.edu/apply',
  detailUrl: 'https://www.aiims.edu/recruitment',
} as JobRecord

const defaultQuery = parseLatestNotifQuery('')

describe('LatestNotificationsTable filters', () => {
  it('renders state chips and filters without reload', () => {
    const onQueryChange = vi.fn()
    render(
      <I18nextProvider i18n={i18n}>
        <LatestNotificationsTable
          jobs={[officialJob, medicalJob]}
          query={defaultQuery}
          onQueryChange={onQueryChange}
        />
      </I18nextProvider>
    )

    const upChip = screen.getByRole('tab', { name: /UP/i })
    fireEvent.click(upChip)
    expect(onQueryChange).toHaveBeenCalledWith({ stateId: 'up' })
  })

  it('medical profession filter narrows jobs before table build', () => {
    const filtered = filterLatestNotificationJobs([officialJob, medicalJob], {
      professionSlug: 'medical',
    })
    expect(filtered).toHaveLength(1)
    expect(filtered[0].id).toBe('2')
    expect(filtered.some((j) => j.category === 'health')).toBe(true)
  })
})
