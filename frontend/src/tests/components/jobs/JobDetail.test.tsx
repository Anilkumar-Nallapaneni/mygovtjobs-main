/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router-dom'
import i18n from '@/i18n'
import JobDetail from '@/components/jobs/JobDetail'
import type { JobRecord } from '@/types/job'
import type { ReactElement } from 'react'

function renderJobDetail(ui: ReactElement) {
  return render(
    <MemoryRouter>
      <I18nextProvider i18n={i18n}>{ui}</I18nextProvider>
    </MemoryRouter>
  )
}

afterEach(() => {
  vi.useRealTimers()
})

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

  it('shows active verification status for hot/new jobs with a future deadline', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-15T00:00:00Z'))

    renderJobDetail(
      <JobDetail
        job={{
          ...mockJob,
          id: '2',
          slug: 'mppsc-adppo-2026',
          title: 'MPPSC Assistant District Public Prosecution Officer 2026',
          status: 'hot',
          lastDate: '2026-09-23',
          vacancies: 1,
        }}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText('Active')).toBeTruthy()
    expect(screen.getAllByText('1 POST').length).toBeGreaterThan(0)
  })
})
