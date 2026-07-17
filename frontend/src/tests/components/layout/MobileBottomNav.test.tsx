/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import i18n from '@/i18n'
import MobileBottomNav from '@/components/layout/MobileBottomNav'
import { LATEST_NOTIFICATIONS_PATH } from '@/utils/browseRoutes'

function renderNav(initialPath: string) {
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <I18nextProvider i18n={i18n}>
        <MobileBottomNav />
      </I18nextProvider>
    </MemoryRouter>
  )
}

function activeTab(href: string) {
  const links = screen.getAllByRole('link')
  return links.find((el) => el.getAttribute('href') === href && el.getAttribute('aria-current') === 'page')
}

afterEach(() => cleanup())

describe('MobileBottomNav', () => {
  it('marks Home active on /', () => {
    renderNav('/')
    expect(activeTab('/')).toBeTruthy()
  })

  it('marks Latest active on /jobs/latest-notifications', () => {
    renderNav(LATEST_NOTIFICATIONS_PATH)
    expect(activeTab(LATEST_NOTIFICATIONS_PATH)).toBeTruthy()
  })

  it('marks Results active on /results', () => {
    renderNav('/results')
    expect(activeTab('/results')).toBeTruthy()
  })

  it('marks Admit Card active on /results/admit-card', () => {
    renderNav('/results/admit-card')
    expect(activeTab('/results/admit-card')).toBeTruthy()
  })

  it('does not mark Latest active on unrelated paths', () => {
    renderNav('/profession/medical')
    expect(activeTab(LATEST_NOTIFICATIONS_PATH)).toBeUndefined()
  })
})
