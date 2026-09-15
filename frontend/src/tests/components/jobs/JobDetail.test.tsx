/** @vitest-environment happy-dom */
import { describe, expect, it, vi } from 'vitest'
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

  it('shows a last-date stamp and skips the old key-facts strip', () => {
    const { container } = renderJobDetail(
      <JobDetail
        job={{
          ...mockJob,
          dates: { last_date: '2026-08-01', exam_date: '2026-09-01' },
          about: 'Staff Selection Commission invites online applications for Combined Graduate Level Examination 2026.',
        }}
        onClose={vi.fn()}
      />
    )
    expect(container.querySelector('.job-detail-hero__stamp')).toBeTruthy()
    expect(container.querySelector('.job-detail-hero__kicker')?.textContent).toMatch(/official notification/i)
    expect(container.querySelector('.job-detail-keyfacts')).toBeNull()
    expect(container.querySelector('.job-detail-toc')).toBeTruthy()
    expect(container.querySelector('#jd-dates')).toBeTruthy()
    const applyBtn = container.querySelector('.job-detail-apply-btn') as HTMLAnchorElement
    expect(applyBtn).toBeTruthy()
    expect(applyBtn.getAttribute('role')).toBe('button')
    expect(applyBtn.href).toMatch(/ssc\.gov\.in/)
  })

  it('shows official helpdesk mailto from the notification', () => {
    renderJobDetail(
      <JobDetail
        job={{
          ...mockJob,
          detail: { helpdesk_email: 'helpdesk@ssc.gov.in', helpdesk_emails: ['helpdesk@ssc.gov.in'] },
        }}
        onClose={vi.fn()}
      />
    )
    const mail = screen.getByRole('link', { name: 'helpdesk@ssc.gov.in' })
    expect(mail.getAttribute('href')).toBe('mailto:helpdesk@ssc.gov.in')
  })
})
