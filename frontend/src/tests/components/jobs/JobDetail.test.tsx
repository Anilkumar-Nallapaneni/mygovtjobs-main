/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router-dom'
import i18n from '@/i18n'
import JobDetail from '@/components/jobs/JobDetail'
import { adaptLiveJob } from '@/utils/liveJobAdapter'
import type { JobRecord } from '@/types/job'
import type { ReactElement } from 'react'

function renderJobDetail(ui: ReactElement) {
  return render(
    <MemoryRouter>
      <I18nextProvider i18n={i18n}>{ui}</I18nextProvider>
    </MemoryRouter>
  )
}

const mockJob: JobRecord = {
  id: '1',
  slug: 'ssc-cgl-2026',
  title: 'SSC CGL 2026 Recruitment Notification',
  dept: 'SSC',
  category: 'ssc',
  state: 'All India',
  stateIds: [],
  vacancies: 500,
  qual: 'Graduate',
  salary: 'As per rules',
  age: '18-32',
  lastDate: '2026-08-01',
  apply_url: 'https://ssc.gov.in/notification.pdf',
  status: 'live',
} as JobRecord

describe('JobDetail', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders title and closes on Escape', () => {
    const onClose = vi.fn()
    renderJobDetail(<JobDetail job={mockJob} onClose={onClose} layout="modal" />)
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/SSC CGL/)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('back button calls onClose', () => {
    const onClose = vi.fn()
    const { container } = renderJobDetail(<JobDetail job={mockJob} onClose={onClose} />)
    const back = container.querySelector('.job-detail-back-btn') as HTMLButtonElement
    expect(back).toBeTruthy()
    fireEvent.click(back)
    expect(onClose).toHaveBeenCalled()
  })

  it('renders active metadata for a future-deadline live job with display badge status', () => {
    const nowMs = Date.now()
    const lastDate = new Date(nowMs + 9 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const adapted = adaptLiveJob(
      {
        id: 'display-status-live-job',
        slug: 'display-status-live-job',
        title: 'Future deadline recruitment',
        dept: 'Official Department',
        category: 'state',
        vacancies: 1,
        status: 'live',
        last_date: lastDate,
        published_at: '2026-01-01T00:00:00Z',
        apply_url: 'https://ssc.gov.in/',
      },
      0,
      nowMs
    ) as JobRecord

    expect(['hot', 'new']).toContain(adapted.status)
    const { container } = renderJobDetail(<JobDetail job={adapted} onClose={vi.fn()} />)
    const renderedStatus = container.querySelector('.job-detail-verification-meta div:last-child dd')?.textContent

    expect(renderedStatus).toBe('Active')
  })
})
